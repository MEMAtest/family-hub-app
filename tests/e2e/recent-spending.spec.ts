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
  const preferences = emptyMoneyPreferences();
  let failSave = false;
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
    transaction("bill-aug", "2026-08-01", 10, "Direct Debit Netflix"),
    transaction("bill-jul", "2026-07-01", 9, "Direct Debit Netflix"),
    transaction("bill-jun", "2026-06-01", 9, "Direct Debit Netflix"),
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
          preferences,
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
  await page.route('**/api/families/*/budget/money-planner', async route => {
    if (failSave) return route.fulfill({ status: 503, json: { error: 'Synthetic category save failed.' } });
    const action = route.request().postDataJSON();
    preferences.overrides[action.transactionId] = { category: action.category, kind: action.kind };
    return route.fulfill({ json: { preferences } });
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
  const ledger = page.getByRole('dialog');
  const close = async () => { await ledger.getByRole('button', { name: 'Close payment details' }).click(); await expect(ledger).not.toBeVisible(); };
  await recent.getByRole('button', { name: 'Months', exact: true }).click();
  await expect(recent.getByRole('region', { name: 'Calendar month money chart' })).toBeVisible();
  expect(await recent.getByRole('region', { name: 'Calendar month money chart' }).locator('.recharts-bar-rectangle').count()).toBeGreaterThan(0);
  await recent.getByRole('button', { name: 'Payees', exact: true }).click();
  await recent.getByRole('button', { name: 'Open Lidl supplier history' }).click();
  await expect(ledger.getByRole('status')).toHaveText('1 matching payment · £20.20 net out');
  await expect(ledger.getByRole('region', { name: 'Supplier payment pattern' }).getByRole('heading', { name: 'Lidl', exact: true })).toBeVisible();
  await close();
  await recent.getByRole('button', { name: 'Bill days', exact: true }).click();
  await recent.getByRole('button', { name: /22 Oct 2026: £15.10/ }).click();
  await expect(ledger.getByRole('status')).toHaveText('1 matching payment · £15.10 net out');
  await close();
  await expect(recent.getByRole('button', { name: /23 Oct 2026: Future day/ })).toBeDisabled();
  await recent.getByRole('button', { name: 'Daily money out', exact: true }).click();
  await recent.getByRole('button', { name: 'View recorded money out payments', exact: true }).click();
  await expect(ledger).toBeVisible();
  await expect(ledger.getByLabel('Recent payment type')).toHaveValue('outgoing');
  await expect(ledger.getByRole('status')).toHaveText('5 matching payments · £395.30 net out');
  await expect(ledger.getByRole('heading', { name: 'Personal incoming', exact: true })).not.toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ledger).not.toBeVisible();
  await expect(recent.getByRole('button', { name: 'View recorded money out payments', exact: true })).toBeFocused();
  await recent.getByRole('button', { name: 'View purpose to check payments', exact: true }).click();
  await expect(ledger.getByLabel('Recent payment type')).toHaveValue('review');
  await expect(ledger.getByRole('heading', { name: 'Payment purpose unclear', exact: true })).toBeVisible();
  await expect(ledger.getByRole('status')).toHaveText('1 matching payment · £100.00 net out');
  await expect(ledger.getByRole('heading', { name: 'Personal incoming', exact: true })).not.toBeVisible();
  const scrollBefore = await page.evaluate(() => scrollY);
  await ledger.getByRole('button', { name: 'Categorise Payment purpose unclear' }).click();
  await ledger.getByLabel('Confirm category', { exact: true }).selectOption('Housing');
  failSave = true;
  await ledger.getByRole('button', { name: 'Confirm category', exact: true }).click();
  await expect(ledger.getByRole('alert')).toHaveText('Synthetic category save failed.');
  await expect(ledger.getByLabel('Confirm category', { exact: true })).toHaveValue('Housing');
  await close();
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await recent.getByRole('button', { name: 'View transfers, not spending payments', exact: true }).click();
  await expect(ledger.getByLabel('Recent payment type')).toHaveValue('transfer');
  await expect(ledger.getByRole('heading', { name: 'Own account', exact: true })).toBeVisible();
  await expect(ledger.getByRole('status')).toHaveText('1 matching payment · £200.00 net out');
  await close();
  await page.setViewportSize({ width: 390, height: 844 });
  await recent.getByRole('button', { name: 'View identified spending payments', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(ledger.getByLabel('Recent payment type')).toHaveValue('spend');
  await expect(ledger.getByRole('status')).toHaveText('3 matching payments · £95.30 net out');
  await expect(ledger.getByRole('heading', { name: 'Payment purpose unclear', exact: true })).not.toBeVisible();
  await expect(ledger.getByRole('button', { name: 'Close payment details' })).toBeFocused();
  await ledger.getByLabel('Search recent payments').fill('Lidl');
  await close();
  await recent.getByRole('button', { name: 'View recorded money out payments', exact: true }).click();
  await expect(ledger.getByLabel('Search recent payments')).toHaveValue('');
  await expect(ledger.getByLabel('Recent payment category')).toHaveValue('All');
  await ledger.getByLabel('Recent payment type').selectOption('all');
  await expect(ledger.getByRole('heading', { name: 'Personal incoming', exact: true })).toBeVisible();
  expect(await ledger.getByTestId('payment-modal-body').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await close();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await recent.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(1882); // 60% below the production 4,706px baseline.
  await page.setViewportSize({ width: 1024, height: 900 });
  await recent.getByRole('button', { name: 'Categories', exact: true }).click();
  const legend = recent.getByRole('region', { name: 'Where recorded money went' });
  for (const item of await legend.getByRole('button').all()) {
    expect(await item.locator('span').nth(1).evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(60);
    expect(await item.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(70);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await recent.locator('summary').filter({ hasText: 'What to do next' }).click();
  await recent.getByRole('button', { name: 'Suggest next steps' }).click();
  await expect(recent.getByText('Check the payment purpose before setting a target.')).toBeVisible();
  failInsights = true;
  await recent.getByRole('button', { name: 'Suggest next steps' }).click();
  await expect(recent.getByRole('alert')).toHaveText('Synthetic AI unavailable; verified facts remain.');
  await expect(recent.getByText('Start with the payments we cannot explain yet')).toBeVisible();
  await recent.getByRole('button', { name: /Groceries/ }).click();
  await expect(ledger.getByLabel('Recent payment category')).toHaveValue('Groceries');
  await ledger.getByLabel('Search recent payments').fill('Lidl');
  await expect(ledger.getByRole('heading', { name: 'Lidl', exact: true })).toBeVisible();
  await expect(ledger.getByRole('heading', { name: 'Tesco', exact: true })).not.toBeVisible();
  await close();
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
  await expect(recent.getByRole('button', { name: /View identified spending payments/ })).toBeVisible();
  const count = requests.length;
  await page.getByLabel("Number of spending days").fill("0");
  await page
    .getByRole("form", { name: "Custom spending period" })
    .getByRole("button", { name: "Apply", exact: true })
    .click();
  expect(requests.length).toBe(count);
  await page.getByLabel("Spending period", { exact: true }).selectOption("90");
  await expect(recent.getByText("£575.30", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(
    recent.getByRole("heading", { name: "Spending in the last 90 days" }),
  ).toBeVisible();
  await expect(recent.getByText("£575.30", { exact: true }).first()).toBeVisible();
  await recent.getByRole('button', { name: 'Suppliers & bills', exact: true }).click();
  await ledger.getByRole('button', { name: 'View Netflix payments', exact: true }).click();
  await expect(ledger.getByRole('region', { name: 'Supplier payment pattern' })).toContainText('Usually around day 1 of the month');
  await expect(ledger.getByRole('region', { name: 'Supplier payment pattern' })).toContainText('September 2026 vs August 2026');
  await close();
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
  await expect(recent.getByText("£575.30", { exact: true })).not.toBeVisible();
  fail = false;
  disconnected = true;
  await page.getByRole('button', { name: 'Refresh recent spending' }).click();
  await expect(recent.getByRole('alert')).toHaveText('Could not connect to your spending data. Refresh to try again.');
  await expect(recent.getByText('£575.30', { exact: true })).not.toBeVisible();
  disconnected = false;
  await page.getByRole('button', { name: 'Refresh recent spending' }).click();
  await expect(recent.getByText('£575.30', { exact: true }).first()).toBeVisible();
  await recent.locator('summary').filter({ hasText: 'What to do next' }).click();
  await recent.getByRole('button', { name: 'Review month', exact: true }).click();
  await expect(page).toHaveURL(/moneyMonth=2026-09/);
  await expect(page).toHaveURL(/moneyView=review/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Transactions & analysis' })).toBeVisible();
  await expect(page).toHaveURL(/moneyView=review/);
  const navigation = page.getByRole('navigation', { name: 'Money sections' });
  await expect(navigation.getByRole('button', { name: 'Transactions & analysis' })).toHaveAttribute('aria-current', 'page');
  await navigation.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(recent.getByRole('heading', { name: 'Your money at a glance' })).toBeVisible();
  await expect(page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Monthly review' }) }).first()).not.toHaveAttribute('open');
  for (const [label, mode] of [['Bank source', 'source'], ['Saved plans', 'plans'], ['Overview', 'overview'], ['Transactions & analysis', 'review']]) {
    await navigation.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`moneyView=${mode}`));
    await expect(navigation.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    if (mode !== 'overview') await expect(recent).not.toBeVisible();
    if (mode === 'source') await expect(page.getByRole('heading', { name: 'Actual cash flow', exact: true })).toBeVisible();
    if (mode === 'plans') await expect(page.getByRole('heading', { name: 'Saved plans, not bank-verified spending', exact: true })).toBeVisible();
  }
  await expect(page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Monthly review' }) }).first()).toHaveAttribute('open', '');
  await navigation.getByRole('button', { name: 'Overview', exact: true }).click();
  await recent.getByRole('button', { name: 'View purpose to check payments', exact: true }).click();
  await ledger.getByRole('button', { name: 'Categorise Payment purpose unclear' }).click();
  await ledger.getByLabel('Confirm category', { exact: true }).selectOption('Housing');
  failSave = false;
  await ledger.getByRole('button', { name: 'Confirm category', exact: true }).click();
  await expect(ledger.getByText('Category saved. Totals updated; bank amounts unchanged.')).toBeVisible();
  await expect(ledger.getByText('No matching imported payments.')).toBeVisible();
  await close();
  await page.reload();
  await expect(recent.getByRole('button', { name: 'View purpose to check payments' })).toContainText('£0.00');
});
