export function getAge(birthDate: Date, atDate: Date = new Date()): string {
  const diffMs = atDate.getTime() - birthDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Not born yet';
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} old`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30.44);
    return `${months} month${months !== 1 ? 's' : ''} old`;
  }

  const years = Math.floor(days / 365.25);
  const remainingMonths = Math.floor((days - years * 365.25) / 30.44);
  if (remainingMonths > 0) {
    return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
  return `${years} year${years !== 1 ? 's' : ''} old`;
}

export function getAgeMonths(birthDate: Date, atDate: Date = new Date()): number {
  const diffMs = atDate.getTime() - birthDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
}

export function getAgeLabel(birthDate: Date, photoDate: Date): string {
  return getAge(birthDate, photoDate);
}

export function groupPhotosByAge(
  photos: { date: Date }[],
  birthDate: Date
): Map<string, typeof photos> {
  const groups = new Map<string, typeof photos>();

  for (const photo of photos) {
    const months = getAgeMonths(birthDate, photo.date);
    let label: string;

    if (months < 1) label = 'Newborn';
    else if (months < 12) label = `${months} month${months !== 1 ? 's' : ''}`;
    else {
      const years = Math.floor(months / 12);
      const rem = months % 12;
      label = rem > 0
        ? `${years} year${years !== 1 ? 's' : ''} ${rem} month${rem !== 1 ? 's' : ''}`
        : `${years} year${years !== 1 ? 's' : ''}`;
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(photo);
  }

  return groups;
}
