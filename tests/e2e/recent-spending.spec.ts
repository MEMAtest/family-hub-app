import { expect, test } from "@playwright/test";
import { buildRecentSpending } from "../../src/lib/budget/recentSpending";
import {
  emptyMoneyPreferences,
  type MoneyRow,
} from "../../src/lib/budget/moneyPlanner";

test("recent actual spending supports presets, custom days, reload and phone without future savings claims", async ({
  page,
}) => {
  const accountId = "synthetic";
  const transaction = (
    id: string,
    transactionDate: string,
    amount: number,
    description = "Tesco",
    transactionType = "normal",
    direction = "debit",
  ): MoneyRow => ({
    id,
    transactionDate,
    amount,
    description,
    transactionType,
    direction,
    accountId,
  });
  const rows = [
    transaction("today", "2026-10-22", 15.1),
    transaction("week", "2026-10-18", 20.2, "Lidl"),
    transaction("unknown", "2026-10-01", 100, "Payment purpose unclear"),
    transaction("transfer", "2026-09-30", 200, "Own account", "transfer"),
    transaction("boundary", "2026-09-23", 60),
    transaction("prior", "2026-09-22", 70),
    transaction("older", "2026-08-30", 100, "Octopus Energy"),
    transaction(
      "incoming",
      "2026-10-22",
      300,
      "Personal incoming",
      "normal",
      "credit",
    ),
  ];
  const family = {
    id: "recent-fixture",
    familyName: "Synthetic rehearsal",
    familyCode: "recent",
    members: [],
  };
  let fail = false, disconnected = false,
    partial = false;
  const requests: number[] = [];
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
  await page.route("**/api/families/*/budget/recent-spending**", (route) => {
    const days = Number(
      new URL(route.request().url()).searchParams.get("days"),
    );
    requests.push(days);
    if (disconnected) return route.abort('internetdisconnected');
    if (fail)
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Synthetic recent spending unavailable",
        }),
      });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        report: buildRecentSpending({
          days,
          referenceDate: "2026-10-22T12:00:00Z",
          accountIds: [accountId],
          transactions: rows,
          preferences: emptyMoneyPreferences(),
          imports: [
            {
              accountId,
              statementStart: "2026-01-01",
              statementEnd: partial ? "2026-10-20" : "2026-10-22",
            },
          ],
        }),
        accounts: [{ id: accountId, name: "Synthetic bank" }],
      }),
    });
  });
  let failInsights = false;
  await page.route('**/budget/recent-insights', route => route.fulfill(failInsights ? { status: 503, json: { error: 'Synthetic AI unavailable; verified facts remain.' } } : { json: { actions: [{ factId: 'review', action: 'Check the payment purpose before setting a target.' }] } }));
  await page.addInitScript(() => {
    localStorage.setItem("familyHub_setupComplete", "skipped");
    localStorage.setItem("familyId", "recent-fixture");
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=budget");
  const recent = page.getByRole("region", { name: /^Spending in the last/ });
  await expect(
    recent.getByRole("heading", { name: "Spending in the last 30 days" }),
  ).toBeVisible({ timeout: 25_000 });
  await expect(recent.getByText("£395.30", { exact: true }).first()).toBeVisible();
  await expect(
    recent.getByText("£95.30", { exact: true }).first(),
  ).toBeVisible();
  await expect(recent.getByText("£200.00", { exact: true }).first()).toBeVisible();
  await expect(
    recent.getByText("Full imported coverage for this period."),
  ).toBeVisible();
  await recent.getByRole('button', { name: 'Suggest next steps' }).click();
  await expect(recent.getByText('Check the payment purpose before setting a target.')).toBeVisible();
  failInsights = true;
  await recent.getByRole('button', { name: 'Suggest next steps' }).click();
  await expect(recent.getByRole('alert')).toHaveText('Synthetic AI unavailable; verified facts remain.');
  await expect(recent.getByText('Start with the payments we cannot explain yet')).toBeVisible();
  await recent.getByRole('button', { name: /Groceries/ }).click();
  await expect(recent.getByLabel('Recent payment category')).toHaveValue('Groceries');
  await recent.getByLabel('Search recent payments').fill('Lidl');
  await expect(recent.getByText('Lidl', { exact: true })).toBeVisible();
  await expect(recent.getByText('Tesco', { exact: true })).not.toBeVisible();
  await recent.getByLabel('Search recent payments').fill('');
  await expect(
    page.getByRole("heading", { name: "Where your money went" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What could we change?" }),
  ).not.toBeVisible();
  await page.getByLabel("Spending period", { exact: true }).selectOption("7");
  await expect(
    recent.getByRole("heading", { name: "Spending in the last 7 days" }),
  ).toBeVisible();
  await expect(
    recent.getByText("£35.30", { exact: true }).first(),
  ).toBeVisible();
  await expect(recent.getByText("£395.30", { exact: true })).not.toBeVisible();
  await expect(recent.getByText('Household bills', { exact: true })).not.toBeVisible();
  await page.getByLabel("Spending period", { exact: true }).selectOption("custom");
  await page.getByLabel("Number of spending days").fill("1");
  await page
    .getByRole("form", { name: "Custom spending period" })
    .getByRole("button", { name: "Apply", exact: true })
    .click();
  await expect(
    recent.getByRole("heading", { name: "Spending in the last 1 day" }),
  ).toBeVisible();
  await expect(
    recent.getByText("£15.10", { exact: true }).first(),
  ).toBeVisible();
  await expect(recent.getByRole('button', { name: /Groceries/ })).toBeVisible();
  const count = requests.length;
  await page.getByLabel("Number of spending days").fill("0");
  await page
    .getByRole("form", { name: "Custom spending period" })
    .getByRole("button", { name: "Apply", exact: true })
    .click();
  expect(requests.length).toBe(count);
  await page.getByLabel("Spending period", { exact: true }).selectOption("90");
  await expect(recent.getByText("£565.30", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(
    recent.getByRole("heading", { name: "Spending in the last 90 days" }),
  ).toBeVisible();
  await expect(recent.getByText("£565.30", { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .getByRole("heading", { name: "Spending in the last 90 days" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "output/playwright/recent-spending-phone.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("heading", { name: "Spending in the last 90 days" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "output/playwright/recent-spending-desktop.png",
    fullPage: false,
  });
  partial = true;
  await page.getByRole("button", { name: "Refresh recent spending" }).click();
  await expect(recent.getByText(/Partial bank coverage/)).toBeVisible();
  await expect(recent.getByText(/than the previous 90 days/)).not.toBeVisible();
  fail = true;
  await page.getByRole("button", { name: "Refresh recent spending" }).click();
  await expect(recent.getByRole("alert")).toHaveText(
    "Synthetic recent spending unavailable",
  );
  await expect(recent.getByText("£565.30", { exact: true })).not.toBeVisible();
  fail = false;
  disconnected = true;
  await page.getByRole('button', { name: 'Refresh recent spending' }).click();
  await expect(recent.getByRole('alert')).toHaveText('Could not connect to your spending data. Refresh to try again.');
  await expect(recent.getByText('£565.30', { exact: true })).not.toBeVisible();
  disconnected = false;
  await page.getByRole('button', { name: 'Refresh recent spending' }).click();
  await expect(recent.getByText('£565.30', { exact: true }).first()).toBeVisible();
});
