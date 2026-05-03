import i18n from '@/i18n';

// Compare dates ignoring time-of-day to avoid timezone issues with date-only birth_date
function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

const t = (key: string, opts?: any) => i18n.t(key, opts) as string;

export function getAge(birthDate: Date, atDate: Date = new Date()): string {
  const days = daysBetween(birthDate, atDate);

  if (days < 0) return t('age.beforeBirth');
  if (days < 7) return t('age.day', { count: days });
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return t('age.week', { count: weeks });
  }
  if (days < 365) {
    const months = Math.floor(days / 30.44);
    const remainingDays = days - Math.floor(months * 30.44);
    const weeks = Math.floor(remainingDays / 7);
    if (weeks > 0) {
      return t('age.monthsAndWeeks', {
        months: t('age.month', { count: months }),
        weeks: t('age.week', { count: weeks }),
      });
    }
    return t('age.month', { count: months });
  }

  const years = Math.floor(days / 365.25);
  const remainingMonths = Math.floor((days - years * 365.25) / 30.44);
  if (remainingMonths > 0) {
    return t('age.yearsAndMonths', {
      years: t('age.year', { count: years }),
      months: t('age.month', { count: remainingMonths }),
    });
  }
  return t('age.year', { count: years });
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

  if (days < 0) return t('age.preBirthGroup');
  if (days < 7) return t('age.firstWeek');
  if (weeks < 4) return t('age.weekN', { n: weeks + 1 });
  if (months < 24) return t('age.groupMonths', { value: t('age.month', { count: months }) });
  const years = Math.floor(months / 12);
  return t('age.groupYears', { value: t('age.year', { count: years }) });
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
