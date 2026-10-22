jest.mock("@/lib/auth-utils", () => ({
  requireFamilyAccess: (handler: unknown) => handler,
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    budgetTransaction: { findFirst: jest.fn() },
    familyDocument: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/budget/moneyPlannerService", () => ({
  MONEY_PREFERENCES_KEY: "money.planner.preferences",
  validMoneyMonth: (value: unknown) =>
    typeof value === "string" && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value),
  loadMoneyPlanner: jest.fn(),
  readMoneyPreferences: (value: unknown) =>
    value ?? { overrides: {}, rules: {}, targets: {}, dismissed: [] },
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: unknown }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers,
    }),
  },
}));
import { GET, PUT } from "./route";
import prisma from "@/lib/prisma";
import { loadMoneyPlanner } from "@/lib/budget/moneyPlannerService";
import {
  emptyMoneyPreferences,
  moneyMerchantKey,
} from "@/lib/budget/moneyPlanner";
const context = { params: Promise.resolve({ familyId: "home" }) };
const put = (body: unknown) =>
  (PUT as any)({ json: async () => body }, context, {
    familyMemberId: "parent",
  });
beforeEach(() => {
  jest.clearAllMocks();
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.familyDocument.create as jest.Mock).mockResolvedValue({});
  (prisma.familyDocument.updateMany as jest.Mock).mockResolvedValue({
    count: 1,
  });
  (prisma.budgetTransaction.findFirst as jest.Mock).mockResolvedValue({
    accountId: "bank",
    description: "Tesco",
    direction: "debit",
    transactionType: "normal",
  });
  (loadMoneyPlanner as jest.Mock).mockResolvedValue({
    preferences: emptyMoneyPreferences(),
    report: {
      months: [
        {
          month: "2026-09",
          coverage: "complete",
          categories: [{ category: "Groceries", amount: 120 }],
        },
      ],
    },
  });
});

test("GET validates month and calls household-scoped loader with no-store", async () => {
  expect(
    (await (GET as any)({ url: "http://localhost/?month=2026-13" }, context))
      .status,
  ).toBe(400);
  const response = await (GET as any)(
    { url: "http://localhost/?month=2026-09" },
    context,
  );
  expect(loadMoneyPlanner).toHaveBeenCalledWith("home", "2026-09");
  expect(response.headers["Cache-Control"]).toBe("private, no-store");
});
test("GET failure returns unavailable rather than snapshot or plan totals", async () => {
  (loadMoneyPlanner as jest.Mock).mockRejectedValue(new Error("down"));
  expect(
    (await (GET as any)({ url: "http://localhost/?month=2026-09" }, context))
      .status,
  ).toBe(503);
});
test("confirms one transaction and optionally remembers its account-scoped rule without touching ledger", async () => {
  const response = await put({
    action: "assign",
    transactionId: "row",
    category: "Groceries",
    kind: "spend",
    applyToGroup: true,
  });
  expect(response.status).toBe(200);
  expect(prisma.budgetTransaction.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        id: "row",
        familyId: "home",
        account: { active: true, currency: "GBP" },
      },
    }),
  );
  expect(
    response.body.preferences.rules[moneyMerchantKey("bank", "Tesco")],
  ).toEqual({ category: "Groceries", kind: "spend" });
  expect(response.body.preferences.overrides.row).toEqual({
    category: "Groceries",
    kind: "spend",
  });
});
test("rejects inaccessible rows, contradictory direction and already recorded transfers", async () => {
  (prisma.budgetTransaction.findFirst as jest.Mock).mockResolvedValueOnce(null);
  expect(
    (
      await put({
        action: "assign",
        transactionId: "other-family",
        category: "Groceries",
        kind: "spend",
        applyToGroup: true,
      })
    ).status,
  ).toBe(404);
  expect(
    (
      await put({
        action: "assign",
        transactionId: "row",
        category: "Income",
        kind: "income",
        applyToGroup: false,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await put({
        action: "assign",
        transactionId: "row",
        category: "Income",
        kind: "spend",
        applyToGroup: false,
      })
    ).status,
  ).toBe(400);
  (prisma.budgetTransaction.findFirst as jest.Mock).mockResolvedValueOnce({
    accountId: "bank",
    description: "Transfer",
    direction: "debit",
    transactionType: "transfer",
  });
  expect(
    (
      await put({
        action: "assign",
        transactionId: "row",
        category: "Groceries",
        kind: "spend",
        applyToGroup: false,
      })
    ).status,
  ).toBe(409);
  expect(prisma.familyDocument.create).not.toHaveBeenCalled();
});
test("target baseline comes from server report, not client-provided totals", async () => {
  const response = await put({
    action: "target",
    category: "Groceries",
    amount: 100,
    month: "2026-09",
  });
  expect(response.status).toBe(200);
  expect(response.body.preferences.targets.Groceries).toMatchObject({
    amount: 100,
    baselineAmount: 120,
    baselineMonth: "2026-09",
  });
  expect(
    (
      await put({
        action: "target",
        category: "Groceries",
        amount: 130,
        month: "2026-09",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await put({
        action: "target",
        category: "Groceries",
        amount: 100,
        month: "2026-09",
        baselineAmount: 10000,
      })
    ).status,
  ).toBe(400);
});
test("partial months cannot become savings baselines", async () => {
  (loadMoneyPlanner as jest.Mock).mockResolvedValue({
    report: {
      months: [
        {
          month: "2026-09",
          coverage: "partial",
          categories: [{ category: "Groceries", amount: 120 }],
        },
      ],
    },
  });
  expect(
    (
      await put({
        action: "target",
        category: "Groceries",
        amount: 90,
        month: "2026-09",
      })
    ).status,
  ).toBe(409);
});
test("version conflict retries merge with latest household edits and deduplicates dismissals", async () => {
  const preferences = emptyMoneyPreferences();
  (prisma.familyDocument.findUnique as jest.Mock)
    .mockResolvedValueOnce({ version: 1, data: preferences })
    .mockResolvedValueOnce({
      version: 2,
      data: { ...preferences, dismissed: ["already-hidden"] },
    });
  (prisma.familyDocument.updateMany as jest.Mock)
    .mockResolvedValueOnce({ count: 0 })
    .mockResolvedValueOnce({ count: 1 });
  const response = await put({
    action: "dismiss",
    insightId: "already-hidden",
  });
  expect(response.body.preferences.dismissed).toEqual(["already-hidden"]);
  expect(prisma.familyDocument.updateMany).toHaveBeenLastCalledWith(
    expect.objectContaining({
      where: { familyId: "home", key: "money.planner.preferences", version: 2 },
    }),
  );
});
test("conflict exhaustion and failed persistence are not reported as saved", async () => {
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({
    version: 1,
    data: emptyMoneyPreferences(),
  });
  (prisma.familyDocument.updateMany as jest.Mock).mockResolvedValue({
    count: 0,
  });
  expect((await put({ action: "dismiss", insightId: "one" })).status).toBe(409);
  (prisma.familyDocument.findUnique as jest.Mock).mockRejectedValue(
    new Error("unavailable"),
  );
  expect((await put({ action: "dismiss", insightId: "one" })).status).toBe(503);
});
