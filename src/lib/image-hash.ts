/**
 * Perceptual image hashing (dHash) for duplicate detection.
 * Loads an image into a tiny canvas, compares adjacent pixel brightness,
 * and produces a 64-bit hash string. Visually similar images produce
 * identical or near-identical hashes regardless of metadata.
 */

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Compute a difference hash (dHash) for an image URL.
 * Returns a 64-character binary string (0s and 1s).
 */
export async function computeDHash(imageUrl: string): Promise<string> {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  // 9 wide × 8 tall → 8 comparisons per row × 8 rows = 64 bits
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 9, 8);
  const data = ctx.getImageData(0, 0, 9, 8).data;

  let hash = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const leftIdx = (y * 9 + x) * 4;
      const rightIdx = (y * 9 + x + 1) * 4;
      const leftBright = data[leftIdx] * 0.299 + data[leftIdx + 1] * 0.587 + data[leftIdx + 2] * 0.114;
      const rightBright = data[rightIdx] * 0.299 + data[rightIdx + 1] * 0.587 + data[rightIdx + 2] * 0.114;
      hash += leftBright < rightBright ? '1' : '0';
    }
  }

  return hash;
}

/**
 * Hamming distance between two equal-length binary hash strings.
 */
export function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}
