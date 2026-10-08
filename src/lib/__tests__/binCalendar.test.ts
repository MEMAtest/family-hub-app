import { binPropertyId, parseBinCalendar } from '@/lib/binCalendar';

const calendar = (entries: string[]) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${entries.map((value, i) => `BEGIN:VEVENT\r\nUID:${i}\r\n${value}\r\nEND:VEVENT`).join('\r\n')}\r\nEND:VCALENDAR`;
describe('verified council bin calendar', () => {
  it('requires the exact saved property, not neighbouring addresses or another postcode', () => {
    expect(binPropertyId('21 Tremaine Road, London, SE20 7UA')).toBe('3670007');
    expect(binPropertyId('121 Tremaine Road, London, SE20 7UA')).toBeNull();
    expect(binPropertyId('21 Tremaine Road, another city, AA1 1AA')).toBeNull();
    expect(binPropertyId(undefined)).toBeNull();
  });
  it('groups the real collection day, preserves paper versus mixed recycling and deduplicates services', () => {
    const input = calendar([
      'DTSTART;VALUE=DATE:20261009\r\nSUMMARY:Mixed Recycling (Cans\\, Plastics & Glass) collection',
      'DTSTART;VALUE=DATE:20261009\r\nSUMMARY:Food Waste collection',
      'DTSTART;VALUE=DATE:20261009\r\nSUMMARY:Food Waste collection',
      'DTSTART;VALUE=DATE:20261016\r\nSUMMARY:Paper & Cardboard collection',
      'DTSTART;VALUE=DATE:20261016\r\nSUMMARY:Non-Recyclable Refuse collection',
      'DTSTART;VALUE=DATE:20261008\r\nSUMMARY:Food Waste collection',
      'DTSTART;VALUE=DATE:20261009\r\nSUMMARY:Garden Waste collection\r\nSTATUS:CANCELLED',
    ]);
    expect(parseBinCalendar(input, '2026-10-09')).toEqual([
      { date: '2026-10-09', services: ['Food waste', 'Mixed recycling (cans, plastics and glass)'] },
      { date: '2026-10-16', services: ['Non-recyclable refuse', 'Paper and cardboard'] },
    ]);
  });
  it('does not turn an ambiguous timed event or unknown service into a guessed collection', () => {
    expect(() => parseBinCalendar(calendar(['DTSTART:20261009T070000Z\r\nSUMMARY:Food Waste collection']), '2026-10-08')).toThrow();
    expect(() => parseBinCalendar('an error page', '2026-10-08')).toThrow();
  });
});
