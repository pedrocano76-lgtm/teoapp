import ExifReader from 'exifreader';

export type PhotoDateSource = 'exif' | 'filename' | 'lastModified';

export interface PhotoDateResult {
  date: Date;
  source: PhotoDateSource;
}

/**
 * Parses a WhatsApp-style filename: IMG-YYYYMMDD-WAxxxx.jpg / VID-YYYYMMDD-WAxxxx.mp4
 */
export function getWhatsAppFilenameDate(filename: string): Date | null {
  const m = filename.match(/(?:IMG|VID)-(\d{4})(\d{2})(\d{2})-WA/i);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 12, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Resolves a photo date using fallback chain: EXIF → WhatsApp filename → file.lastModified.
 * The `source` indicates reliability — only `exif` is considered reliable.
 */
export async function resolvePhotoDate(file: File): Promise<PhotoDateResult> {
  const exif = await getExifDate(file);
  if (exif) return { date: exif, source: 'exif' };

  const fromName = getWhatsAppFilenameDate(file.name);
  if (fromName) return { date: fromName, source: 'filename' };

  return { date: new Date(file.lastModified || Date.now()), source: 'lastModified' };
}

export async function getExifDate(file: File): Promise<Date | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    const dateTag =
      tags['DateTimeOriginal'] ||
      tags['DateTimeDigitized'] ||
      tags['DateTime'];

    if (dateTag?.description) {
      const parts = dateTag.description.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const date = new Date(parts);
      if (!isNaN(date.getTime())) return date;
    }

    return null;
  } catch {
    return null;
  }
}

export interface ExifLocation {
  lat: number;
  lng: number;
}

export async function getExifLocation(file: File): Promise<ExifLocation | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer, { expanded: true });

    if (tags.gps?.Latitude != null && tags.gps?.Longitude != null) {
      return {
        lat: tags.gps.Latitude,
        lng: tags.gps.Longitude,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=es`,
      { headers: { 'User-Agent': 'LittleMoments/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    if (!addr) return data.display_name || null;
    return addr.city || addr.town || addr.village || addr.municipality || addr.county || data.display_name || null;
  } catch {
    return null;
  }
}
