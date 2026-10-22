jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  budgetAccount: { findMany: jest.fn() }, budgetTransaction: { findMany: jest.fn() },
  statementImport: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn() },
} }));
import prisma from '@/lib/prisma';
import { loadRecentSpending } from './recentSpendingService';
test('limits bank reads to two equal calendar windows and sends only current-window payments', async () => {
  (prisma.budgetAccount.findMany as jest.Mock).mockResolvedValue([{ id: 'bank', name: 'Synthetic bank' }]);
  (prisma.statementImport.findMany as jest.Mock).mockResolvedValue([{ accountId: 'bank', statementStart: new Date('2026-01-01'), statementEnd: new Date('2026-10-22') }]);
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.budgetTransaction.findMany as jest.Mock).mockResolvedValue([
    { id: 'current', accountId: 'bank', transactionDate: new Date('2026-10-22'), description: 'Tesco', amount: 10, direction: 'debit', transactionType: 'normal', category: 'Housing' },
    { id: 'previous', accountId: 'bank', transactionDate: new Date('2026-10-10'), description: 'Lidl', amount: 20, direction: 'debit', transactionType: 'normal', category: null },
  ]);
  const result = await loadRecentSpending('household', 7, '2026-10-22T12:00:00Z');
  expect(prisma.budgetTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
    familyId: 'household', account: { active: true, currency: 'GBP' }, transactionDate: { gte: new Date('2026-10-09'), lt: new Date('2026-10-23') },
  } }));
  expect(result.report.transactions.map(row => row.id)).toEqual(['current']);
  expect(result.report.summary.spending).toBe(10);
  expect(result.report.previous.spending).toBe(20);
  expect(prisma.familyDocument.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId_key: { familyId: 'household', key: 'money.planner.preferences' } } }));
});
