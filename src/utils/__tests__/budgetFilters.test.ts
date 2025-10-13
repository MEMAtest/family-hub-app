import { filterExpenses, filterIncome } from '../budgetFilters';

describe('budgetFilters', () => {
  const expenses = [
    { expenseName: 'Groceries - Tesco', category: 'Groceries', amount: 120.45, isReceiptScan: true },
    { expenseName: 'Electric Bill', category: 'Utilities', amount: 80, isReceiptScan: false },
    { expenseName: 'Cinema Night', category: 'Entertainment', amount: 45, isReceiptScan: true },
  ];

  const income = [
    { incomeName: 'Monthly Salary', category: 'Salary', amount: 5000 },
    { incomeName: 'Freelance Project', category: 'Freelance', amount: 850 },
  ];

  describe('filterExpenses', () => {
    it('returns all expenses when query is empty', () => {
      const result = filterExpenses(expenses, '', { viewTab: 'all' });
      expect(result).toHaveLength(3);
    });

    it('filters by receipt scans view', () => {
      const result = filterExpenses(expenses, '', { viewTab: 'receipt-scans' });
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.isReceiptScan)).toBe(true);
    });

    it('matches expense by name, category, or amount', () => {
      expect(filterExpenses(expenses, 'tesco')).toHaveLength(1);
      expect(filterExpenses(expenses, 'utilities')).toHaveLength(1);
      expect(filterExpenses(expenses, '80')).toHaveLength(1);
    });

    it('applies query on top of receipt-scan filter', () => {
      const result = filterExpenses(expenses, 'cinema', { viewTab: 'receipt-scans' });
      expect(result).toHaveLength(1);
      expect(result[0].expenseName).toContain('Cinema');
    });
  });

  describe('filterIncome', () => {
    it('returns all income when query empty', () => {
      expect(filterIncome(income, '')).toHaveLength(2);
    });

    it('filters income by name, category, or amount', () => {
      expect(filterIncome(income, 'salary')).toHaveLength(1);
      expect(filterIncome(income, 'freelance')).toHaveLength(1);
      expect(filterIncome(income, '850')).toHaveLength(1);
    });
  });
});
