import { buildHistoryForecast, quantile, type ForecastInput } from './historyForecast';

const fixture = (): ForecastInput => ({
  referenceDate: new Date('2026-10-22T15:00:00Z'), horizon: 6,
  accounts: [{ id: 'bank', name: 'Synthetic bank', currency: 'GBP' }],
  imports: [{ accountId: 'bank', statementStart: '2024-10-01', statementEnd: '2026-10-20' }],
  transactions: Array.from({ length: 24 }, (_, index) => {
    const transactionDate = new Date(Date.UTC(2024, 9 + index, 15));
    return [
      { accountId: 'bank', transactionDate, amount: 3000, direction: 'credit', transactionType: 'normal' },
      { accountId: 'bank', transactionDate, amount: 2000, direction: 'debit', transactionType: 'normal' },
    ];
  }).flat(),
  incomePlans: [], expensePlans: [],
});

test('uses the last 24 complete months and starts predictions next month', () => {
  const result = buildHistoryForecast(fixture());
  expect(result.window).toEqual({ start: '2024-10', end: '2026-09', completeMonths: 24, requestedMonths: 24 });
  expect(result.status).toBe('ready');
  expect(result.projection).toHaveLength(6);
  expect(result.projection[0]).toMatchObject({ month: '2026-11', net: 1000, netLow: 1000, netHigh: 1000 });
  expect(result.backtest).toEqual({ months: 6, incomeError: 0, spendingError: 0, netError: 0 });
});
test('does not include partial current months or identified internal transfers', () => {
  const input = fixture();
  input.transactions.push(
    { accountId: 'bank', transactionDate: '2026-10-01', amount: 900000, direction: 'credit', transactionType: 'normal' },
    { accountId: 'bank', transactionDate: '2026-09-01', amount: 900000, direction: 'credit', transactionType: 'transfer' },
    { accountId: 'bank', transactionDate: '2026-09-02', amount: 900000, direction: 'debit', transactionType: 'transfer' },
  );
  const result = buildHistoryForecast(input);
  expect(result.excludedTransfers).toBe(2);
  expect(result.history[23]).toMatchObject({ income: 3000, spending: 2000, transactionCount: 2 });
});
test('uncovered months are null rather than zero; an actually covered empty month is zero', () => {
  const input = fixture();
  input.imports[0].statementStart = '2024-10-02';
  input.transactions = input.transactions.filter(row => new Date(row.transactionDate).getUTCMonth() !== 10);
  const result = buildHistoryForecast(input);
  expect(result.history[0]).toMatchObject({ covered: false, income: null, spending: null });
  expect(result.history[1]).toMatchObject({ covered: true, income: 0, spending: 0 });
  expect(result.window.completeMonths).toBe(23);
});
test('unions adjacent and overlapping imports without counting a gap as coverage', () => {
  const input = fixture();
  input.imports = [
    { accountId: 'bank', statementStart: '2024-10-01', statementEnd: '2025-01-15' },
    { accountId: 'bank', statementStart: '2025-01-16', statementEnd: '2025-08-15' },
    { accountId: 'bank', statementStart: '2025-08-17', statementEnd: '2026-10-20' },
    { accountId: 'bank', statementStart: null, statementEnd: null },
  ];
  const result = buildHistoryForecast(input);
  expect(result.history.find(row => row.month === '2025-01')?.covered).toBe(true);
  expect(result.history.find(row => row.month === '2025-08')?.covered).toBe(false);
});
test('requires coverage for each included bank; rejects stale recent history', () => {
  const input = fixture();
  input.accounts.push({ id: 'second', name: 'Other bank', currency: 'GBP' });
  input.imports.push({ accountId: 'second', statementStart: '2026-04-01', statementEnd: '2026-08-31' });
  const result = buildHistoryForecast(input);
  expect(result.status).toBe('insufficient-history');
  expect(result.projection[0].income).toBeNull();
  expect(result.history[23].income).toBeNull();
});
test('shows absent and non-GBP accounts as missing, never mixing currencies', () => {
  const input = fixture();
  input.accounts.push({ id: 'usd', name: 'Dollar bank', currency: 'USD' }, { id: 'missing', name: 'No imports', currency: 'GBP' });
  input.imports.push({ accountId: 'usd', statementStart: '2024-01-01', statementEnd: '2026-10-20' });
  input.transactions.push({ accountId: 'usd', transactionDate: '2026-09-01', amount: 999999, direction: 'credit', transactionType: 'normal' });
  const result = buildHistoryForecast(input);
  expect(result.missingAccounts).toEqual(['Dollar bank', 'No imports']);
  expect(result.projection[0].income?.expected).toBe(3000);
});
test('a planned income is independent of historical incoming and counts exact weekly payments', () => {
  const input = fixture();
  input.incomePlans = [{ amount: 100, isRecurring: true, recurringFrequency: 'weekly', recurringStartDate: '2026-11-01', recurringEndDate: '2026-11-29' }];
  const result = buildHistoryForecast(input);
  expect(result.projection[0]).toMatchObject({ plannedIncome: 500, planIncomeNet: -1500, net: 1000 });
  expect(result.projection[1].plannedIncome).toBe(0);
});
test('uses a robust median and reports real nonzero rolling error without future leakage', () => {
  const input = fixture();
  input.transactions.push({ accountId: 'bank', transactionDate: '2026-09-15', amount: 60000, direction: 'credit', transactionType: 'normal' });
  const result = buildHistoryForecast(input);
  expect(result.projection[0].income?.expected).toBe(3000);
  expect(result.backtest?.incomeError).toBe(10000);
});
test('no imports, too little history, invalid rows and ranges cannot invent a forecast', () => {
  const input = fixture();
  input.imports = [];
  input.transactions.push({ accountId: 'bank', transactionDate: 'invalid', amount: NaN, direction: 'credit', transactionType: 'normal' });
  const result = buildHistoryForecast(input);
  expect(result.status).toBe('insufficient-history');
  expect(result.history.every(row => row.income === null)).toBe(true);
  expect(result.invalidRows).toBe(1);
  expect(result.backtest).toBeNull();
});
test('handles year boundaries, horizon limits and quantile interpolation', () => {
  const input = fixture();
  input.referenceDate = new Date('2026-12-01T00:00:00Z');
  input.horizon = 12;
  expect(buildHistoryForecast(input).projection[0].month).toBe('2027-01');
  expect(buildHistoryForecast({ ...input, horizon: 900 }).projection).toHaveLength(6);
  expect(quantile([0, 100], 0.1)).toBe(10);
});
