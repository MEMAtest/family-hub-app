import { classifyMoneyTransaction, type MoneyImport, type MoneyPreferences, type MoneyReport, type MoneyRow } from './moneyPlanner';

export type RecentSpendingReport = {
  days: number; start: string; end: string; coverage: 'complete' | 'partial' | 'none'; coveredDays: number; sourceThrough: string | null;
  summary: { outgoing: number | null; spending: number | null; review: number | null; transfers: number | null; count: number };
  previous: { start: string; end: string; coverage: 'complete' | 'partial' | 'none'; spending: number | null; change: number | null; changePercent: number | null };
  categories: Array<{ category: string; amount: number; count: number; previous: number | null; change: number | null; changePercent: number | null }>;
  transactions: MoneyReport['transactions'];
};

const dayMs = 86_400_000;
const londonCalendar = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit',
});
const calendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
};
const timestamp = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    || !calendarDate(value.slice(0, 10))) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};
const bankDate = (value: string | Date | null) => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  if (!value) return null;
  return calendarDate(value) ?? timestamp(value)?.toISOString().slice(0, 10) ?? null;
};
const offsetDate = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00.000Z`) + days * dayMs).toISOString().slice(0, 10);
const toPence = (amount: number) => Math.round((amount + Number.EPSILON) * 100);
const money = (pence: number) => pence / 100;
const percent = (change: number, baseline: number) => baseline > 0 ? Math.round(change / baseline * 10000) / 100 : null;

export function recentSpendingRange(days: number, referenceDate?: string): { start: string; end: string; previousStart: string; previousEnd: string } {
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('days must be an integer from 1 to 365');
  let end: string;
  if (referenceDate !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    const date = calendarDate(referenceDate);
    if (!date) throw new Error('referenceDate must be a valid calendar date or ISO timestamp');
    end = date;
  } else {
    const date = referenceDate === undefined ? new Date() : timestamp(referenceDate);
    if (!date) throw new Error('referenceDate must be a valid calendar date or ISO timestamp');
    const parts = londonCalendar.formatToParts(date);
    const part = (type: 'year' | 'month' | 'day') => parts.find(item => item.type === type)!.value;
    end = `${part('year')}-${part('month')}-${part('day')}`;
  }
  const start = offsetDate(end, 1 - days);
  return { start, end, previousStart: offsetDate(start, -days), previousEnd: offsetDate(start, -1) };
}

export function buildRecentSpending(input: {
  days: number; referenceDate?: string; accountIds: string[]; transactions: MoneyRow[]; imports: MoneyImport[]; preferences: MoneyPreferences;
}): RecentSpendingReport {
  const range = recentSpendingRange(input.days, input.referenceDate);
  const accountIds = [...new Set(input.accountIds)];
  const active = new Set(accountIds);
  const imports = input.imports.flatMap(item => {
    const start = bankDate(item.statementStart); const end = bankDate(item.statementEnd);
    return active.has(item.accountId) && start && end && start <= end ? [{ accountId: item.accountId, start, end }] : [];
  });
  const rows = input.transactions.flatMap(row => {
    const date = bankDate(row.transactionDate);
    const pence = toPence(row.amount);
    if (!active.has(row.accountId) || !date || date < range.previousStart || date > range.end
      || !Number.isFinite(row.amount) || row.amount <= 0 || !Number.isSafeInteger(pence) || pence <= 0
      || !['debit', 'credit'].includes(row.direction)) return [];
    return [{ transaction: classifyMoneyTransaction({ ...row, transactionDate: date }, input.preferences), pence }];
  });
  type Row = typeof rows[number];
  const inWindow = (start: string, end: string) => rows.filter(row => row.transaction.transactionDate >= start && row.transaction.transactionDate <= end);
  const windowCoverage = (start: string, end: string, transactions: Row[]) => {
    // Inclusive day checks union adjacent/overlapping statements without bridging a missing day.
    const coveredDays = accountIds.length ? Array.from({ length: input.days }, (_, index) => offsetDate(start, index))
      .filter(date => accountIds.every(accountId => imports.some(item => item.accountId === accountId && item.start <= date && item.end >= date))).length : 0;
    const anyCoverage = imports.some(item => item.start <= end && item.end >= start);
    const coverage: RecentSpendingReport['coverage'] = coveredDays === input.days ? 'complete'
      : anyCoverage || transactions.length > 0 ? 'partial' : 'none';
    return { coverage, coveredDays };
  };
  const current = inWindow(range.start, range.end);
  const previous = inWindow(range.previousStart, range.previousEnd);
  const currentCoverage = windowCoverage(range.start, range.end, current);
  const previousCoverage = windowCoverage(range.previousStart, range.previousEnd, previous);
  const debitSum = (transactions: Row[], kind?: MoneyReport['transactions'][number]['kind']) => transactions
    .filter(row => row.transaction.direction === 'debit' && (kind === undefined || row.transaction.kind === kind))
    .reduce((sum, row) => sum + row.pence, 0);
  const currentSpending = debitSum(current, 'spend');
  const previousSpending = debitSum(previous, 'spend');
  const comparable = currentCoverage.coverage === 'complete' && previousCoverage.coverage === 'complete';
  const change = comparable ? currentSpending - previousSpending : null;
  const categoryTotals = (transactions: Row[]) => {
    const totals = new Map<string, { pence: number; count: number }>();
    for (const row of transactions.filter(item => item.transaction.direction === 'debit' && item.transaction.kind === 'spend')) {
      const value = totals.get(row.transaction.category) ?? { pence: 0, count: 0 };
      value.pence += row.pence; value.count++;
      totals.set(row.transaction.category, value);
    }
    return totals;
  };
  const currentCategories = categoryTotals(current);
  const previousCategories = categoryTotals(previous);
  // A non-nullable category amount cannot represent an entirely unknown current window.
  const categoryNames = currentCoverage.coverage === 'none' ? [] : [...new Set([...currentCategories.keys(), ...previousCategories.keys()])];
  const categories = categoryNames.map(category => {
    const value = currentCategories.get(category) ?? { pence: 0, count: 0 };
    const before = previousCategories.get(category)?.pence ?? 0;
    const categoryChange = comparable ? value.pence - before : null;
    return {
      category, amount: money(value.pence), count: value.count,
      previous: previousCoverage.coverage === 'none' ? null : money(before),
      change: categoryChange === null ? null : money(categoryChange),
      changePercent: categoryChange === null ? null : percent(categoryChange, before),
    };
  }).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  const sourceDates = rows.map(row => row.transaction.transactionDate);
  for (const item of imports.filter(item => item.start <= range.end)) sourceDates.push(item.end > range.end ? range.end : item.end);
  const sourceThrough = sourceDates.sort().pop() ?? null;
  const observed = (amount: number) => currentCoverage.coverage === 'none' ? null : money(amount);
  return {
    days: input.days, start: range.start, end: range.end,
    coverage: currentCoverage.coverage, coveredDays: currentCoverage.coveredDays, sourceThrough,
    summary: { outgoing: observed(debitSum(current)), spending: observed(currentSpending), review: observed(debitSum(current, 'review')), transfers: observed(debitSum(current, 'transfer')), count: current.length },
    previous: { start: range.previousStart, end: range.previousEnd, coverage: previousCoverage.coverage,
      spending: previousCoverage.coverage === 'none' ? null : money(previousSpending),
      change: change === null ? null : money(change), changePercent: change === null ? null : percent(change, previousSpending) },
    categories, transactions: current.map(row => row.transaction),
  };
}
