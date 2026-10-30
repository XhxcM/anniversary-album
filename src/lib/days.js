const DAY = 86400000;

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
