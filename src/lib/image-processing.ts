/**
 * Client-side image compression and thumbnail generation.
 * Reduces upload size dramatically (5MB → ~600KB for full, ~50KB for thumb)
 * without noticeable quality loss for family photos.
 */

const FULL_MAX_DIMENSION = 2560;
const FULL_QUALITY = 0.85;
const THUMB_MAX_DIMENSION = 480;
const THUMB_QUALITY = 0.75;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to blob failed'))),
      type,
      quality
    );
  });
}

function computeTargetSize(width: number, height: number, maxDim: number) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = maxDim / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function renderResized(img: HTMLImageElement, maxDim: number, quality: number): Promise<Blob> {
  const { width, height } = computeTargetSize(img.naturalWidth, img.naturalHeight, maxDim);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // Better quality downscale
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToBlob(canvas, 'image/jpeg', quality);
}

export interface ProcessedImage {
  full: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}

/**
 * Generate a compressed full-size version + a small thumbnail from a source file.
 * Both outputs are JPEG. If the source is small enough already, the original
 * file is reused for the full version.
 */
export async function processImageForUpload(file: File): Promise<ProcessedImage> {
  // Skip processing for non-images (shouldn't happen, but safe)
  if (!file.type.startsWith('image/')) {
    return {
      full: file,
      thumbnail: file,
      width: 0,
      height: 0,
    };
  }

  const img = await loadImageFromFile(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;

  const [full, thumbnail] = await Promise.all([
    renderResized(img, FULL_MAX_DIMENSION, FULL_QUALITY),
    renderResized(img, THUMB_MAX_DIMENSION, THUMB_QUALITY),
  ]);

  return { full, thumbnail, width, height };
}
