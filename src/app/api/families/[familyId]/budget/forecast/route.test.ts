jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  budgetAccount: { findMany: jest.fn() }, budgetTransaction: { findMany: jest.fn() },
  statementImport: { findMany: jest.fn() }, budgetIncome: { findMany: jest.fn() }, budgetExpense: { findMany: jest.fn() },
} }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number; headers?: unknown }) => ({ body, status: init?.status ?? 200, headers: init?.headers }) } }));
import { GET } from './route';
import prisma from '@/lib/prisma';

const context = { params: Promise.resolve({ familyId: 'only-this-household' }) };
beforeEach(() => {
  jest.clearAllMocks();
  for (const model of [prisma.budgetAccount, prisma.budgetTransaction, prisma.statementImport, prisma.budgetIncome, prisma.budgetExpense]) (model.findMany as jest.Mock).mockResolvedValue([]);
});
test('all queries are family scoped, date bounded and responses are not publicly cached', async () => {
  const result = await (GET as any)({ url: 'http://localhost/?months=12&familyId=other' }, context);
  expect(result.status).toBe(200);
  for (const model of [prisma.budgetAccount, prisma.budgetTransaction, prisma.statementImport, prisma.budgetIncome, prisma.budgetExpense]) expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ familyId: 'only-this-household' }) }));
  expect(prisma.budgetTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ transactionDate: expect.objectContaining({ gte: expect.any(Date), lt: expect.any(Date) }) }) }));
  expect(result.headers['Cache-Control']).toBe('private, no-store');
  expect(result.body.projection).toHaveLength(12);
  expect(result.body.status).toBe('insufficient-history');
});
test.each(['900', '-1', 'NaN'])('rejects an invalid horizon %s without querying', async value => {
  expect((await (GET as any)({ url: `http://localhost/?months=${value}` }, context)).status).toBe(400);
  expect(prisma.budgetTransaction.findMany).not.toHaveBeenCalled();
});
test('a database failure is not treated as empty history', async () => {
  (prisma.budgetTransaction.findMany as jest.Mock).mockRejectedValue(new Error('Unavailable'));
  expect((await (GET as any)({ url: 'http://localhost/' }, context)).status).toBe(500);
});
