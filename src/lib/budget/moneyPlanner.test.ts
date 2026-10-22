import { buildMoneyReport, emptyMoneyPreferences, moneyMerchantKey, type MoneyImport, type MoneyRow } from './moneyPlanner';

const fullImports = (accountIds = ['a']): MoneyImport[] => accountIds.map(accountId => ({ accountId, statementStart: '2025-01-01', statementEnd: '2026-12-31' }));
const row = (id: string, date: string, description: string, amount: number, direction = 'debit', accountId = 'a', transactionType = 'normal'): MoneyRow => ({
  id, accountId, transactionDate: date, description, amount, direction, transactionType,
});
const report = (transactions: MoneyRow[], options: { month?: string; imports?: MoneyImport[]; accountIds?: string[]; preferences?: ReturnType<typeof emptyMoneyPreferences> } = {}) => buildMoneyReport({
  month: options.month ?? '2026-10', now: '2026-11-20', accountIds: options.accountIds ?? ['a'], imports: options.imports ?? fullImports(options.accountIds),
  transactions, preferences: options.preferences ?? emptyMoneyPreferences(),
});

test('returns three chronological months and keeps row overrides ahead of rules and recorded transfers', () => {
  const preferences = emptyMoneyPreferences();
  preferences.rules[moneyMerchantKey('a', 'Tesco')] = { category: 'Shopping', kind: 'spend' };
  preferences.overrides.row = { category: 'Dining', kind: 'spend' };
  preferences.overrides.transfer = { category: 'Housing', kind: 'spend' };
  const result = report([
    row('row', '2026-10-02', 'Tesco', 12.34),
    row('transfer', '2026-10-03', 'Tesco', 10, 'debit', 'a', 'transfer'),
    row('manual-rule', '2026-10-04', 'Tesco Card Payment', 1),
    row('conflict', '2026-10-05', 'Salary', 2, 'debit'),
  ], { preferences });
  expect(result.months.map(item => item.month)).toEqual(['2026-08', '2026-09', '2026-10']);
  expect(result.transactions.map(item => [item.id, item.category, item.kind, item.assignmentSource])).toEqual([
    ['row', 'Dining', 'spend', 'confirmed'], ['transfer', 'Transfers', 'transfer', 'recorded'],
    ['manual-rule', 'Shopping', 'spend', 'confirmed'], ['conflict', 'Needs review', 'review', 'suggested'],
  ]);
  expect(result.months[2]).toMatchObject({ incoming: 0, outgoing: 25.34, spending: 13.34, transferAmount: 10, reviewAmount: 2 });
});

test('does not promote legacy categories, generic direct debits, or personal incoming payments', () => {
  const result = report([
    { ...row('legacy', '2026-10-01', 'Monthly payment', 40), category: 'Housing' },
    row('inbound', '2026-10-02', 'Alex Smith', 800, 'credit'),
    row('interest', '2026-10-03', 'Credit interest', 1, 'credit'),
    row('refund', '2026-10-04', 'Refund', 5, 'credit', 'a', 'refund'),
    row('merchant-refund', '2026-10-05', 'Tesco refund', 6, 'credit'),
    row('transfer', '2026-10-06', 'Transfer', 20, 'debit', 'a', 'transfer'),
  ]);
  expect(result.transactions.map(item => [item.category, item.kind])).toEqual([
    ['Needs review', 'review'], ['Needs review', 'review'], ['Income', 'income'], ['Refunds', 'refund'],
    ['Refunds', 'refund'], ['Transfers', 'transfer'],
  ]);
  expect(result.months[2].categories).toEqual([]);
  expect(result.categories).toEqual([]);
});

test('distinguishes complete zero, missing and partial coverage; comparisons require complete months', () => {
  const result = report([row('one', '2026-10-05', 'Tesco', 2)], {
    imports: [{ accountId: 'a', statementStart: '2026-08-01', statementEnd: '2026-08-31' },
      { accountId: 'a', statementStart: '2026-10-01', statementEnd: '2026-10-10' }],
  });
  expect(result.months.map(item => [item.coverage, item.spending])).toEqual([['complete', 0], ['none', null], ['partial', 2]]);
  expect(result.categories.find(item => item.category === 'Groceries')).toMatchObject({ amounts: [0, null, 2], change: null, changePercent: null });
  expect(result.months[1].count).toBe(0);
});

test('requires complete coverage for every active account', () => {
  const result = report([], { accountIds: ['a', 'b'], imports: fullImports(['a']) });
  expect(result.months.every(item => item.coverage === 'partial' && item.spending === 0)).toBe(true);
});

test('transactions without import ranges establish partial coverage and known daily activity', () => {
  const result = report([row('observed', '2026-10-12', 'Tesco', 12.5)], { imports: [] });
  expect(result.months[2]).toMatchObject({ coverage: 'partial', spending: 12.5 });
  expect(result.categories).toMatchObject([{ category: 'Groceries', amounts: [null, null, 12.5], counts: [0, 0, 1], change: null }]);
  expect(result.daily.map(item => item.date)).toEqual(['2026-10-12']);
  expect(result.pressure).toBeNull();
});

