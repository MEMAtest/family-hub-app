import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireFamilyAccess } from "@/lib/auth-utils";
import {
  MONEY_CATEGORIES,
  moneyMerchantKey,
  type MoneyPreferences,
} from "@/lib/budget/moneyPlanner";
import {
  loadMoneyPlanner,
  MONEY_PREFERENCES_KEY,
  readMoneyPreferences,
  validMoneyMonth,
} from "@/lib/budget/moneyPlannerService";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const category = z
  .string()
  .max(80)
  .refine((value) => MONEY_CATEGORIES.includes(value));
const token = z.string().min(1).max(240);
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("assign"),
      transactionId: token,
      category,
      kind: z.enum(["spend", "income", "refund", "transfer", "review"]),
      applyToGroup: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("target"),
      category,
      amount: z.number().finite().min(0).max(1_000_000),
      month: z.string().refine((value) => validMoneyMonth(value)),
    })
    .strict(),
  z.object({ action: z.literal("remove-target"), category }).strict(),
  z.object({ action: z.literal("dismiss"), insightId: token }).strict(),
  z.object({ action: z.literal("restore"), insightId: token }).strict(),
]);

export const GET = requireFamilyAccess(
  async (request: NextRequest, context) => {
    const { familyId } = await context.params;
    const month = new URL(request.url).searchParams.get("month");
    if (!validMoneyMonth(month))
      return NextResponse.json(
        { error: "Choose a valid month." },
        { status: 400, headers },
      );
    try {
      return NextResponse.json(await loadMoneyPlanner(familyId, month), {
        headers,
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not load the family money planner. No saved figures have been substituted.",
        },
        { status: 503, headers },
      );
    }
  },
);

export const PUT = requireFamilyAccess(
  async (request: NextRequest, context, auth) => {
    const { familyId } = await context.params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Check the money-planner change and try again." },
        { status: 400, headers },
      );
    const action = parsed.data;
    try {
      const transaction =
        action.action === "assign"
          ? await prisma.budgetTransaction.findFirst({
              where: {
                id: action.transactionId,
                familyId,
                account: { active: true, currency: "GBP" },
              },
              select: {
                accountId: true,
                description: true,
                transactionType: true,
                direction: true,
              },
            })
          : null;
      if (action.action === "assign") {
        if (!transaction)
          return NextResponse.json(
            { error: "That transaction is not available in this household." },
            { status: 404, headers },
          );
        if (
          transaction.transactionType === "transfer" &&
          action.kind !== "transfer"
        )
          return NextResponse.json(
            {
              error:
                "This is an already matched transfer. Its bank reconciliation must be corrected before changing its type.",
            },
            { status: 409, headers },
          );
        const validKind =
          ["debit", "credit"].includes(transaction.direction) &&
          (action.kind === "review" ||
            action.kind === "transfer" ||
            (transaction.direction === "debit"
              ? action.kind === "spend"
              : ["income", "refund"].includes(action.kind)));
        const validCategory =
          action.kind === "spend"
            ? !["Income", "Refunds", "Transfers", "Needs review"].includes(
                action.category,
              )
            : action.category ===
              (
                {
                  income: "Income",
                  refund: "Refunds",
                  transfer: "Transfers",
                  review: "Needs review",
                } as Record<string, string>
              )[action.kind];
        if (!validKind || !validCategory)
          return NextResponse.json(
            {
              error: "The category must match the payment direction and type.",
            },
            { status: 400, headers },
          );
      }
      for (let attempt = 0; attempt < 4; attempt++) {
        const row = await prisma.familyDocument.findUnique({
          where: { familyId_key: { familyId, key: MONEY_PREFERENCES_KEY } },
        });
        const current = readMoneyPreferences(row?.data);
        const next: MoneyPreferences = {
          overrides: { ...current.overrides },
          rules: { ...current.rules },
          targets: { ...current.targets },
          dismissed: [...current.dismissed],
        };
        if (action.action === "assign" && transaction) {
          const value = { category: action.category, kind: action.kind };
          if (action.applyToGroup)
            next.rules[
              moneyMerchantKey(transaction.accountId, transaction.description)
            ] = value;
          next.overrides[action.transactionId] = value;
        } else if (action.action === "target") {
          const { report } = await loadMoneyPlanner(
            familyId,
            action.month,
            current,
          );
          const month = report.months.find(
            (item) => item.month === action.month,
          );
          if (
            month?.coverage !== "complete" ||
            action.month >= new Date().toISOString().slice(0, 7)
          )
            return NextResponse.json(
              {
                error: "Use a complete, finished month as the target baseline.",
              },
              { status: 409, headers },
            );
          const baselineAmount = month.categories.find(
            (item) => item.category === action.category,
          )?.amount;
          if (
            baselineAmount === undefined ||
            baselineAmount <= 0 ||
            action.amount > baselineAmount
          )
            return NextResponse.json(
              {
                error:
                  "Choose a target between zero and this category baseline.",
              },
              { status: 400, headers },
            );
          next.targets[action.category] = {
            amount: Math.round(action.amount * 100) / 100,
            baselineAmount,
            baselineMonth: action.month,
            createdAt: new Date().toISOString(),
          };
        } else if (action.action === "remove-target")
          delete next.targets[action.category];
        else if (action.action === "dismiss")
          next.dismissed = [
            ...new Set([...next.dismissed, action.insightId]),
          ].slice(-500);
        else if (action.action === "restore")
          next.dismissed = next.dismissed.filter(
            (id) => id !== action.insightId,
          );
        if (!row) {
          try {
            await prisma.familyDocument.create({
              data: {
                familyId,
                key: MONEY_PREFERENCES_KEY,
                data: next,
                updatedBy: auth.familyMemberId,
              },
            });
            return NextResponse.json({ preferences: next }, { headers });
          } catch (error) {
            if ((error as { code?: string }).code !== "P2002") throw error;
          }
        } else {
          const write = await prisma.familyDocument.updateMany({
            where: {
              familyId,
              key: MONEY_PREFERENCES_KEY,
              version: row.version,
            },
            data: {
              data: next,
              version: { increment: 1 },
              updatedBy: auth.familyMemberId,
            },
          });
          if (write.count === 1)
            return NextResponse.json({ preferences: next }, { headers });
        }
      }
      return NextResponse.json(
        { error: "The planner changed on another device. Refresh and retry." },
        { status: 409, headers },
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not save this change. Your bank transactions are unchanged.",
        },
        { status: 503, headers },
      );
    }
  },
);
