import prisma from "@/lib/prisma";
import { buildRecentSpending, recentSpendingRange } from "./recentSpending";
import { paymentHistoryStart } from './paymentPatterns';
import {
  MONEY_PREFERENCES_KEY,
  readMoneyPreferences,
} from "./moneyPlannerService";

export async function loadRecentSpending(
  familyId: string,
  days: number,
  referenceDate?: string,
) {
  const range = recentSpendingRange(days, referenceDate);
  const start = new Date(`${[range.previousStart, paymentHistoryStart(range.end)].sort()[0]}T00:00:00Z`);
  const end = new Date(`${range.end}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const [accounts, rows, imports, document] = await Promise.all([
    prisma.budgetAccount.findMany({
      where: { familyId, active: true, currency: "GBP" },
      select: { id: true, name: true },
    }),
    prisma.budgetTransaction.findMany({
      where: {
        familyId,
        account: { active: true, currency: "GBP" },
        transactionDate: { gte: start, lt: end },
      },
      select: {
        id: true,
        accountId: true,
        transactionDate: true,
        description: true,
        amount: true,
        direction: true,
        transactionType: true,
        category: true,
      },
      orderBy: [{ transactionDate: "desc" }, { id: "asc" }],
    }),
    prisma.statementImport.findMany({
      where: {
        familyId,
        account: { active: true, currency: "GBP" },
        statementStart: { lt: end },
        statementEnd: { gte: start },
      },
      select: { accountId: true, statementStart: true, statementEnd: true },
    }),
    prisma.familyDocument.findUnique({
      where: { familyId_key: { familyId, key: MONEY_PREFERENCES_KEY } },
      select: { data: true },
    }),
  ]);
  return {
    report: buildRecentSpending({
      days,
      referenceDate,
      accountIds: accounts.map((account) => account.id),
      preferences: readMoneyPreferences(document?.data),
      transactions: rows.map((row) => ({
        ...row,
        transactionDate: row.transactionDate.toISOString(),
      })),
      imports: imports.map((row) => ({
        ...row,
        statementStart: row.statementStart?.toISOString() ?? null,
        statementEnd: row.statementEnd?.toISOString() ?? null,
      })),
    }),
    accounts,
  };
}
