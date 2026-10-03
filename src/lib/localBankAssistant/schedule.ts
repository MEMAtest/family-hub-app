export function dueBankSlot(now: Date, enabled: boolean, lastSlot: string | null) {
  if (!enabled) return null;
  const values = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (name: string) => values.find(item => item.type === name)?.value;
  const hour = Number(part('hour'));
  if (hour !== 7 && hour !== 19) return null;
  const slot = `${part('year')}-${part('month')}-${part('day')}:${hour}`;
  return slot === lastSlot ? null : slot;
}
