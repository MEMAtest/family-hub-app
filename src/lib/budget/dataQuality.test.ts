import { isQaBudgetRecord, partitionBudgetRecords } from './dataQuality';

describe('budget data quality', () => {
  test.each([
    { incomeName: 'Vistra Test', category: 'Salary' },
    { incomeName: 'API Test Income', category: 'Salary' },
    { expenseName: 'Playwright Receipt Expense', category: 'Food' },
    { expenseName: 'Anything', category: 'Playwright QA' },
  ])('identifies explicit QA records', (record) => {
    expect(isQaBudgetRecord(record)).toBe(true);
  });

  test('keeps ordinary records in operational totals', () => {
    const result = partitionBudgetRecords([
      { incomeName: 'Salary', category: 'Salary' },
      { incomeName: 'API Test Income', category: 'Salary' },
    ]);
    expect(result.operational).toHaveLength(1);
    expect(result.excludedQa).toHaveLength(1);
  });
});
