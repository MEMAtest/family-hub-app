import { buildRecentSpending, recentSpendingRange } from './recentSpending';
import { buildMoneyReport, classifyMoneyTransaction, emptyMoneyPreferences, moneyMerchantKey, type MoneyImport, type MoneyRow } from './moneyPlanner';

const row = (id: string, transactionDate: string, amount: number, description = 'Tesco', direction = 'debit', accountId = 'a', transactionType = 'normal'): MoneyRow => ({
  id, transactionDate, amount, description, direction, accountId, transactionType,
});
const fullImports = (accountIds = ['a']): MoneyImport[] => accountIds.map(accountId => ({ accountId, statementStart: '2026-10-18', statementEnd: '2026-10-23' }));
const fixture = () => ({ days: 3, referenceDate: '2026-10-23', accountIds: ['a'], transactions: [] as MoneyRow[], imports: fullImports(), preferences: emptyMoneyPreferences() });

test('one calendar day includes today and has a separate immediately preceding day', () => {
  expect(recentSpendingRange(1, '2026-10-23')).toEqual({ start: '2026-10-23', end: '2026-10-23', previousStart: '2026-10-22', previousEnd: '2026-10-22' });
  const result = buildRecentSpending({ ...fixture(), days: 1, transactions: [
    row('previous', '2026-10-22', 3), row('midnight', '2026-10-23T00:00:00.000Z', 5), row('tomorrow', '2026-10-24', 9),
  ] });
  expect(result.summary.spending).toBe(5);
  expect(result.previous.spending).toBe(3);
  expect(result.transactions.map(item => [item.id, item.transactionDate])).toEqual([['midnight', '2026-10-23']]);
});

test.each([
  ['2026-07-01T23:30:00Z', '2026-07-02', '2026-06-30'],
  ['2026-01-02T23:30:00Z', '2026-01-02', '2025-12-31'],
  ['2026-03-29T23:30:00Z', '2026-03-30', '2026-03-28'],
  ['2026-10-25T23:30:00Z', '2026-10-25', '2026-10-23'],
  ['2026-10-25T00:30:00+01:00', '2026-10-25', '2026-10-23'],
])('uses London calendar days through summer/winter DST for %s', (referenceDate, end, start) => {
  const result = recentSpendingRange(3, referenceDate);
  expect(result).toMatchObject({ start, end });
  expect(Date.parse(`${result.end}T00:00:00Z`) - Date.parse(`${result.start}T00:00:00Z`)).toBe(2 * 86_400_000);
  expect(Date.parse(`${result.start}T00:00:00Z`) - Date.parse(`${result.previousEnd}T00:00:00Z`)).toBe(86_400_000);
});

test('date-only reference values are explicit calendar dates and the maximum window is 365 inclusive days', () => {
  expect(recentSpendingRange(1, '2026-07-01').end).toBe('2026-07-01');
  expect(recentSpendingRange(365, '2026-10-23')).toEqual({ start: '2025-10-24', end: '2026-10-23', previousStart: '2024-10-24', previousEnd: '2025-10-23' });
});

test.each([0, -1, 366, 1.5, NaN, Infinity])('rejects invalid days %s', days => {
  expect(() => recentSpendingRange(days, '2026-10-23')).toThrow('days must be an integer from 1 to 365');
});

test.each(['2026-02-30', '2026-13-01', 'invalid', '2026-10-23T12:00:00', '2026-02-30T12:00:00Z'])('rejects ambiguous or invalid reference dates %s', referenceDate => {
  expect(() => recentSpendingRange(3, referenceDate)).toThrow('referenceDate must be a valid calendar date or ISO timestamp');
});

test('includes both endpoints, normalizes bank dates in UTC, and excludes rows outside the two windows', () => {
  const result = buildRecentSpending({ ...fixture(), transactions: [
    row('outside-previous', '2026-10-17', 999), row('previous-start', '2026-10-18', 4), row('previous-end', '2026-10-20', 6),
    row('current-start', '2026-10-21', 1), row('current-end', '2026-10-23T00:00:00Z', 2), row('outside-current', '2026-10-24', 999),
  ] });
  expect(result.summary).toMatchObject({ spending: 3, count: 2 });
  expect(result.previous).toMatchObject({ spending: 10, change: -7, changePercent: -70 });
  expect(result.transactions.map(item => item.id)).toEqual(['current-start', 'current-end']);
  expect(result.sourceThrough).toBe('2026-10-23');
  expect(JSON.stringify(result)).not.toContain('previous-start');
  const midnight = buildRecentSpending({ ...fixture(), days: 1, referenceDate: '2026-07-02T00:30:00+01:00', imports: [], transactions: [
    row('utc-bank-date', '2026-07-01T23:30:00Z', 1),
  ] });
  expect(midnight.end).toBe('2026-07-02');
  expect(midnight.transactions).toEqual([]);
  expect(midnight.previous.spending).toBe(1);
});

