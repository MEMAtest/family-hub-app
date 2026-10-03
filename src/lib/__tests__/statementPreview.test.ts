/** @jest-environment node */
import { approvedStatementRow, createStatementPreview, readStatementPreview, type StatementPreview } from '../statementPreview';

const scope = { familyId: 'family-test', userId: 'user-test', accountId: 'account-test' };
const row = { id: 'row-1', date: '2026-09-30', description: 'Fixture only', amount: 10.23, direction: 'debit' as const, category: 'Other', source: 'csv' as const };
const preview = (): StatementPreview => ({ ...scope, expiresAt: Date.now() + 10000, fileName: 'fixture.csv', contentHash: 'a'.repeat(64), sourceType: 'csv', result: { success: true, transactions: [row], warnings: [], errors: [], metadata: { bank: 'Virgin Money' } } });
test('round trips a scoped review without storage', () => {
  expect(readStatementPreview(createStatementPreview(preview()), scope).result.transactions).toEqual([row]);
});
test.each(['accountId', 'userId', 'familyId'] as const)('refuses a different %s', key => {
  expect(() => readStatementPreview(createStatementPreview(preview()), { ...scope, [key]: 'other' })).toThrow('different account or user');
});
test('rejects tampering and expiry', () => {
  const token = createStatementPreview(preview());
  expect(() => readStatementPreview('a' + token.slice(1), scope)).toThrow();
  expect(() => readStatementPreview(createStatementPreview({ ...preview(), expiresAt: Date.now() - 1 }), scope)).toThrow('expired');
});
test('rejects impossible dates, unsafe amounts and fractions of a penny', () => {
  for (const change of [{ date: '2026-02-30' }, { amount: NaN }, { amount: 1.001 }, { amount: -1 }]) {
    expect(approvedStatementRow.safeParse({ ...row, ...change }).success).toBe(false);
  }
});
