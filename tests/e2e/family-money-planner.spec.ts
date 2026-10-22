import { expect, test, type Page } from "@playwright/test";
import {
  buildMoneyReport,
  emptyMoneyPreferences,
  moneyMerchantKey,
  type MoneyRow,
} from "../../src/lib/budget/moneyPlanner";

const rows: MoneyRow[] = [
  ...["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map(
    (month, index) => ({
      id: `bill-${index}`,
      accountId: "synthetic",
      transactionDate: `${month}-03`,
      amount: 80,
      description: "EDF ENERGY",
      direction: "debit",
      transactionType: "normal",
    }),
  ),
  {
    id: "july",
    accountId: "synthetic",
    transactionDate: "2026-07-08",
    amount: 200,
    description: "Tesco",
    direction: "debit",
    transactionType: "normal",
  },
  {
    id: "august",
    accountId: "synthetic",
    transactionDate: "2026-08-08",
    amount: 150,
    description: "Tesco",
    direction: "debit",
    transactionType: "normal",
  },
  ...["07", "09", "11"].map((day, index) => ({
    id: `grocery-${index}`,
    accountId: "synthetic",
    transactionDate: `2026-09-${day}`,
    amount: 50,
    description: index === 2 ? "Lidl" : "Tesco",
    direction: "debit",
    transactionType: "normal",
  })),
  {
    id: "unknown",
    accountId: "synthetic",
    transactionDate: "2026-09-02",
    amount: 900,
    description: "Monthly payment 12345",
    direction: "debit",
    transactionType: "normal",
    category: "Housing",
  },
  {
    id: "transfer",
    accountId: "synthetic",
    transactionDate: "2026-09-03",
    amount: 300,
    description: "Own account",
    direction: "debit",
    transactionType: "transfer",
  },
  {
    id: "credit",
    accountId: "synthetic",
    transactionDate: "2026-09-01",
    amount: 2000,
    description: "Personal transfer",
    direction: "credit",
    transactionType: "normal",
  },
  {
    id: "october",
    accountId: "synthetic",
    transactionDate: "2026-10-12",
    amount: 20,
    description: "Lidl",
    direction: "debit",
    transactionType: "normal",
  },
];

