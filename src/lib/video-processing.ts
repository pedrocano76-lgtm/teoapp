/**
 * Client-side video helpers: duration/size validation and thumbnail extraction.
 */

export const MAX_VIDEO_DURATION_SECONDS = 60;
export const MAX_VIDEO_SIZE_MB = 50;
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
];
const VIDEO_EXT_RE = /\.(mp4|mov|webm)$/i;

const THUMB_MAX_DIMENSION = 480;
const THUMB_QUALITY = 0.8;

export function isVideoFile(file: File): boolean {
  if (file.type) return ALLOWED_VIDEO_TYPES.includes(file.type);
  return VIDEO_EXT_RE.test(file.name);
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

function loadVideoElement(file: File): Promise<{ video: HTMLVideoElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    (video as any).crossOrigin = 'anonymous';
    const revoke = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => resolve({ video, revoke });
    video.onerror = () => {
      revoke();
      reject(new Error('Failed to load video'));
    };
    video.src = url;
  });
}

export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  const { video, revoke } = await loadVideoElement(file);
  const meta: VideoMetadata = {
    duration: video.duration || 0,
    width: video.videoWidth || 0,
    height: video.videoHeight || 0,
  };
  revoke();
  return meta;
}

function computeTargetSize(width: number, height: number, maxDim: number) {
  if (!width || !height) return { width: maxDim, height: maxDim };
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = maxDim / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Extract a thumbnail (~1s mark or first frame) as a JPEG blob, sized like
 * photo thumbnails (480px max dimension).
 */
export async function generateVideoThumbnail(
  file: File
): Promise<{ blob: Blob; duration: number; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      (video as any).crossOrigin = 'anonymous';

      let settled = false;
      const fail = (e: any) => {
        if (settled) return;
        settled = true;
        reject(e instanceof Error ? e : new Error('Video thumbnail failed'));
      };

      const seekTarget = () => {
        const dur = video.duration || 0;
        const t = dur > 1.1 ? 1 : Math.max(0, dur / 2);
        try {
          video.currentTime = t;
        } catch {
          // Some browsers throw if seeking before metadata; fall back to 0
          video.currentTime = 0;
        }
      };

      video.onloadedmetadata = () => seekTarget();
      video.onseeked = () => {
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          const size = computeTargetSize(w, h, THUMB_MAX_DIMENSION);
          const canvas = document.createElement('canvas');
          canvas.width = size.width;
          canvas.height = size.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No 2D context');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, size.width, size.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return fail(new Error('toBlob failed'));
              if (settled) return;
              settled = true;
              resolve({ blob, duration: video.duration || 0, width: w, height: h });
            },
            'image/jpeg',
            THUMB_QUALITY
          );
        } catch (e) {
          fail(e);
        }
      };
      video.onerror = () => fail(new Error('Video load error'));
      video.src = url;
    });
  } finally {
    // The blob URL is freed by the GC after the element is detached; revoke
    // explicitly after a microtask to avoid Safari race conditions.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
