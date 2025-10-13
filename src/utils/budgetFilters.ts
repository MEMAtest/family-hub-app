import { BudgetExpense, BudgetIncome } from '@prisma/client';

type ExpenseLike = Pick<
  BudgetExpense,
  'expenseName' | 'category' | 'amount' | 'isReceiptScan'
> & {
  [key: string]: unknown;
};

type IncomeLike = Pick<BudgetIncome, 'incomeName' | 'category' | 'amount'> & {
  [key: string]: unknown;
};

interface ExpenseFilterOptions {
  viewTab?: 'all' | 'receipt-scans';
}

const matchesQuery = (value: unknown, query: string) => {
  if (!value || typeof value !== 'string') return false;
  return value.toLowerCase().includes(query);
};

const matchesAmount = (value: unknown, query: string) => {
  if (value === null || value === undefined) return false;
  return String(value).includes(query);
};

export function filterExpenses<T extends ExpenseLike>(
  expenses: T[],
  rawQuery: string,
  options: ExpenseFilterOptions = {}
): T[] {
  const { viewTab = 'all' } = options;
  let filtered = [...expenses];

  if (viewTab === 'receipt-scans') {
    filtered = filtered.filter((expense) => expense.isReceiptScan === true);
  }

  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return filtered;
  }

  return filtered.filter((expense) => {
    const nameMatch = matchesQuery(expense.expenseName, query);
    const categoryMatch = matchesQuery(expense.category, query);
    const amountMatch = matchesAmount(expense.amount, query);
    return nameMatch || categoryMatch || amountMatch;
  });
}

export function filterIncome<T extends IncomeLike>(income: T[], rawQuery: string): T[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [...income];
  }

  return income.filter((item) => {
    const nameMatch = matchesQuery(item.incomeName, query);
    const categoryMatch = matchesQuery(item.category, query);
    const amountMatch = matchesAmount(item.amount, query);
    return nameMatch || categoryMatch || amountMatch;
  });
}

