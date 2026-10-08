import * as ical from 'node-ical';
import { addDays, parseDateKey } from '@/utils/recurrence';

export type BinCollection = { date: string; services: string[] };
export const BIN_SOURCE = 'council-bin-calendar';
export const BROMLEY_ORIGIN = 'https://recyclingservices.bromley.gov.uk';

export const binPropertyId = (address: unknown): string | null =>
  typeof address === 'string' && /^21\s+Tremaine\s+Road(?:,|\s|$)/i.test(address.trim()) &&
    /\bSE20\s*7UA\b/i.test(address) ? '3670007' : null;

export function parseBinCalendar(body: string, today: string): BinCollection[] {
  if (!parseDateKey(today) || body.length > 1_000_000 || !body.startsWith('BEGIN:VCALENDAR')) throw new Error('Invalid council calendar');
  const dates = new Map<string, Set<string>>();
  for (const event of Object.values(ical.sync.parseICS(body))) {
    if (event.type !== 'VEVENT' || event.status === 'CANCELLED' || event.datetype !== 'date' || !event.start) continue;
    // DATE values have no collection time or timezone. Keep their calendar day unchanged.
    const date = `${event.start.getFullYear()}-${String(event.start.getMonth() + 1).padStart(2, '0')}-${String(event.start.getDate()).padStart(2, '0')}`;
    if (date < today || date > addDays(today, 35)) continue;
    const summary = event.summary || '';
    const service = /mixed recycling/i.test(summary) ? 'Mixed recycling (cans, plastics and glass)' :
      /paper.*cardboard/i.test(summary) ? 'Paper and cardboard' :
      /non.recyclable|refuse/i.test(summary) ? 'Non-recyclable refuse' :
      /food waste/i.test(summary) ? 'Food waste' : /garden/i.test(summary) ? 'Garden waste' : null;
    if (!service) continue;
    const services = dates.get(date) || new Set<string>();
    services.add(service); dates.set(date, services);
  }
  const result = [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, services]) => ({ date, services: [...services].sort() }));
  if (!result.length) throw new Error('Council calendar has no upcoming collections');
  return result;
}