test('multi-account daily totals retain every observed debit while omitting unverified zero days', () => {
  const result = report([
    row('day-03', '2026-10-03', 'Private payee', 1, 'debit', 'a'),
    row('day-04', '2026-10-04', 'Private payee', 1, 'debit', 'a'),
    row('first-account', '2026-10-05', 'Tesco', 10, 'debit', 'a'),
    row('second-account', '2026-10-06', 'Private payee', 7, 'debit', 'b'),
    row('day-07', '2026-10-07', 'Private payee', 1, 'debit', 'a'),
    row('day-08', '2026-10-08', 'Private payee', 1, 'debit', 'a'),
    row('day-09', '2026-10-09', 'Private payee', 1, 'debit', 'a'),
    row('first-account-later', '2026-10-10', 'Aldi', 3, 'debit', 'a'),
  ], {
    accountIds: ['a', 'b'],
    imports: [
      { accountId: 'a', statementStart: '2026-10-01', statementEnd: '2026-10-31' },
      { accountId: 'b', statementStart: '2026-10-01', statementEnd: '2026-10-02' },
    ],
  });
  expect(result.months[2]).toMatchObject({ coverage: 'partial', outgoing: 25, count: 8 });
  expect(result.daily.map(item => item.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
  expect(result.daily[result.daily.length - 1].cumulative).toBe(25);
  expect(result.pressure).toBeNull();
});

test('partial daily output stops at known dates, skips uncovered gaps, and does not invent zero pressure', () => {
  const imports = [{ accountId: 'a', statementStart: '2026-10-01', statementEnd: '2026-10-10' }];
  const partial = report([
    row('covered', '2026-10-05', 'Tesco', 4), row('transfer', '2026-10-06', 'Account transfer', 8, 'debit', 'a', 'transfer'),
    row('outside', '2026-10-15', 'Tesco', 6),
  ], { imports });
  expect(partial.daily.map(item => item.date)).toEqual([
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-15',
  ]);
  expect(partial.daily[partial.daily.length - 1]?.cumulative).toBe(18);
  expect(partial.pressure).toMatchObject({ start: '2026-10-01', end: '2026-10-07', amount: 12 });
  const absent = report([], { imports: [] });
  expect(absent.daily).toEqual([]);
  expect(absent.pressure).toBeNull();
  expect(report([], { imports: fullImports() }).pressure).toBeNull();
});

test('current and future months cannot become complete from broad import ranges', () => {
  const preferences = emptyMoneyPreferences();
  preferences.targets.Groceries = { amount: 70, baselineMonth: '2026-09', baselineAmount: 100, createdAt: '2026-10-01' };
  const result = buildMoneyReport({
    month: '2026-11', now: '2026-10-15', accountIds: ['a'], imports: fullImports(), preferences,
    transactions: [row('oct', '2026-10-10', 'Tesco', 80), row('nov', '2026-11-10', 'Tesco', 60)],
  });
  expect(result.months[2].coverage).toBe('partial');
  expect(result.categories.find(item => item.category === 'Groceries')?.change).toBeNull();
  expect(result.targets[0].observedReduction).toBeNull();
  expect(result.daily).toEqual([]);
});

test('normalizes only known payment suffixes and preserves account scope and narrative numbers', () => {
  expect(moneyMerchantKey('a', ' Tesco  Card Payment ')).toBe(moneyMerchantKey('a', 'tesco'));
  expect(moneyMerchantKey('a', 'TESCO 1234')).not.toBe(moneyMerchantKey('a', 'TESCO'));
  expect(moneyMerchantKey('a', 'Tesco')).not.toBe(moneyMerchantKey('b', 'Tesco'));
});

test('grocery pattern counts distinct payment dates only in a fully covered Monday-Sunday week', () => {
  const transactions = [row('g1', '2026-10-05', 'Tesco', 10), row('g2', '2026-10-05', 'Tesco', 5), row('g3', '2026-10-07', 'Aldi', 8), row('g4', '2026-10-09', 'Lidl', 7)];
  const fullWeek = report(transactions);
  expect(fullWeek.insights.filter(item => item.type === 'shopping')).toHaveLength(1);
  expect(fullWeek.insights.find(item => item.type === 'shopping')?.detail).toContain('4 grocery payments');
  expect(fullWeek.insights.find(item => item.type === 'shopping')?.detail).toContain('3 different dates');
  const gap = report(transactions, { imports: [{ accountId: 'a', statementStart: '2025-01-01', statementEnd: '2026-10-07' }, { accountId: 'a', statementStart: '2026-10-09', statementEnd: '2026-12-31' }] });
  expect(gap.insights.filter(item => item.type === 'shopping')).toHaveLength(0);
});

test('uses integer pence for sums and preserves year/month boundaries', () => {
  const result = report([row('p1', '2026-01-31', 'Tesco', 0.1), row('p2', '2026-01-31', 'Tesco', 0.2)], { month: '2026-01' });
  expect(result.months.map(item => item.month)).toEqual(['2025-11', '2025-12', '2026-01']);
  expect(result.months[2].spending).toBe(0.3);
  expect(result.transactions).toHaveLength(2);
  expect(() => report([], { month: '2026-13' })).toThrow('month must be YYYY-MM');
});

test('manual targets separate potential from observed reductions and never claim verified savings', () => {
  const preferences = emptyMoneyPreferences();
  preferences.targets.Groceries = { amount: 70, baselineMonth: '2026-08', baselineAmount: 100, createdAt: '2026-10-01' };
  const result = report([
    row('baseline', '2026-08-10', 'Tesco', 100),
    row('current', '2026-10-10', 'Tesco', 60),
  ], { preferences });
  expect(result.targets).toEqual([{ category: 'Groceries', amount: 70, baselineAmount: 100, baselineMonth: '2026-08', potentialSaving: 30, observedReduction: 40, status: 'observed' }]);
  expect(result.targets.every(item => ['potential', 'observed'].includes(item.status))).toBe(true);
  expect(result.insights.every(item => item.savingsStatus === null || item.savingsStatus === 'potential')).toBe(true);
  expect(result).not.toHaveProperty('verifiedSavings');
  expect(result).not.toHaveProperty('realisedSavings');
  const incomplete = report([row('current', '2026-10-10', 'Tesco', 60)], { preferences, imports: [{ accountId: 'a', statementStart: '2026-08-01', statementEnd: '2026-08-31' }] });
  expect(incomplete.targets[0]).toMatchObject({ potentialSaving: 30, observedReduction: null, status: 'potential' });
  const nonLaterBaseline = report([row('baseline', '2026-10-10', 'Tesco', 90)], {
    preferences: { ...preferences, targets: { Groceries: { ...preferences.targets.Groceries, baselineMonth: '2026-10' } } },
  });
  expect(nonLaterBaseline.targets[0].observedReduction).toBeNull();
  const nonSpendingTarget = report([], { preferences: { ...preferences, targets: { Income: { amount: 5, baselineMonth: '2026-08', baselineAmount: 10, createdAt: '2026-10-01' } } } });
  expect(nonSpendingTarget.targets).toEqual([]);
});

test('baseline reclassification after target creation requires a fresh baseline', () => {
  const preferences = emptyMoneyPreferences();
  preferences.targets.Groceries = { amount: 70, baselineMonth: '2026-08', baselineAmount: 100, createdAt: '2026-09-01' };
  preferences.overrides['baseline-row'] = { category: 'Shopping', kind: 'spend' };
  const result = report([
    row('baseline-row', '2026-08-10', 'Tesco', 100),
    row('current-row', '2026-10-10', 'Tesco', 60),
  ], { preferences });
  expect(result.targets[0]).toMatchObject({ baselineAmount: 100, potentialSaving: 30, observedReduction: null, status: 'potential' });
});

test('recurring insight needs three earlier complete months and is explicitly an estimate', () => {
  const imports = [{ accountId: 'a', statementStart: '2026-05-01', statementEnd: '2026-12-31' }];
  const transactions = ['2026-06-10', '2026-07-10', '2026-08-10', '2026-10-10'].map((date, index) => row(`bill-${index}`, date, 'Netflix subscription', 45));
  const result = report(transactions, { imports });
  expect(result.insights.find(item => item.type === 'recurring')).toMatchObject({ amount: 45, savingsStatus: null });
  expect(result.insights.find(item => item.type === 'recurring')?.detail).toContain('not a confirmed future bill');
  expect(result.insights.find(item => item.type === 'recurring')?.id).toMatch(/^recurring:[a-z0-9]+:2026-10$/);
  expect(result.insights.find(item => item.type === 'recurring')?.id.length).toBeLessThan(240);
});

test.each([
  ['Uber Eats', 'Dining'], ['UberEats order', 'Dining'], ['Uber trip', 'Transport'],
  ['Grandir Nursery', 'Childcare'], ['Octopus', 'Household bills'], ['British Gas', 'Household bills'],
  ['EDF Energy', 'Household bills'], ['Argos', 'Shopping'], ['Dunelm', 'Shopping'], ['B&Q', 'Home improvements'], ['Screwfix', 'Home improvements'],
])('suggests %s as %s without relying on legacy category labels', (description, category) => {
  const result = report([row(description, '2026-10-10', description, 30)]);
  expect(result.transactions[0]).toMatchObject({ category, kind: 'spend', assignmentSource: 'suggested' });
});

test('category charts include only spending categories with rows in the displayed months', () => {
  const result = report([
    row('old-only', '2026-05-02', 'Tesco', 2),
    row('current', '2026-10-02', 'Tesco', 3),
    row('income', '2026-10-03', 'Payroll', 100, 'credit', 'a', 'payroll'),
    row('unknown', '2026-10-04', 'Private payee', 5),
  ]);
  expect(result.categories.map(item => item.category)).toEqual(['Groceries']);
  expect(result.months[2].categories).toEqual([{ category: 'Groceries', amount: 3, count: 1 }]);
});
