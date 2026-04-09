// Normalizes user-uploaded images to JPEG before sending to the Anthropic
// vision API. The API only accepts image/jpeg, image/png, image/gif, and
// image/webp, with a ~5MB base64 payload cap. Two things can break scans:
//
//  1. Format mismatch. iOS Photos hands out HEIC by default, which Chrome's
//     <img> element can't decode at all, so naive canvas re-encoding fails.
//     We detect HEIC up front (by MIME type or filename extension) and run
//     the blob through heic-to — a libheif/WASM browser decoder — before
//     handing it to the canvas pipeline. heic-to is dynamic-imported so the
//     WASM bundle only loads when we actually see a HEIC file. NOTE: we
//     tried heic2any first but it's unmaintained and ships an old libheif
//     that rejects newer iPhone HEIC variants (HEVC Main 10) with
//     ERR_LIBHEIF format not supported. heic-to bundles a current libheif.
//
//  2. Oversized payloads. Full-res phone photos regularly exceed 5MB base64.
//     The canvas path caps the longest edge at MAX_IMAGE_DIMENSION and
//     re-encodes at JPEG_QUALITY, which keeps payloads well under the cap.

export const MAX_IMAGE_DIMENSION = 1600;
export const JPEG_QUALITY = 0.8;

/**
 * Scale (width, height) so the longest edge is at most `max`, preserving aspect
 * ratio. Never upscales. Returns integer dimensions.
 */
export function computeScaledDimensions(
  width: number,
  height: number,
  max: number = MAX_IMAGE_DIMENSION
): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > max ? max / longest : 1;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Strip the `data:<mime>;base64,` prefix from a data URL, returning just the
 * base64 payload. Returns an empty string if the input isn't a data URL.
 */
export function stripDataUrlPrefix(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(',');
  return commaIdx === -1 ? '' : dataUrl.slice(commaIdx + 1);
}

/**
 * Returns true if the given File looks like HEIC/HEIF. Uses the MIME type
 * first (most reliable), then falls back to the filename extension, since
 * some browsers report an empty `file.type` for HEIC.
 */
export function isHeicFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif');
}

/**
 * Decode a HEIC/HEIF File into a JPEG Blob using heic-to (libheif WASM).
 * The library is dynamic-imported so the bundle cost is only paid when a
 * user actually picks a HEIC file.
 */
export async function decodeHeicToJpegBlob(file: File): Promise<Blob> {
  const { heicTo } = await import('heic-to');
  return heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
}

/**
 * Canvas-decode any Blob the browser can render into a JPEG base64 payload
 * capped at MAX_IMAGE_DIMENSION px on its longest edge. Throws if the browser
 * can't decode the blob.
 */
async function canvasEncodeJpeg(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image'));
    el.src = dataUrl;
  });

  const { width, height } = computeScaledDimensions(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return stripDataUrlPrefix(jpegDataUrl);
}

/**
 * Main entry point. Normalizes a user-picked File to a JPEG base64 payload
 * ready to send to the Anthropic vision API. Transparently decodes HEIC
 * via heic2any when needed.
 */
export async function normalizeImageToJpegBase64(
  file: File
): Promise<{ image_base64: string; media_type: 'image/jpeg' }> {
  const source: Blob = isHeicFile(file) ? await decodeHeicToJpegBlob(file) : file;
  const image_base64 = await canvasEncodeJpeg(source);
  return { image_base64, media_type: 'image/jpeg' };
}
