/** @jest-environment node */
import { NextRequest } from 'next/server';
import { createStatementPreview } from '@/lib/statementPreview';
const db = { budgetAccount: { findFirst: jest.fn() }, statementImport: { upsert: jest.fn(), update: jest.fn() }, budgetTransaction: { createMany: jest.fn(), updateMany: jest.fn() }, $transaction: jest.fn() };
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: db }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: any) => (request: any) => handler(request, {}, { familyId: 'family-test', dbUser: { id: 'user-test' } }) }));
const row = { id: 'row-1', date: '2026-09-30', description: 'Synthetic bank transfer', amount: 10.23, direction: 'debit' as const, category: 'Other', source: 'csv' as const };
const token = () => createStatementPreview({ familyId: 'family-test', userId: 'user-test', accountId: 'account-test', expiresAt: Date.now() + 10000,
  fileName: 'fixture.csv', contentHash: 'a'.repeat(64), sourceType: 'csv', result: { success: true, transactions: [row], warnings: [], errors: [], metadata: {} } });
beforeEach(() => {
  jest.clearAllMocks(); db.budgetAccount.findFirst.mockResolvedValue({ id: 'account-test' });
  db.statementImport.upsert.mockResolvedValue({ id: 'import-test' }); db.budgetTransaction.createMany.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation((callback: any) => callback(db));
});
async function commit(extra = {}) {
  const { POST } = await import('../route');
  return POST(new NextRequest('http://localhost/api/statement-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'commit', accountId: 'account-test', previewToken: token(), transactions: [row], ...extra }) }), {} as any);
}
test('parsing creates a signed preview and writes nothing', async () => {
  const { POST } = await import('../route');
  const form = new FormData(); form.set('accountId', 'account-test'); form.set('file', new File(['Date,Description,Amount\n2026-09-30,Fixture,-10.23'], 'fixture.csv'));
  const response = await POST(new NextRequest('http://localhost/api/statement-import', { method: 'POST', body: form }), {} as any);
  expect(response.status).toBe(200); expect((await response.json()).previewToken).toEqual(expect.any(String));
  expect(db.$transaction).not.toHaveBeenCalled(); expect(db.statementImport.upsert).not.toHaveBeenCalled();
});
test('only approved rows are committed, not planned budgets or automatic transfers', async () => {
  expect((await commit()).status).toBe(200);
  expect(db.budgetTransaction.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ accountId: 'account-test', amount: 10.23 })] }));
  expect(db.budgetTransaction.updateMany).not.toHaveBeenCalled();
});
test('refuses account substitution, unknown rows and unapproved requests', async () => {
  expect((await commit({ accountId: 'other' })).status).toBe(400);
  expect((await commit({ transactions: [{ ...row, id: 'injected' }] })).status).toBe(400);
  expect((await commit({ previewToken: 'bad' })).status).toBe(400);
  expect((await commit({ transactions: [] })).status).toBe(400);
  expect(db.$transaction).not.toHaveBeenCalled();
});
test('repeat file is idempotent', async () => {
  db.budgetTransaction.createMany.mockResolvedValue({ count: 0 });
  const result = await (await commit()).json();
  expect(result.ledgerImport.alreadyImported).toBe(true);
  expect(db.statementImport.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
});