async function setup(page: Page) {
  const preferences = emptyMoneyPreferences();
  let failLoad = false,
    failSave = false,
    saves = 0;
  const family = {
    id: "planner-fixture",
    familyName: "Synthetic rehearsal",
    familyCode: "planner",
    members: [],
  };
  await page.clock.setFixedTime(new Date("2026-10-22T12:00:00Z"));
  await page.route("**/api/families/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/families", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([family]),
    }),
  );
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "synthetic-user", email: "fixture@example.test" },
        family: null,
        familyMember: null,
        needsOnboarding: false,
      }),
    }),
  );
  await page.route(
    "**/api/families/*/budget/money-planner**",
    async (route) => {
      if (route.request().method() === "PUT") {
        if (failSave)
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Synthetic save failed. Retry without losing your choice.",
            }),
          });
        const action = route.request().postDataJSON();
        if (action.action === "target")
          preferences.targets[action.category] = {
            amount: action.amount,
            baselineMonth: action.month,
            baselineAmount: 150,
            createdAt: "2026-10-22",
          };
        if (action.action === "dismiss")
          preferences.dismissed.push(action.insightId);
        if (action.action === "restore")
          preferences.dismissed = preferences.dismissed.filter(
            (id) => id !== action.insightId,
          );
        if (action.action === "remove-target")
          delete preferences.targets[action.category];
        if (action.action === "assign") {
          const row = rows.find((item) => item.id === action.transactionId)!;
          const assignment = { category: action.category, kind: action.kind };
          preferences.overrides[row.id] = assignment;
          if (action.applyToGroup)
            preferences.rules[
              moneyMerchantKey(row.accountId, row.description)
            ] = assignment;
        }
        saves++;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ preferences }),
        });
      }
      if (failLoad)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Synthetic bank activity unavailable",
          }),
        });
      const month = new URL(route.request().url()).searchParams.get("month")!;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          report: buildMoneyReport({
            month,
            now: "2026-10-22",
            accountIds: ["synthetic"],
            transactions: rows,
            imports: [
              {
                accountId: "synthetic",
                statementStart: "2026-04-01",
                statementEnd: "2026-10-20",
              },
            ],
            preferences,
          }),
          preferences,
          accounts: [{ id: "synthetic", name: "Synthetic bank" }],
        }),
      });
    },
  );
  await page.addInitScript(() => {
    localStorage.setItem("familyHub_setupComplete", "skipped");
    localStorage.setItem("familyId", "planner-fixture");
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=budget");
  await openMonthlyReview(page);
  await expect(
    page.getByRole("heading", { name: "Where your money went" }),
  ).toBeVisible({ timeout: 25_000 });
  await expect(
    page.getByText("September 2026 · Full imported month"),
  ).toBeVisible();
  return {
    preferences,
    get saves() {
      return saves;
    },
    failLoad: (value: boolean) => {
      failLoad = value;
    },
    failSave: (value: boolean) => {
      failSave = value;
    },
  };
}

async function openMonthlyReview(page: Page) {
  await page.getByText(/^Monthly review ·/).click();
  await expect(page.getByRole('heading', { name: 'Where your money went' })).toBeVisible();
  await page.getByText('Optional patterns and savings scenarios', { exact: true }).click();
}

test("planner compares three months, identifies pressure without invented savings, and retains household targets", async ({
  page,
}) => {
  const fixture = await setup(page);
  const planner = page.getByRole("region", { name: "Where your money went" });
  await expect(
    page.getByRole("heading", { name: "Family Money Planner" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Scan Receipt", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Import Statement", exact: true })).toBeVisible();
  await expect(planner.getByText("£1,430.00", { exact: true })).toBeVisible();
  const comparison = page.getByRole("region", {
    name: "Three-month category comparison",
  });
  await expect(comparison.getByText("£200.00", { exact: true })).toBeVisible();
  await expect(comparison.getByText("£150.00", { exact: true })).toHaveCount(2);
  await expect(
    comparison.getByText("Housing", { exact: true }),
  ).not.toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Money out timeline" })
      .locator("path.recharts-area-area"),
  ).toBeVisible();
  await expect(
    page.getByText("Several grocery payment dates", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/not visits or avoidable spending/),
  ).toBeVisible();
  await expect(page.getByText(/verified saving/).first()).not.toBeVisible();

  await page
    .getByRole("button", { name: "Set spending target", exact: true })
    .click();
  const form = page.getByRole("form", { name: "Set category target" });
  await form.getByRole("combobox").selectOption("Groceries");
  await form.getByLabel("Monthly target amount").fill("100");
  await expect(form.getByText(/Potential reduction: £50.00/)).toBeVisible();
  await form.getByRole("button", { name: "Save target" }).click();
  await expect(
    page.getByText("Groceries · £100.00 monthly target"),
  ).toBeVisible();
  expect(fixture.preferences.targets.Groceries.amount).toBe(100);
  await page.reload();
  await openMonthlyReview(page);
  await expect(
    page.getByText("Groceries · £100.00 monthly target"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Dismiss Several grocery payment dates" })
    .click();
  await expect(
    page.getByText("Several grocery payment dates", { exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await openMonthlyReview(page);
  await expect(
    page.getByText("Groceries · £100.00 monthly target"),
  ).toBeVisible();
  await expect(
    page.getByText("Several grocery payment dates", { exact: true }),
  ).not.toBeVisible();
  expect(fixture.saves).toBe(2);
  await page
    .getByRole("heading", { name: "Where your money went" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "output/playwright/family-money-planner-desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Family Money Planner" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .getByRole("heading", { name: "Where your money went" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "output/playwright/family-money-planner-phone.png",
    fullPage: false,
  });
});

test("payment review remembers exact account-scoped choices and failed saves preserve input", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.getByRole("button", { name: "Check missing categories" }).click();
  await page.getByLabel("Search planner payments").fill("Monthly payment");
  await page
    .getByRole("button", { name: "Categorise Monthly payment 12345" })
    .click();
  const form = page.getByRole("form", { name: "Confirm payment category" });
  await form.getByLabel("Confirm category").selectOption("Housing");
  fixture.failSave(true);
  await form
    .getByRole("button", { name: "Confirm category", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic save failed. Retry without losing your choice."),
  ).toBeVisible();
  await expect(form.getByLabel("Confirm category")).toHaveValue("Housing");
  fixture.failSave(false);
  await form
    .getByRole("button", { name: "Confirm category", exact: true })
    .click();
  await expect(
    page.getByText("Category confirmed. Raw bank amounts are unchanged."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Three-month category comparison" })
      .getByText("Housing", { exact: true }),
  ).toBeVisible();
  expect(
    fixture.preferences.rules[
      moneyMerchantKey("synthetic", "Monthly payment 12345")
    ],
  ).toEqual({ category: "Housing", kind: "spend" });
  expect(rows.find((row) => row.id === "unknown")?.amount).toBe(900);
  await page.reload();
  await openMonthlyReview(page);
  await page.getByLabel("Search planner payments").fill("Monthly payment");
  await expect(
    page.getByText(/Housing · Confirmed by household/),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("region", { name: "Review payments" })
    .scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(
    page.getByRole("button", { name: "Categorise Monthly payment 12345" }),
  ).toBeVisible();
});

test("partial and unavailable months do not invent comparisons, targets or stale values", async ({
  page,
}) => {
  const fixture = await setup(page);
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(
    page.getByText("October 2026 · Partial imported month"),
  ).toBeVisible();
  await page.getByText("Optional patterns and savings scenarios", { exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Three-month category comparison" })
      .getByText("Comparable full months needed")
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Set spending target" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(
    page.getByText("November 2026 · No imported coverage"),
  ).toBeVisible();
  const planner = page.getByRole("region", { name: "Where your money went" });
  await expect(
    planner.getByText("Unavailable", { exact: true }).first(),
  ).toBeVisible();
  fixture.failLoad(true);
  await page.getByRole("button", { name: "Refresh money planner" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Synthetic bank activity unavailable" }),
  ).toBeVisible();
  await expect(planner.getByText("£20.00", { exact: true })).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Three-month category comparison" }),
  ).not.toBeVisible();
});
