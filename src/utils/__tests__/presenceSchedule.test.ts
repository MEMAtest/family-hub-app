import { durationMinutesBetween, presenceTimeRange } from '@/utils/presenceSchedule';

describe('presence schedule presets', () => {
  it('provides one-tap working-day ranges', () => {
    expect(presenceTimeRange('all-day')).toEqual({ start: '09:00', end: '17:00' });
    expect(presenceTimeRange('morning')).toEqual({ start: '09:00', end: '13:00' });
    expect(presenceTimeRange('afternoon')).toEqual({ start: '13:00', end: '17:00' });
  });

  it('rounds until-five to the next quarter hour', () => {
    expect(presenceTimeRange('until-5', new Date(2026, 9, 20, 11, 8))).toEqual({ start: '11:15', end: '17:00' });
  });

  it('calculates duration without free-typed hours', () => {
    expect(durationMinutesBetween('09:00', '13:00')).toBe(240);
  });
});
