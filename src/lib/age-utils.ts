// Compare dates ignoring time-of-day to avoid timezone issues with date-only birth_date
function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAge(birthDate: Date, atDate: Date = new Date()): string {
  const days = daysBetween(birthDate, atDate);

  if (days < 0) return 'Antes de nacer';
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
  const days = daysBetween(birthDate, atDate);
  return Math.floor(days / 30.44);
}

export function getAgeWeeks(birthDate: Date, atDate: Date = new Date()): number {
  const days = daysBetween(birthDate, atDate);
  return Math.floor(days / 7);
}

export function getAgeDays(birthDate: Date, atDate: Date = new Date()): number {
  return daysBetween(birthDate, atDate);
}

export function getTimelineGroupLabel(birthDate: Date, photoDate: Date): string {
  const days = getAgeDays(birthDate, photoDate);
  const weeks = getAgeWeeks(birthDate, photoDate);
  const months = getAgeMonths(birthDate, photoDate);

  if (days < 0) return '⏳ Antes de nacer';
  if (days < 7) return '🍼 Primera semana';
  if (weeks < 4) return `🍼 Semana ${weeks + 1}`;
  if (months < 24) return `🌱 ${months + 1} ${months === 0 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `🎂 ${years} año${years !== 1 ? 's' : ''}`;
}

export function getTimelineGroupKey(birthDate: Date, photoDate: Date): string {
  const days = getAgeDays(birthDate, photoDate);
  const weeks = getAgeWeeks(birthDate, photoDate);
  const months = getAgeMonths(birthDate, photoDate);

  if (days < 0) return 'pre';
  if (days < 7) return 'w0';
  if (weeks < 4) return `w${weeks}`;
  if (months < 24) return `m${months}`;
  return `y${Math.floor(months / 12)}`;
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
