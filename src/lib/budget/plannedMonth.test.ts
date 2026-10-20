import { monthRangeUtc, plannedAmountForMonth, plannedForMonth, plannedOccurrencesForMonth } from './plannedMonth';

describe('planned budget month selection', () => {
  test('uses an exact UTC month range', () => {
    expect(monthRangeUtc('2026-10')).toMatchObject({ key: '2026-10' });
    expect(monthRangeUtc('2026-10').start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(monthRangeUtc('2026-10').end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  test('keeps one-off items in their payment month', () => {
    const item = { isRecurring: false, paymentDate: '2026-10-15T12:00:00.000Z' };
    expect(plannedForMonth(item, '2026-10')).toBe(true);
    expect(plannedForMonth(item, '2026-11')).toBe(false);
  });

  test('does not backfill a recurring item before it existed', () => {
    const item = { isRecurring: true, recurringFrequency: 'monthly', createdAt: '2026-10-16T10:00:00.000Z' };
    expect(plannedForMonth(item, '2026-09')).toBe(false);
    expect(plannedForMonth(item, '2026-10')).toBe(true);
  });

  test('respects recurring end dates and yearly months', () => {
    const ended = { isRecurring: true, recurringStartDate: '2026-01-01T00:00:00.000Z', recurringEndDate: '2026-09-30T23:59:59.000Z' };
    const yearly = { isRecurring: true, recurringFrequency: 'yearly', recurringStartDate: '2025-10-12T00:00:00.000Z' };
    expect(plannedForMonth(ended, '2026-10')).toBe(false);
    expect(plannedForMonth(yearly, '2026-10')).toBe(true);
    expect(plannedForMonth(yearly, '2026-11')).toBe(false);
  });
});

describe('planned weekly amounts', () => {
  test('counts weekly occurrences anchored to the recurring start date', () => {
    const weekly = {
      amount: 25,
      isRecurring: true,
      recurringFrequency: 'weekly',
      recurringStartDate: '2026-10-01T00:00:00.000Z',
    };

    expect(plannedOccurrencesForMonth(weekly, '2026-10')).toBe(5);
    expect(plannedAmountForMonth(weekly, '2026-10')).toBe(125);
  });

  test('stops at the inclusive recurring end date', () => {
    const weekly = {
      amount: 10,
      isRecurring: true,
      recurringFrequency: 'weekly',
      recurringStartDate: '2026-10-01T00:00:00.000Z',
      recurringEndDate: '2026-10-15T00:00:00.000Z',
    };

    expect(plannedOccurrencesForMonth(weekly, '2026-10')).toBe(3);
  });
});
