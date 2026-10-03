import { reconcileStatement } from '../statementReconciliation';
const date = (day: string) => new Date(`${day}T12:00:00Z`);
test('reconciles exact coverage across months using pence', () => {
  const statement = { openingBalance: 100, closingBalance: 99.7, statementStart: date('2026-09-29'), statementEnd: date('2026-10-02') };
  const rows = [
    { transactionDate: date('2026-09-01'), amount: 1000, direction: 'debit' },
    { transactionDate: date('2026-09-30'), amount: 0.1, direction: 'debit' },
    { transactionDate: date('2026-10-02'), amount: 0.2, direction: 'debit' },
    { transactionDate: date('2026-10-03'), amount: 2000, direction: 'credit' },
  ];
  expect(reconcileStatement(statement, rows)).toEqual({ expectedClosingBalance: 99.7, mismatch: 0, reconciled: true });
  expect(reconcileStatement(statement, rows.slice(0, 2)).reconciled).toBe(false);
});
test('missing balance evidence is not called matched', () => {
  expect(reconcileStatement(undefined, []).reconciled).toBeNull();
  expect(reconcileStatement({ openingBalance: null, closingBalance: 100, statementStart: date('2026-09-01'), statementEnd: date('2026-09-30') }, []).reconciled).toBeNull();
});
