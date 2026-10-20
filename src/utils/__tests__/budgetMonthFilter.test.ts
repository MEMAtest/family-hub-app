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

  test('does not collapse same-name plans for different people or categories', () => {
    const rows = [
      { id: 'a', expenseName: 'Travel', amount: 30, category: 'Work', personId: 'angela', isRecurring: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', expenseName: 'Travel', amount: 20, category: 'School', personId: 'amari', isRecurring: true, createdAt: '2026-01-01T00:00:00.000Z' },
    ];

    expect(deduplicateRecurringItems(rows)).toHaveLength(2);
  });

  test('multiplies a weekly plan by its occurrences in the selected month', () => {
    const rows = [{
      id: 'weekly', expenseName: 'Club', amount: 25, category: 'Childcare', isRecurring: true,
      recurringFrequency: 'weekly', recurringStartDate: '2026-10-01T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z',
    }];

    expect(calculateMonthlyTotal(rows, 10, 2026)).toBe(125);
  });
});
