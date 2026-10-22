import { plannedAmountForMonth, type PlannedBudgetItem } from './plannedMonth';

export type ForecastAccount = { id: string; name: string; currency: string };
export type ForecastTransaction = {
  accountId: string; transactionDate: Date | string; amount: number;
  direction: string; transactionType: string;
};
export type ForecastImport = {
  accountId: string; statementStart: Date | string | null; statementEnd: Date | string | null;
};
type Plan = PlannedBudgetItem;
export type ForecastInput = {
  accounts: ForecastAccount[]; transactions: ForecastTransaction[]; imports: ForecastImport[];
  incomePlans: Plan[]; expensePlans: Plan[]; referenceDate?: Date; horizon?: number;
};
export type HistoryMonth = {
  month: string; income: number | null; spending: number | null; net: number | null;
  covered: boolean; transactionCount: number;
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dateKey = (value: Date | string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
const monthAt = (reference: Date, offset: number) =>
  new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + offset, 1)).toISOString().slice(0, 7);
const lastDay = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);

export const quantile = (values: number[], fraction: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const index = Math.floor(position);
  return sorted[index] + (sorted[Math.min(index + 1, sorted.length - 1)] - sorted[index]) * (position - index);
};

const coveredByImports = (month: string, imports: ForecastImport[]) => {
  const ranges = imports.flatMap(item => {
    const start = dateKey(item.statementStart);
    const end = dateKey(item.statementEnd);
    return start && end && start <= end ? [{ start, end }] : [];
  }).sort((a, b) => a.start.localeCompare(b.start));
  let nextDay = `${month}-01`;
  const endOfMonth = lastDay(month);
  for (const range of ranges) {
    if (range.end < nextDay) continue;
    if (range.start > nextDay) return false;
    if (range.end >= endOfMonth) return true;
    nextDay = new Date(new Date(`${range.end}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
  }
  return false;
};

// A recent median limits outlier influence; seasonality needs two earlier examples.
const estimate = (history: HistoryMonth[], month: string, field: 'income' | 'spending') => {
  const available = history.filter(item => item.covered && item.month < month);
  const values = available.map(item => item[field] as number);
  const recent = quantile(values.slice(-6), 0.5);
  const seasonal = available.filter(item => item.month.slice(5) === month.slice(5)).map(item => item[field] as number);
  const seasonalUsed = seasonal.length >= 2;
  const expected = round(seasonalUsed ? (recent + quantile(seasonal, 0.5)) / 2 : recent);
  const median = quantile(values, 0.5);
  return {
    expected,
    low: round(Math.max(0, expected + quantile(values, 0.1) - median)),
    high: round(Math.max(expected, expected + quantile(values, 0.9) - median)),
    seasonalUsed,
  };
};

export function buildHistoryForecast(input: ForecastInput) {
  const reference = input.referenceDate ?? new Date();
  const horizon = [3, 6, 12].includes(input.horizon ?? 6) ? input.horizon ?? 6 : 6;
  const accounts = input.accounts.filter(account => account.currency === 'GBP');
  const sourceAccounts = accounts.filter(account => input.imports.some(item => item.accountId === account.id));
  const accountIds = new Set(sourceAccounts.map(account => account.id));
  const firstMonth = monthAt(reference, -24);
  const currentMonth = monthAt(reference, 0);
  let excludedTransfers = 0;
  let invalidRows = 0;
  const byMonth = new Map<string, { income: number; spending: number; count: number }>();
  for (const transaction of input.transactions) {
    const date = dateKey(transaction.transactionDate);
    if (!date || !Number.isFinite(transaction.amount) || transaction.amount < 0
      || !['credit', 'debit'].includes(transaction.direction)) { invalidRows++; continue; }
    const month = date.slice(0, 7);
    if (!accountIds.has(transaction.accountId) || month < firstMonth || month >= currentMonth) continue;
    if (transaction.transactionType === 'transfer') { excludedTransfers++; continue; }
    const totals = byMonth.get(month) ?? { income: 0, spending: 0, count: 0 };
    if (transaction.direction === 'credit') totals.income += transaction.amount;
    else totals.spending += transaction.amount;
    totals.count++;
    byMonth.set(month, totals);
  }
  const history: HistoryMonth[] = Array.from({ length: 24 }, (_, index) => {
    const month = monthAt(reference, index - 24);
    const covered = sourceAccounts.length > 0 && sourceAccounts.every(account =>
      coveredByImports(month, input.imports.filter(item => item.accountId === account.id)));
    const totals = byMonth.get(month) ?? { income: 0, spending: 0, count: 0 };
    return {
      month, covered, transactionCount: totals.count,
      income: covered ? round(totals.income) : null,
      spending: covered ? round(totals.spending) : null,
      net: covered ? round(totals.income - totals.spending) : null,
    };
  });
  const complete = history.filter(item => item.covered);
  // Old history with a missing recent quarter cannot describe today's household.
  const ready = complete.length >= 6 && history.slice(-3).every(item => item.covered);
  const projection = Array.from({ length: horizon }, (_, index) => {
    const month = monthAt(reference, index + 1);
    const income = ready ? estimate(complete, month, 'income') : null;
    const spending = ready ? estimate(complete, month, 'spending') : null;
    const plannedIncome = round(input.incomePlans.reduce((sum, plan) => sum + plannedAmountForMonth(plan, month), 0));
    const plannedExpenses = round(input.expensePlans.reduce((sum, plan) => sum + plannedAmountForMonth(plan, month), 0));
    return {
      month, income, spending, plannedIncome, plannedExpenses,
      net: income && spending ? round(income.expected - spending.expected) : null,
      netLow: income && spending ? round(income.low - spending.high) : null,
      netHigh: income && spending ? round(income.high - spending.low) : null,
      planIncomeNet: spending ? round(plannedIncome - spending.expected) : null,
    };
  });
  const errors: Array<{ income: number; spending: number; net: number }> = [];
  for (const target of complete.slice(-6)) {
    const training = complete.filter(item => item.month < target.month);
    if (training.length < 6) continue;
    const income = estimate(training, target.month, 'income').expected;
    const spending = estimate(training, target.month, 'spending').expected;
    errors.push({ income: Math.abs(income - target.income!), spending: Math.abs(spending - target.spending!), net: Math.abs(income - spending - target.net!) });
  }
  return {
    generatedAt: reference.toISOString(), status: ready ? 'ready' as const : 'insufficient-history' as const,
    window: { start: firstMonth, end: monthAt(reference, -1), completeMonths: complete.length, requestedMonths: 24 },
    sources: sourceAccounts, missingAccounts: input.accounts.filter(account => !accountIds.has(account.id)).map(account => account.name),
    excludedTransfers, invalidRows, history, projection,
    backtest: errors.length ? {
      months: errors.length,
      incomeError: round(errors.reduce((sum, row) => sum + row.income, 0) / errors.length),
      spendingError: round(errors.reduce((sum, row) => sum + row.spending, 0) / errors.length),
      netError: round(errors.reduce((sum, row) => sum + row.net, 0) / errors.length),
    } : null,
  };
}

export type HistoryForecast = ReturnType<typeof buildHistoryForecast>;
