import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { buildHistoryForecast } from '@/lib/budget/historyForecast';
import { partitionBudgetRecords } from '@/lib/budget/dataQuality';
import { deduplicateRecurringItems } from '@/utils/budgetMonthFilter';

export const dynamic = 'force-dynamic';

export const GET = requireFamilyAccess(async (request: NextRequest, context) => {
  const { familyId } = await context.params;
  const horizon = Number(new URL(request.url).searchParams.get('months') ?? '6');
  if (![3, 6, 12].includes(horizon)) return NextResponse.json({ error: 'Choose 3, 6 or 12 months.' }, { status: 400 });
  try {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 24, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [accounts, transactions, imports, income, expenses] = await Promise.all([
      prisma.budgetAccount.findMany({ where: { familyId, active: true }, select: { id: true, name: true, currency: true }, orderBy: { name: 'asc' } }),
      prisma.budgetTransaction.findMany({ where: { familyId, account: { active: true }, transactionDate: { gte: start, lt: end } }, select: { accountId: true, transactionDate: true, amount: true, direction: true, transactionType: true } }),
      prisma.statementImport.findMany({ where: { familyId, statementEnd: { gte: start } }, select: { accountId: true, statementStart: true, statementEnd: true } }),
      prisma.budgetIncome.findMany({ where: { familyId } }),
      prisma.budgetExpense.findMany({ where: { familyId } }),
    ]);
    const result = buildHistoryForecast({
      accounts, transactions, imports,
      incomePlans: partitionBudgetRecords(deduplicateRecurringItems(income)).operational,
      expensePlans: partitionBudgetRecords(deduplicateRecurringItems(expenses)).operational,
      referenceDate: now, horizon,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load the history forecast.' }, { status: 500 });
  }
});
