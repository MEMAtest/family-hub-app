import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

const asMonthRange = (value: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)) : new Date();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end, key: start.toISOString().slice(0, 7) };
};

const isInMonth = (value: Date | null, start: Date, end: Date) =>
  Boolean(value && value >= start && value < end);

const plannedForMonth = (item: { isRecurring: boolean; paymentDate: Date | null; recurringStartDate?: Date | null; recurringEndDate?: Date | null }, start: Date, end: Date) => {
  if (!item.isRecurring) return isInMonth(item.paymentDate, start, end);
  if (item.recurringStartDate && item.recurringStartDate >= end) return false;
  if (item.recurringEndDate && item.recurringEndDate < start) return false;
  return true;
};

export const GET = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const { start, end, key } = asMonthRange(new URL(request.url).searchParams.get('month'));
    const [accounts, transactions, income, expenses, imports] = await Promise.all([
      prisma.budgetAccount.findMany({ where: { familyId, active: true }, orderBy: { name: 'asc' } }),
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
      .filter((item) => plannedForMonth(item, start, end))
      .reduce((total, item) => total + item.amount, 0);
    const plannedExpenses = expenses
      .filter((item) => plannedForMonth(item, start, end))
      .reduce((total, item) => total + item.amount, 0);

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
        forecastNet: actualIncome - actualSpend + plannedIncome - plannedExpenses,
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