test('shares manual categorization and recorded transfer precedence with the monthly report', () => {
  const input = fixture();
  input.preferences.rules[moneyMerchantKey('a', 'Known merchant')] = { category: 'Dining', kind: 'spend' };
  input.preferences.overrides.manual = { category: 'Housing', kind: 'spend' };
  input.preferences.overrides.transfer = { category: 'Shopping', kind: 'spend' };
  input.transactions = [
    row('manual', '2026-10-21', 10, 'Known merchant'), row('rule', '2026-10-22', 4, 'Known merchant'),
    row('transfer', '2026-10-22', 20, 'Account transfer', 'debit', 'a', 'transfer'), row('unknown', '2026-10-23', 5, 'Bank direct debit'),
    row('credit', '2026-10-23', 800, 'Personal payee', 'credit'), row('refund', '2026-10-23', 2, 'Tesco refund', 'credit'),
  ];
  const before = JSON.parse(JSON.stringify(input.transactions));
  const result = buildRecentSpending(input);
  const monthly = buildMoneyReport({ ...input, month: '2026-10', now: '2026-11-01' });
  expect(result.summary).toEqual({ outgoing: 39, spending: 14, review: 5, transfers: 20, count: 6 });
  expect(result.transactions).toEqual(input.transactions.map(item => classifyMoneyTransaction(item, input.preferences)));
  expect(result.transactions).toEqual(monthly.transactions);
  expect(result.transactions.slice(0, 3).map(item => [item.category, item.assignmentSource])).toEqual([['Housing', 'confirmed'], ['Dining', 'confirmed'], ['Transfers', 'recorded']]);
  expect(result.categories.map(item => item.category)).toEqual(['Housing', 'Dining']);
  expect(input.transactions).toEqual(before);
});

test('distinguishes entirely unknown windows from fully covered empty windows', () => {
  const unknown = buildRecentSpending({ ...fixture(), imports: [] });
  expect(unknown).toMatchObject({ coverage: 'none', coveredDays: 0, sourceThrough: null,
    summary: { outgoing: null, spending: null, review: null, transfers: null, count: 0 }, previous: { coverage: 'none', spending: null, change: null, changePercent: null } });
  expect(unknown.categories).toEqual([]);
  const empty = buildRecentSpending(fixture());
  expect(empty).toMatchObject({ coverage: 'complete', coveredDays: 3,
    summary: { outgoing: 0, spending: 0, review: 0, transfers: 0, count: 0 }, previous: { coverage: 'complete', spending: 0, change: 0, changePercent: null } });
  expect(buildRecentSpending({ ...fixture(), accountIds: [] }).coverage).toBe('none');
});

test('known rows without import ranges are partial, and partial empty imports remain observed zero', () => {
  const observed = buildRecentSpending({ ...fixture(), imports: [], transactions: [row('current', '2026-10-22', 2), row('previous', '2026-10-19', 1)] });
  expect(observed).toMatchObject({ coverage: 'partial', coveredDays: 0, summary: { spending: 2 }, previous: { coverage: 'partial', spending: 1, change: null } });
  expect(observed.categories[0]).toMatchObject({ amount: 2, previous: 1, change: null, changePercent: null });
  const partialEmpty = buildRecentSpending({ ...fixture(), imports: [{ accountId: 'a', statementStart: '2026-10-21', statementEnd: '2026-10-22' }] });
  expect(partialEmpty).toMatchObject({ coverage: 'partial', coveredDays: 2, summary: { spending: 0 }, previous: { coverage: 'none', spending: null, change: null } });
});

test('requires coverage of every day in every account and unions overlapping or adjacent imports', () => {
  const imports: MoneyImport[] = [
    { accountId: 'a', statementStart: '2026-10-18', statementEnd: '2026-10-21' },
    { accountId: 'a', statementStart: '2026-10-21', statementEnd: '2026-10-22' },
    { accountId: 'a', statementStart: '2026-10-23', statementEnd: '2026-10-23' },
    ...fullImports(['b']),
  ];
  const complete = buildRecentSpending({ ...fixture(), accountIds: ['a', 'b'], imports });
  expect(complete).toMatchObject({ coverage: 'complete', coveredDays: 3 });
  const gap = buildRecentSpending({ ...fixture(), accountIds: ['a', 'b'], imports: imports.filter(item => item.statementEnd !== '2026-10-22'), transactions: [row('observed-gap', '2026-10-22', 5)] });
  expect(gap).toMatchObject({ coverage: 'partial', coveredDays: 2, summary: { outgoing: 5 }, previous: { change: null } });
  const missingAccount = buildRecentSpending({ ...fixture(), accountIds: ['a', 'b'], imports: fullImports(['a']), transactions: [row('b', '2026-10-23', 3, 'Tesco', 'debit', 'b')] });
  expect(missingAccount).toMatchObject({ coverage: 'partial', coveredDays: 0, summary: { spending: 3 } });
});

