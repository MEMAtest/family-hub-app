import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { monthRangeUtc, plannedForMonth } from '@/lib/budget/plannedMonth';
import { quoteReferenceSpend, selectedSpend } from '@/lib/sourcing/spend';
import type { ProjectSourcing } from '@/types/sourcing.types';

const sourcingFrom = (value: unknown): ProjectSourcing | null => {
  if (!value || typeof value !== 'object') return null;
  const sourcing = value as Partial<ProjectSourcing>;
  return Array.isArray(sourcing.requirements) && Array.isArray(sourcing.products) && Array.isArray(sourcing.basket)
    ? sourcing as ProjectSourcing
    : null;
};

export const GET = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const { start, end, key } = monthRangeUtc(new URL(request.url).searchParams.get('month') ?? '');
    const [accounts, transactions, income, expenses, imports, projectDocument] = await Promise.all([
      prisma.budgetAccount.findMany({
        where: { familyId, active: true },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { imports: true, transactions: true } },
          imports: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, statementEnd: true } },
        },
      }),
      prisma.budgetTransaction.findMany({
        where: { familyId, transactionDate: { gte: start, lt: end } },
        include: { account: { select: { id: true, name: true } } },
        orderBy: { transactionDate: 'asc' },
      }),
      prisma.budgetIncome.findMany({ where: { familyId } }),
      prisma.budgetExpense.findMany({ where: { familyId } }),
      prisma.statementImport.findMany({
        where: { familyId, statementStart: { gte: start, lt: end } },
        select: { accountId: true, openingBalance: true, closingBalance: true, statementStart: true, statementEnd: true },
      }),
      prisma.familyDocument.findUnique({
        where: { familyId_key: { familyId, key: 'property.projects' } },
        select: { data: true, updatedAt: true },
      }),
    ]);

    const actualIncome = transactions
      .filter((transaction) => transaction.transactionType !== 'transfer' && transaction.direction === 'credit')
      .reduce((total, transaction) => total + transaction.amount, 0);
    const actualSpend = transactions
      .filter((transaction) => transaction.transactionType !== 'transfer' && transaction.direction === 'debit')
      .reduce((total, transaction) => total + transaction.amount, 0);
    const transfers = transactions
      .filter((transaction) => transaction.transactionType === 'transfer')
      .reduce((total, transaction) => total + transaction.amount, 0);
    const byCategory = transactions
      .filter((transaction) => transaction.transactionType !== 'transfer' && transaction.direction === 'debit')
      .reduce<Record<string, number>>((groups, transaction) => {
        const category = transaction.category || 'Other';
        groups[category] = (groups[category] || 0) + transaction.amount;
        return groups;
      }, {});

    const plannedIncome = income
      .filter((item) => plannedForMonth(item, key))
      .reduce((total, item) => total + item.amount, 0);
    const plannedExpenses = expenses
      .filter((item) => plannedForMonth(item, key))
      .reduce((total, item) => total + item.amount, 0);

    const projects = (Array.isArray(projectDocument?.data) ? projectDocument.data : []).flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const project = value as Record<string, unknown>;
      const sourcing = sourcingFrom(project.sourcing);
      const spend = sourcing ? selectedSpend(sourcing) : null;
      const quote = sourcing ? quoteReferenceSpend(sourcing) : null;
      return [{
        id: String(project.id ?? ''),
        title: String(project.title ?? 'Property project'),
        status: String(project.status ?? 'planning'),
        selectedCost: spend ? spend.totalPence / 100 : 0,
        unknownCostItems: spend?.unknown ?? 0,
        quoteReference: quote?.totalPence === undefined ? null : quote.totalPence / 100,
        actualSpend: typeof project.actualSpend === 'number' ? project.actualSpend : null,
      }];
    });

    const reconciliations = accounts.map((account) => {
      const accountTransactions = transactions.filter((transaction) => transaction.accountId === account.id);
      const debit = accountTransactions.filter((transaction) => transaction.direction === 'debit').reduce((sum, transaction) => sum + transaction.amount, 0);
      const credit = accountTransactions.filter((transaction) => transaction.direction === 'credit').reduce((sum, transaction) => sum + transaction.amount, 0);
      const statement = imports.find((item) => item.accountId === account.id && item.openingBalance !== null && item.closingBalance !== null);
      const expectedClosingBalance = statement?.openingBalance === null || statement?.openingBalance === undefined
        ? null
        : statement.openingBalance + credit - debit;
      const mismatch = expectedClosingBalance === null || statement?.closingBalance === null || statement?.closingBalance === undefined
        ? null
        : Number((statement.closingBalance - expectedClosingBalance).toFixed(2));
      return {
        accountId: account.id,
        accountName: account.name,
        openingBalance: statement?.openingBalance ?? account.openingBalance ?? null,
        closingBalance: statement?.closingBalance ?? null,
        expectedClosingBalance,
        mismatch,
        reconciled: mismatch === null ? null : Math.abs(mismatch) < 0.01,
      };
    });

    return NextResponse.json({
      month: key,
      summary: {
        actualIncome,
        actualSpend,
        actualNet: actualIncome - actualSpend,
        transferMovement: transfers,
        plannedIncome,
        plannedExpenses,
        forecastNet: plannedIncome || plannedExpenses ? plannedIncome - plannedExpenses : actualIncome - actualSpend,
      },
      connections: {
        planned: { incomeItems: income.length, expenseItems: expenses.length },
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          institution: account.institution,
          importCount: account._count.imports,
          transactionCount: account._count.transactions,
          lastImportAt: account.imports[0]?.createdAt ?? null,
          statementThrough: account.imports[0]?.statementEnd ?? null,
        })),
        property: { projects, updatedAt: projectDocument?.updatedAt ?? null },
      },
      categorySpend: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
      reconciliations,
      transactions: transactions.map(({ account, ...transaction }) => ({ ...transaction, accountName: account.name })),
    });
  } catch (error) {
    console.error('Cash flow error:', error);
    return NextResponse.json({ error: 'Could not load cash flow.' }, { status: 500 });
  }
});
