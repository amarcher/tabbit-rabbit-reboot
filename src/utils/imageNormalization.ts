// Normalizes user-uploaded images to JPEG before sending to the Anthropic
// vision API. iOS Safari can upload HEIC files directly from the Photos
// library, which Anthropic rejects with "Could not process image". Full-res
// phone photos can also exceed Anthropic's ~5MB base64 image limit. Running
// every file through a canvas re-encode fixes both.

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
 * Read an image File, draw it to a canvas at no more than MAX_IMAGE_DIMENSION
 * px on its longest edge, and return the JPEG-encoded base64 payload (no
 * data-URL prefix) plus a fixed `image/jpeg` media type.
 */
export async function normalizeImageToJpegBase64(
  file: File
): Promise<{ image_base64: string; media_type: 'image/jpeg' }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
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
  return { image_base64: stripDataUrlPrefix(jpegDataUrl), media_type: 'image/jpeg' };
}
