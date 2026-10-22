jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  budgetAccount: { findMany: jest.fn() }, budgetTransaction: { findMany: jest.fn() },
  statementImport: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn() },
} }));
import prisma from '@/lib/prisma';
import { loadMoneyPlanner, readMoneyPreferences, validMoneyMonth } from './moneyPlannerService';
import { emptyMoneyPreferences } from './moneyPlanner';

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.budgetAccount.findMany as jest.Mock).mockResolvedValue([{ id: 'bank', name: 'Synthetic account' }]);
  (prisma.budgetTransaction.findMany as jest.Mock).mockResolvedValue([{ id: 'one', accountId: 'bank', description: 'Tesco', amount: 1.25, direction: 'debit', transactionType: 'normal', category: 'Other', transactionDate: new Date('2026-09-01') }]);
  (prisma.statementImport.findMany as jest.Mock).mockResolvedValue([{ accountId: 'bank', statementStart: new Date('2026-01-01'), statementEnd: new Date('2026-10-20') }]);
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue(null);
});
test('validates real month values rather than rolling invalid inputs into another month', () => {
  expect(validMoneyMonth('2026-09')).toBe(true);
  for (const value of ['2026-13', '2026-00', '2026-1', '', null]) expect(validMoneyMonth(value)).toBe(false);
});
test('missing preferences are empty but malformed saved corrections fail closed', () => {
  expect(readMoneyPreferences(null)).toEqual(emptyMoneyPreferences());
  expect(readMoneyPreferences({ dismissed: ['one'] })).toMatchObject({ dismissed: ['one'], overrides: {} });
  expect(() => readMoneyPreferences({ overrides: null })).toThrow('do not overwrite');
  expect(() => readMoneyPreferences({ targets: { Groceries: { amount: -1 } } })).toThrow();
});
test('loads only household active GBP sources, six months, and serialises dates for pure analysis', async () => {
  const result = await loadMoneyPlanner('family', '2026-09');
  expect(result.report.months[2]).toMatchObject({ month: '2026-09', outgoing: 1.25, spending: 1.25, coverage: 'complete' });
  expect(prisma.budgetTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'family', account: { active: true, currency: 'GBP' }, transactionDate: { gte: new Date('2026-04-01'), lt: new Date('2026-10-01') } } }));
  expect(prisma.statementImport.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ familyId: 'family', account: { active: true, currency: 'GBP' } }) }));
  expect(result.report.transactions[0].transactionDate).toBe('2026-09-01');
});
test('supplied preferences use the same baseline report without reading a second document snapshot', async () => {
  await loadMoneyPlanner('family', '2026-09', emptyMoneyPreferences());
  expect(prisma.familyDocument.findUnique).not.toHaveBeenCalled();
});
