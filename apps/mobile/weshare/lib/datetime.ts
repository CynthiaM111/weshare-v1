/** True when departure is at least `minMinutes` from now (booking window open). */
export function canBookBeforeDeparture(departAtISO: string, minMinutes = 30): boolean {
  const departMs = new Date(departAtISO).getTime();
  if (Number.isNaN(departMs)) return false;
  return departMs - Date.now() >= minMinutes * 60_000;
}

/** Human-readable departure for cards and summaries. */
export function formatDepartureFriendly(d: Date): string {
  const now = new Date();
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOf(d).getTime() - startOf(now).getTime()) / 86_400_000);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (dayDiff === 0) return `Today at ${time}`;
  if (dayDiff === 1) return `Tomorrow at ${time}`;

  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  };
  const date = d.toLocaleDateString(undefined, dateOpts);
  return `${date} · ${time}`;
}

export function formatDepartDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDepartTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}
