import {
  computeScaledDimensions,
  stripDataUrlPrefix,
  normalizeImageToJpegBase64,
  MAX_IMAGE_DIMENSION,
  JPEG_QUALITY,
} from './imageNormalization';

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

describe('normalizeImageToJpegBase64', () => {
  // jsdom doesn't implement canvas — we mock the pieces we use.
  let originalImage: typeof Image;
  let originalFileReader: typeof FileReader;
  let toDataURLCalls: Array<[string, number]>;
  let drawImageCalls: number;

  beforeEach(() => {
    toDataURLCalls = [];
    drawImageCalls = 0;

    originalFileReader = global.FileReader;
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(_file: Blob) {
        setTimeout(() => {
          this.result = 'data:image/heic;base64,AAAA';
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
    const mockGetContext = jest.fn(() => ({
      drawImage: jest.fn(() => {
        drawImageCalls += 1;
      }),
    }));
    const mockToDataURL = jest.fn((type: string, quality: number) => {
      toDataURLCalls.push([type, quality]);
      return 'data:image/jpeg;base64,ENCODEDJPEG';
    });
    jest
      .spyOn(document, 'createElement')
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
    jest.restoreAllMocks();
  });

  it('returns the base64 payload without a data-url prefix and forces jpeg media type', async () => {
    const file = new File(['heic-bytes'], 'photo.heic', { type: 'image/heic' });
    const result = await normalizeImageToJpegBase64(file);
    expect(result.image_base64).toBe('ENCODEDJPEG');
    expect(result.media_type).toBe('image/jpeg');
  });

  it('re-encodes as JPEG regardless of input type', async () => {
    const file = new File(['heic-bytes'], 'photo.heic', { type: 'image/heic' });
    await normalizeImageToJpegBase64(file);
    expect(toDataURLCalls).toHaveLength(1);
    expect(toDataURLCalls[0]).toEqual(['image/jpeg', JPEG_QUALITY]);
  });

  it('draws the (possibly scaled) image to the canvas exactly once', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await normalizeImageToJpegBase64(file);
    expect(drawImageCalls).toBe(1);
  });

  it('rejects when the canvas 2D context is unavailable', async () => {
    (document.createElement as jest.Mock).mockImplementation((tag: string) => {
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
    await expect(normalizeImageToJpegBase64(file)).rejects.toThrow('Canvas 2D context unavailable');
  });
});
