import {
  computeScaledDimensions,
  stripDataUrlPrefix,
  isHeicFile,
  normalizeImageToJpegBase64,
  MAX_IMAGE_DIMENSION,
  JPEG_QUALITY,
} from './imageNormalization';

// Mock heic-to so we don't load the real WASM decoder in unit tests.
// The mock returns a JPEG-flavored Blob whose FileReader->Image->canvas path
// is exercised via the same mocks used by the fast path.
const mockHeicTo = vi.fn(async (_opts: any) =>
  new Blob(['fake-jpeg'], { type: 'image/jpeg' })
);
vi.mock('heic-to', () => ({
  __esModule: true,
  heicTo: (opts: any) => mockHeicTo(opts),
}));

describe('computeScaledDimensions', () => {
  it('returns input unchanged when within max', () => {
    expect(computeScaledDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('never upscales smaller images', () => {
    expect(computeScaledDimensions(100, 50, 1600)).toEqual({ width: 100, height: 50 });
  });

  it('scales landscape images by width', () => {
    expect(computeScaledDimensions(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('scales portrait images by height', () => {
    expect(computeScaledDimensions(2400, 3200, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('scales square images', () => {
    expect(computeScaledDimensions(4000, 4000, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('rounds to integer dimensions', () => {
    const result = computeScaledDimensions(1000, 333, 500);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
    expect(result.width).toBe(500);
    expect(result.height).toBe(167); // 333 * 0.5 = 166.5 → 167
  });

  it('uses MAX_IMAGE_DIMENSION as default cap', () => {
    const result = computeScaledDimensions(4032, 3024);
    expect(Math.max(result.width, result.height)).toBe(MAX_IMAGE_DIMENSION);
  });
});

describe('stripDataUrlPrefix', () => {
  it('strips the data-url prefix', () => {
    expect(stripDataUrlPrefix('data:image/jpeg;base64,AAAA')).toBe('AAAA');
  });

  it('returns empty string when no comma present', () => {
    expect(stripDataUrlPrefix('not-a-data-url')).toBe('');
  });

  it('handles empty payload after comma', () => {
    expect(stripDataUrlPrefix('data:image/jpeg;base64,')).toBe('');
  });

  it('preserves the payload exactly (no base64 decoding)', () => {
    const payload = 'iVBORw0KGgoAAAANSUhEUgAAAAUA';
    expect(stripDataUrlPrefix(`data:image/png;base64,${payload}`)).toBe(payload);
  });
});

describe('isHeicFile', () => {
  it('detects image/heic MIME type', () => {
    expect(isHeicFile(new File([''], 'photo.jpg', { type: 'image/heic' }))).toBe(true);
  });

  it('detects image/heif MIME type', () => {
    expect(isHeicFile(new File([''], 'photo.jpg', { type: 'image/heif' }))).toBe(true);
  });

  it('is case-insensitive on MIME type', () => {
    expect(isHeicFile(new File([''], 'photo', { type: 'IMAGE/HEIC' }))).toBe(true);
  });

  it('falls back to .heic extension when MIME is missing', () => {
    expect(isHeicFile(new File([''], 'receipt.heic', { type: '' }))).toBe(true);
  });

  it('falls back to .heif extension when MIME is missing', () => {
    expect(isHeicFile(new File([''], 'receipt.HEIF', { type: '' }))).toBe(true);
  });

  it('returns false for plain JPEG', () => {
    expect(isHeicFile(new File([''], 'photo.jpg', { type: 'image/jpeg' }))).toBe(false);
  });

  it('returns false for PNG', () => {
    expect(isHeicFile(new File([''], 'photo.png', { type: 'image/png' }))).toBe(false);
  });
});

describe('normalizeImageToJpegBase64', () => {
  // jsdom doesn't implement canvas — we mock the pieces we use.
  let originalImage: typeof Image;
  let originalFileReader: typeof FileReader;
  let toDataURLCalls: Array<[string, number]>;
  let drawImageCalls: number;

  beforeEach(() => {
    toDataURLCalls = [];
    drawImageCalls = 0;
    mockHeicTo.mockClear();

    originalFileReader = global.FileReader;
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(_blob: Blob) {
        setTimeout(() => {
          this.result = 'data:image/jpeg;base64,AAAA';
          this.onload?.();
        }, 0);
      }
    }
    (global as any).FileReader = MockFileReader;

    originalImage = global.Image;
    class MockImage {
      width = 3200;
      height = 2400;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    (global as any).Image = MockImage;

    // Mock canvas 2d context + toDataURL
    const mockGetContext = vi.fn(() => ({
      drawImage: vi.fn(() => {
        drawImageCalls += 1;
      }),
    }));
    const mockToDataURL = vi.fn((type: string, quality: number) => {
      toDataURLCalls.push([type, quality]);
      return 'data:image/jpeg;base64,ENCODEDJPEG';
    });
    vi.spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: mockGetContext,
            toDataURL: mockToDataURL,
          } as unknown as HTMLCanvasElement;
        }
        return document.createElement(tag);
      });
  });

  afterEach(() => {
    (global as any).FileReader = originalFileReader;
    (global as any).Image = originalImage;
    vi.restoreAllMocks();
  });

  describe('fast path (non-HEIC)', () => {
    it('returns the base64 payload without a data-url prefix and forces jpeg media type', async () => {
      const file = new File(['jpeg-bytes'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await normalizeImageToJpegBase64(file);
      expect(result.image_base64).toBe('ENCODEDJPEG');
      expect(result.media_type).toBe('image/jpeg');
    });

    it('re-encodes as JPEG regardless of input type', async () => {
      const file = new File(['png-bytes'], 'photo.png', { type: 'image/png' });
      await normalizeImageToJpegBase64(file);
      expect(toDataURLCalls).toHaveLength(1);
      expect(toDataURLCalls[0]).toEqual(['image/jpeg', JPEG_QUALITY]);
    });

    it('draws to the canvas exactly once', async () => {
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      await normalizeImageToJpegBase64(file);
      expect(drawImageCalls).toBe(1);
    });

    it('does NOT load heic-to for non-HEIC inputs', async () => {
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      await normalizeImageToJpegBase64(file);
      expect(mockHeicTo).not.toHaveBeenCalled();
    });

    it('rejects when the canvas 2D context is unavailable', async () => {
      (document.createElement as ReturnType<typeof vi.fn>).mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => null,
            toDataURL: () => '',
          } as unknown as HTMLCanvasElement;
        }
        return document.createElement(tag);
      });
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(normalizeImageToJpegBase64(file)).rejects.toThrow(
        'Canvas 2D context unavailable'
      );
    });
  });

  describe('HEIC path', () => {
    it('routes HEIC files through heic-to before canvas encoding', async () => {
      const file = new File(['heic-bytes'], 'photo.heic', { type: 'image/heic' });
      const result = await normalizeImageToJpegBase64(file);
      expect(mockHeicTo).toHaveBeenCalledTimes(1);
      expect(mockHeicTo).toHaveBeenCalledWith({
        blob: file,
        type: 'image/jpeg',
        quality: 0.9,
      });
      // Canvas still runs on the converted blob
      expect(drawImageCalls).toBe(1);
      expect(result.image_base64).toBe('ENCODEDJPEG');
      expect(result.media_type).toBe('image/jpeg');
    });

    it('detects HEIC by .heic extension when MIME type is empty', async () => {
      const file = new File(['heic-bytes'], 'receipt.heic', { type: '' });
      await normalizeImageToJpegBase64(file);
      expect(mockHeicTo).toHaveBeenCalledTimes(1);
    });

    it('detects HEIC by .heif extension', async () => {
      const file = new File(['heif-bytes'], 'receipt.heif', { type: '' });
      await normalizeImageToJpegBase64(file);
      expect(mockHeicTo).toHaveBeenCalledTimes(1);
    });
  });
});
