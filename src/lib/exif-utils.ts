import ExifReader from 'exifreader';

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