test('compares complete windows only, with categories disappearing at observed zero and no zero-baseline percentage', () => {
  const input = { ...fixture(), transactions: [row('previous-only', '2026-10-19', 10, 'Uber Eats'), row('current-only', '2026-10-22', 5)] };
  const result = buildRecentSpending(input);
  expect(result.previous).toMatchObject({ spending: 10, change: -5, changePercent: -50 });
  expect(result.categories).toEqual([
    { category: 'Groceries', amount: 5, count: 1, previous: 0, change: 5, changePercent: null },
    { category: 'Dining', amount: 0, count: 0, previous: 10, change: -10, changePercent: -100 },
  ]);
  const previousPartial = buildRecentSpending({ ...input, imports: [{ accountId: 'a', statementStart: '2026-10-19', statementEnd: '2026-10-23' }] });
  expect(previousPartial.previous.change).toBeNull();
  expect(previousPartial.categories.every(item => item.change === null && item.changePercent === null)).toBe(true);
  const currentUnknown = buildRecentSpending({ ...fixture(), imports: [{ accountId: 'a', statementStart: '2026-10-18', statementEnd: '2026-10-20' }], transactions: [row('old', '2026-10-19', 10)] });
  expect(currentUnknown.summary.spending).toBeNull();
  expect(currentUnknown.categories).toEqual([]);
});

test('sums in integer pence and filters invalid amounts, dates, directions and inactive accounts', () => {
  const result = buildRecentSpending({ ...fixture(), transactions: [
    row('one', '2026-10-21', 0.1), row('two', '2026-10-22', 0.2), row('before', '2026-10-19', 0.1),
    row('zero', '2026-10-22', 0), row('negative', '2026-10-22', -1), row('nan', '2026-10-22', NaN), row('infinite', '2026-10-22', Infinity),
    row('invalid-date', '2026-02-30', 1), row('invalid-direction', '2026-10-22', 1, 'Tesco', 'unknown'), row('inactive', '2026-10-22', 999, 'Tesco', 'debit', 'b'),
  ] });
  expect(result.summary).toMatchObject({ outgoing: 0.3, spending: 0.3, count: 2 });
  expect(result.previous).toMatchObject({ spending: 0.1, change: 0.2, changePercent: 200 });
  expect(result.categories[0]).toMatchObject({ amount: 0.3, count: 2, previous: 0.1, change: 0.2, changePercent: 200 });
});

test('source-through follows available data rather than claiming today and never exceeds the report end', () => {
  const stale = buildRecentSpending({ ...fixture(), imports: [{ accountId: 'a', statementStart: '2026-10-18', statementEnd: '2026-10-20' }] });
  expect(stale.sourceThrough).toBe('2026-10-20');
  expect(stale.coverage).toBe('none');
  const actual = buildRecentSpending({ ...fixture(), imports: [], transactions: [row('actual', '2026-10-22', 2), row('outside-scope', '2026-10-17', 9), row('future', '2026-10-24', 9)] });
  expect(actual.sourceThrough).toBe('2026-10-22');
  const futureImport = buildRecentSpending({ ...fixture(), imports: [{ accountId: 'a', statementStart: '2026-10-18', statementEnd: '2026-10-30' }] });
  expect(futureImport.sourceThrough).toBe('2026-10-23');
});

test('daily chart reconciles to recorded money out, includes unresolved bills but not credits, and leaves uncovered days as gaps', () => {
  const result = buildRecentSpending({ ...fixture(), imports: [{ accountId: 'a', statementStart: '2026-10-21', statementEnd: '2026-10-22' }], transactions: [
    row('bill', '2026-10-21', 3723.62, 'Direct Debit Halifax, reference'), row('shop', '2026-10-21', .38),
    row('tax', '2026-10-22', 1100, 'Transfer MOB, HMRC, reference'), row('incoming', '2026-10-22', 9000, 'Payee', 'credit'),
  ] });
  expect(result.daily.map(day => day.outgoing)).toEqual([3724, 1100, null]);
  expect(result.daily.reduce((sum, day) => sum + Math.round((day.outgoing ?? 0) * 100), 0) / 100).toBe(result.summary.outgoing);
  expect(result.summary).toMatchObject({ outgoing: 4824, review: 3723.62, spending: 1100.38 });
});
