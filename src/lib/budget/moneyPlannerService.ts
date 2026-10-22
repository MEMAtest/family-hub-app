import prisma from "@/lib/prisma";
import { z } from "zod";
import {
  buildMoneyReport,
  emptyMoneyPreferences,
  MONEY_CATEGORIES,
  type MoneyPreferences,
} from "./moneyPlanner";

export const MONEY_PREFERENCES_KEY = "money.planner.preferences";

export function validMoneyMonth(value: string | null): value is string {
  return Boolean(value && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value));
}

const assignmentSchema = z.object({
  category: z.string().refine((value) => MONEY_CATEGORIES.includes(value)),
  kind: z.enum(["spend", "income", "refund", "transfer", "review"]),
});
const targetSchema = z.object({
  amount: z.number().finite().nonnegative(),
  baselineMonth: z.string().refine((value) => validMoneyMonth(value)),
  baselineAmount: z.number().finite().positive(),
  createdAt: z.string().min(1),
});
const preferencesSchema = z.object({
  overrides: z.record(assignmentSchema).optional(),
  rules: z.record(assignmentSchema).optional(),
  targets: z.record(targetSchema).optional(),
  dismissed: z.array(z.string()).optional(),
});

export function readMoneyPreferences(value: unknown): MoneyPreferences {
  if (value === null || value === undefined) return emptyMoneyPreferences();
  const parsed = preferencesSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Saved money preferences need repair; do not overwrite them.",
    );
  return { ...emptyMoneyPreferences(), ...parsed.data };
}

export async function loadMoneyPlanner(
  familyId: string,
  month: string,
  supplied?: MoneyPreferences,
) {
  const end = new Date(`${month}-01T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const start = new Date(`${month}-01T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 5);
  const [accounts, transactions, imports, document] = await Promise.all([
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
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
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
    supplied
      ? Promise.resolve(null)
      : prisma.familyDocument.findUnique({
          where: { familyId_key: { familyId, key: MONEY_PREFERENCES_KEY } },
          select: { data: true },
        }),
  ]);
  const preferences = supplied ?? readMoneyPreferences(document?.data);
  const report = buildMoneyReport({
    month,
    accountIds: accounts.map((account) => account.id),
    preferences,
    transactions: transactions.map((row) => ({
      ...row,
      transactionDate: row.transactionDate.toISOString(),
    })),
    imports: imports.map((row) => ({
      ...row,
      statementStart: row.statementStart?.toISOString() ?? null,
      statementEnd: row.statementEnd?.toISOString() ?? null,
    })),
  });
  return { report, preferences, accounts };
}
