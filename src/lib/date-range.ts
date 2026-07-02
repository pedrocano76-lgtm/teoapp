export function formatEventDateRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
  locale: string,
): string {
  if (!start) return '';
  const fmtDay = new Intl.DateTimeFormat(locale, { day: 'numeric' });
  const fmtDayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fmtFull = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  if (!end || end.getTime() === start.getTime()) {
    return fmtFull.format(start);
  }
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    // "16–20 Oct"
    return `${fmtDay.format(start)}–${fmtDayMonth.format(end)}`;
  }
  // "28 Oct – 2 Nov"
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${fmtDayMonth.format(start)} – ${fmtDayMonth.format(end)}`;
  }
  return `${fmtFull.format(start)} – ${fmtFull.format(end)}`;
}

export function isMultiDayEvent(
  start: Date | null | undefined,
  end: Date | null | undefined,
): boolean {
  return !!(start && end && end.getTime() > start.getTime());
}
