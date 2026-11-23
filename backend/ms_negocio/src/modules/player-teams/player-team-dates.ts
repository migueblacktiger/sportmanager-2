// DATE columns stay as calendar strings; no server-local Date parsing.
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function isContractDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Inclusive calendar end is represented as the next day's exclusive midnight. */
export function bogotaMidnight(value: string, nextDay = false): number {
  const [year, month, day] = value.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, day + (nextDay ? 1 : 0));
  let instant = wallClock;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant))
      .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    const local = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const adjusted = wallClock - (local - instant);
    if (adjusted === instant) break;
    instant = adjusted;
  }
  return instant;
}
