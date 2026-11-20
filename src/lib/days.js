const DAY = 86400000;

export function elapsedParts(startInstant, now = Date.now()) {
  if (typeof startInstant !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(startInstant)) return null;
  const start = Date.parse(startInstant);
  const calendar = new Date(startInstant.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(start) || !Number.isFinite(+calendar) || calendar.toISOString().slice(0, 10) !== startInstant.slice(0, 10) ||
      Number(startInstant.slice(11, 13)) > 23 || !Number.isFinite(+now)) return null;
  const seconds = Math.floor(Math.max(0, +now - start) / 1000);
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
}

function calendarDay(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type) => Number(parts.find((part) => part.type === type).value);
  return Date.UTC(value('year'), value('month') - 1, value('day'));
}

export function calculateElapsedDays(startDate, now = new Date(), timeZone = 'Asia/Shanghai') {
  try {
    if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
    const start = new Date(`${startDate}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) return null;
    return Math.floor((calendarDay(now, timeZone) - start.getTime()) / DAY);
  } catch { return null; }
}

export function millisecondsUntilNextMidnight(now = new Date(), timeZone = 'Asia/Shanghai') {
  try {
    const today = calendarDay(now, timeZone);
    let low = now.getTime();
    let high = low + 27 * 3600000;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (calendarDay(new Date(middle), timeZone) === today) low = middle;
      else high = middle;
    }
    return high - now.getTime();
  } catch { return DAY; }
}
