jest.mock("@/lib/auth-utils", () => ({
  requireFamilyAccess: (handler: unknown) => handler,
}));
jest.mock("@/lib/budget/recentSpendingService", () => ({
  loadRecentSpending: jest.fn(),
}));
jest.mock("@/services/aiService", () => ({
  aiService: { suggestSpendingActions: jest.fn() },
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
import { POST } from "./route";
import { loadRecentSpending } from "@/lib/budget/recentSpendingService";
import { aiService } from "@/services/aiService";
import { buildRecentSpending } from "@/lib/budget/recentSpending";
import { emptyMoneyPreferences } from "@/lib/budget/moneyPlanner";
const context = { params: Promise.resolve({ familyId: "household" }) };
const post = (value: unknown) =>
  (POST as any)({ json: async () => value }, context);
beforeEach(() => {
  jest.clearAllMocks();
  (loadRecentSpending as jest.Mock).mockResolvedValue({
    report: buildRecentSpending({
      days: 7,
      referenceDate: "2026-10-23",
      accountIds: ["private-bank-id"],
      transactions: [
        {
          id: "secret-row-id",
          accountId: "private-bank-id",
          amount: 15,
          description: "Private payer reference",
          direction: "debit",
          transactionType: "normal",
          transactionDate: "2026-10-22",
        },
      ],
      imports: [],
      preferences: emptyMoneyPreferences(),
    }),
  });
  (aiService.suggestSpendingActions as jest.Mock).mockResolvedValue([
    { factId: "review", action: "Confirm what this payment was for." },
  ]);
});
test.each([0, 366, -1, 1.5, "7", null])(
  "rejects invalid days %s before provider or database access",
  async (days) => {
    expect((await post({ days })).status).toBe(400);
    expect(loadRecentSpending).not.toHaveBeenCalled();
    expect(aiService.suggestSpendingActions).not.toHaveBeenCalled();
  },
);
test("uses server-owned household data, only sending aggregates, never raw bank narratives or IDs", async () => {
  const result = await post({
    days: 7,
    familyId: "attacker",
    report: { summary: { outgoing: 999999 } },
  });
  expect(result.status).toBe(200);
  expect(result.headers["Cache-Control"]).toBe("private, no-store");
  expect(loadRecentSpending).toHaveBeenCalledWith("household", 7);
  const prompt = JSON.stringify(
    (aiService.suggestSpendingActions as jest.Mock).mock.calls[0],
  );
  expect(prompt).toContain("£15.00");
  for (const secret of [
    "Private payer reference",
    "private-bank-id",
    "secret-row-id",
    "999999",
  ])
    expect(prompt).not.toContain(secret);
});
test("provider failure is unavailable rather than invented or silently substituted AI advice", async () => {
  (aiService.suggestSpendingActions as jest.Mock).mockRejectedValue(
    new Error("provider unavailable"),
  );
  const result = await post({ days: 7 });
  expect(result.status).toBe(503);
  expect(result.body.error).toContain("verified spending observations");
});
