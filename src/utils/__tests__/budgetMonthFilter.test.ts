import { calculateMonthlyTotal, deduplicateRecurringItems } from '../budgetMonthFilter';

describe('canonical monthly budget rows', () => {
  test('keeps only the newest recurring row with the same name', () => {
    const rows = [
      { id: 'old', incomeName: 'Salary', amount: 5000, isRecurring: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'new', incomeName: 'Salary', amount: 3100, isRecurring: true, createdAt: '2026-10-01T00:00:00.000Z' },
      { id: 'one-off', incomeName: 'Refund', amount: 12, isRecurring: false, paymentDate: '2026-10-10T00:00:00.000Z', createdAt: '2026-10-10T00:00:00.000Z' },
    ];

    expect(deduplicateRecurringItems(rows).map((item) => item.id)).toEqual(['new', 'one-off']);
    expect(calculateMonthlyTotal(rows, 10, 2026)).toBe(3112);
  });
});
