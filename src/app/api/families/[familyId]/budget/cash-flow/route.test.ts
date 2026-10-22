jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  budgetAccount: { findMany: jest.fn() }, budgetTransaction: { findMany: jest.fn() },
  statementImport: { findMany: jest.fn() }, budgetIncome: { findMany: jest.fn() }, budgetExpense: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn() },
} }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number; headers?: unknown }) => ({ body, status: init?.status ?? 200, headers: init?.headers }) } }));
import { GET } from './route';
import prisma from '@/lib/prisma';
const context = { params: Promise.resolve({ familyId: 'home' }) };
const get = () => (GET as any)({ url: 'http://localhost/?month=2026-10' }, context);
const account = { id: 'bank', name: 'Synthetic bank', institution: null, openingBalance: null, _count: { imports: 1, transactions: 3 }, imports: [{ createdAt: new Date('2026-10-22'), statementEnd: new Date('2026-10-20'), closingBalance: 75 }] };
beforeEach(() => {
  jest.clearAllMocks();
  for (const model of [prisma.budgetAccount, prisma.budgetTransaction, prisma.statementImport, prisma.budgetIncome, prisma.budgetExpense]) (model.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue(null);
});
test('large saved plans do not affect actuals; transfers remain visible but are excluded from income/spending', async () => {
  (prisma.budgetAccount.findMany as jest.Mock).mockResolvedValue([account]);
  (prisma.budgetIncome.findMany as jest.Mock).mockResolvedValue([{ id: 'plan', incomeName: 'Saved income', amount: 99999, category: 'Salary', isRecurring: true, createdAt: new Date('2026-01-01') }]);
  (prisma.budgetTransaction.findMany as jest.Mock).mockResolvedValue([
    { id: 'one', accountId: 'bank', transactionDate: new Date('2026-10-01'), direction: 'credit', transactionType: 'normal', amount: 100, account: { name: 'Synthetic bank' } },
    { id: 'two', accountId: 'bank', transactionDate: new Date('2026-10-02'), direction: 'debit', transactionType: 'normal', amount: 25, account: { name: 'Synthetic bank' } },
    { id: 'three', accountId: 'bank', transactionDate: new Date('2026-10-03'), direction: 'credit', transactionType: 'transfer', amount: 5000, account: { name: 'Synthetic bank' } },
  ]);
  const result = await get();
  expect(result.body.summary).toMatchObject({ actualIncome: 100, actualSpend: 25, actualNet: 75, plannedIncome: 99999 });
  expect(result.body.coverage).toMatchObject({ status: 'partial', transactionCount: 3 });
  expect(result.body.transactions).toHaveLength(3);
  expect(prisma.budgetTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ familyId: 'home', account: { active: true, currency: 'GBP' } }) }));
  expect(result.headers['Cache-Control']).toBe('private, no-store');
});
test('full imported ranges make a zero-activity month known without misusing a multi-month closing balance', async () => {
  (prisma.budgetAccount.findMany as jest.Mock).mockResolvedValue([account]);
  (prisma.statementImport.findMany as jest.Mock).mockResolvedValue([{ accountId: 'bank', statementStart: new Date('2023-04-21'), statementEnd: new Date('2026-11-01'), openingBalance: 10, closingBalance: 75 }]);
  const result = await get();
  expect(result.body.coverage.status).toBe('complete');
  expect(result.body.reconciliations[0].closingBalance).toBeNull();
});
test('no account or history is explicitly missing coverage, not a made-up balance', async () => {
  const result = await get();
  expect(result.body.coverage).toMatchObject({ status: 'none', transactionCount: 0 });
});
test('database failures are unavailable, not a plan-backed fallback', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.budgetTransaction.findMany as jest.Mock).mockRejectedValue(new Error('Unavailable'));
  expect((await get()).status).toBe(500);
  log.mockRestore();
});
