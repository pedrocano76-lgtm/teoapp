import ExifReader from 'exifreader';

export async function getExifDate(file: File): Promise<Date | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    // Try DateTimeOriginal first (when photo was taken), then DateTimeDigitized, then DateTime
    const dateTag =
      tags['DateTimeOriginal'] ||
      tags['DateTimeDigitized'] ||
      tags['DateTime'];

    if (dateTag?.description) {
      // EXIF dates are in format "YYYY:MM:DD HH:MM:SS"
      const parts = dateTag.description.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      const date = new Date(parts);
      if (!isNaN(date.getTime())) return date;
    }

    return null;
  } catch {
    return null;
  }
}
