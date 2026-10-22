import { expect, test } from '@playwright/test';
import { buildHistoryForecast } from '../../src/lib/budget/historyForecast';

test('budget separates plans from actuals and commits a statement only after review', async ({ page }) => {
  const family = { id: 'budget-family', familyName: 'Budget family', familyCode: 'budget', members: [] };
  let statementCommits = 0;

  await page.route('**/api/families/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: route.request().method() === 'GET' ? '[]' : '{}',
  }));
  await page.route('**/api/families', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([family]) }));
  await page.route('**/api/families/*/budget/income', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 'salary', incomeName: 'Salary', amount: 3000, category: 'Salary', isRecurring: true, recurringFrequency: 'monthly', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'qa-income', incomeName: 'API Test Income', amount: 1000, category: 'Salary', isRecurring: true, recurringFrequency: 'monthly', createdAt: '2026-01-01T00:00:00.000Z' },
    ]),
  }));
  await page.route('**/api/families/*/budget/expenses', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 'rent', expenseName: 'Rent', amount: 1000, category: 'Housing', isRecurring: true, recurringFrequency: 'monthly', createdAt: '2026-01-01T00:00:00.000Z' }]),
  }));
  await page.route('**/api/families/*/budget/cash-flow**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      month: '2026-10',
      coverage: { status: 'none', transactionCount: 0, accounts: 1, completeAccounts: 0, firstTransactionDate: null, lastTransactionDate: null },
      summary: { actualIncome: 0, actualSpend: 0, actualNet: 0, plannedIncome: 3000, plannedExpenses: 1000, plannedNet: 2000, forecastNet: null, forecastStatus: 'unreconciled' },
      categorySpend: [], reconciliations: [], transactions: [],
      connections: { planned: { incomeItems: 1, expenseItems: 1, excludedQaItems: 1 }, accounts: [{ id: 'account-1', name: 'Virgin', institution: 'Virgin Money', importCount: 0, transactionCount: 0, lastImportAt: null, statementThrough: null }], property: { projects: [], updatedAt: null } },
    }),
  }));
  await page.route('**/api/families/*/budget/accounts', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'account-1', name: 'Virgin' }]) }));
  await page.route('**/api/families/*/budget/statement-import', async (route) => {
    const contentType = route.request().headers()['content-type'] || '';
    if (contentType.includes('application/json')) {
      statementCommits += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, ledgerImport: { id: 'import-1', importedRows: 1, duplicateRows: 0 } }) });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true, warnings: [], errors: [],
        metadata: { bank: 'Virgin Money', sourceType: 'csv', startDate: '2026-10-01', endDate: '2026-10-01' },
        preview: { fileName: 'statement.csv', contentHash: 'a'.repeat(64), sourceType: 'csv' },
        transactions: [{ id: 'row-1', date: '2026-10-01', description: 'Salary', amount: 3000, direction: 'credit', category: 'Salary', source: 'csv' }],
      }),
    });
  });
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'budget-user', email: 'budget@example.com' }, family: null, familyMember: null, needsOnboarding: false }) }));
  await page.addInitScript(() => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    localStorage.setItem('familyId', 'budget-family');
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /^Money$/ }).click();

  await expect(page.getByRole('heading', { name: 'Family Money Planner' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Planned Income', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Saved plans', exact: true }).click();
  await expect(page.getByText('Planned Income', { exact: true })).toBeVisible();
  await expect(page.getByText('Plan Balance', { exact: true })).toBeVisible();
  await expect(page.getByText(/1 test or rehearsal row is excluded/)).toBeVisible();
  await expect(page.getByText(/This is not actual savings/)).toBeVisible();
  await page.getByRole('button', { name: 'Bank source', exact: true }).click();

  await page.getByRole('button', { name: 'Import Statement' }).click();
  await expect(page.getByRole('option', { name: 'Virgin' })).toBeAttached();
  await page.locator('input[type="file"]').setInputFiles({ name: 'statement.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Description,Amount') });
  await expect(page.getByText('1 transactions found')).toBeVisible();
  expect(statementCommits).toBe(0);
  await page.getByRole('button', { name: 'Add reviewed transactions' }).click();
  await expect.poll(() => statementCommits).toBe(1);
});

test('Home and Budget Overview reconcile to the same bank rows, never saved-plan totals or stale fallbacks', async ({ page }) => {
  let unavailable = false;
  let plansUnavailable = false;
  const family = { id: 'overview-family', familyName: 'Overview rehearsal', familyCode: 'overview', members: [] };
  await page.clock.setFixedTime(new Date('2026-10-22T12:00:00Z'));
  await page.route('**/api/families/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/api/families', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([family]) }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'overview-user', email: 'fixture@example.test' }, family: null, familyMember: null, needsOnboarding: false }) }));
  await page.route('**/api/families/*/budget/income', route => route.fulfill({ status: plansUnavailable ? 503 : 200, contentType: 'application/json', body: JSON.stringify(plansUnavailable ? { error: 'Synthetic plans unavailable' } : [{ id: 'old-pay', incomeName: 'Old saved salary', category: 'Salary', amount: 50000, isRecurring: true, createdAt: '2026-01-01' }]) }));
  await page.route('**/api/families/*/budget/expenses', route => route.fulfill({ status: plansUnavailable ? 503 : 200, contentType: 'application/json', body: JSON.stringify(plansUnavailable ? { error: 'Synthetic plans unavailable' } : [{ id: 'old-bill', expenseName: 'Old saved example', category: 'Other', amount: 88888, isRecurring: true, createdAt: '2026-01-01' }]) }));
  await page.route('**/api/families/*/budget/cash-flow**', route => {
    if (unavailable) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic bank source unavailable' }) });
    const month = new URL(route.request().url()).searchParams.get('month') || '2026-10';
    const known = month === '2026-10' || month === '2026-09';
    const october = month === '2026-10';
    const income = october ? 1200 : 1400;
    const spend = october ? 234.56 : 200;
    const transactions = known ? [
      { id: 'credit', transactionDate: `${month}-01`, description: 'Incoming fixture', amount: income, direction: 'credit', category: 'Other', transactionType: 'normal', accountName: 'Synthetic bank' },
      ...Array.from({ length: october ? 24 : 1 }, (_, index) => ({ id: `debit-${index}`, transactionDate: `${month}-${String(Math.min(index + 1, 20)).padStart(2, '0')}`, description: `Merchant ${index + 1}`, amount: october ? index === 23 ? 4.56 : 10 : 200, direction: 'debit', category: 'Utilities', transactionType: 'normal', accountName: 'Synthetic bank' })),
    ] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      month, summary: { actualIncome: known ? income : 0, actualSpend: known ? spend : 0, actualNet: known ? income - spend : 0, plannedIncome: 50000, plannedExpenses: 88888, plannedNet: -38888 },
      coverage: { status: known ? october ? 'partial' : 'complete' : 'none', transactionCount: transactions.length, firstTransactionDate: known ? `${month}-01` : null, lastTransactionDate: known ? `${month}-20` : null, accounts: 1, completeAccounts: known && !october ? 1 : 0 },
      transactions, reconciliations: [], categorySpend: known ? [{ category: 'Utilities', amount: spend }] : [],
      connections: { planned: { incomeItems: 1, expenseItems: 1 }, property: { projects: [], updatedAt: null }, accounts: [{ id: 'bank', name: 'Synthetic bank', institution: null, importCount: 1, transactionCount: 1764, lastImportAt: '2026-10-22', statementThrough: '2026-10-20', latestBalance: 75.19 }] },
    }) });
  });
  await page.addInitScript(() => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    localStorage.setItem('familyId', 'overview-family');
    localStorage.setItem('budgetExpenses:overview-family', JSON.stringify([{ expenseName: 'Stale device example', amount: 999999, isRecurring: true }]));
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const summary = page.getByTestId('bank-cash-flow-summary');
  await expect(summary.getByText('£234.56', { exact: true })).toBeVisible({ timeout: 25_000 });
  await expect(summary.getByText('£876.55', { exact: true })).not.toBeVisible();
  await expect(summary.getByText('£965.44', { exact: true })).toBeVisible();
  await expect(page.getByText(/£88,888/)).not.toBeVisible();
  await expect(page.getByRole('button', { name: /^Actual net flow/ })).toContainText('£965.44');
  await page.getByRole('button', { name: /^Actual net flow/ }).click();
  await page.getByRole('button', { name: 'Bank source', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(summary.getByText('£234.56', { exact: true })).toBeVisible();
  await expect(summary.getByText('£965.44', { exact: true })).toBeVisible();
  await expect(page.getByText('Planned Expenses', { exact: true })).not.toBeVisible();
  await page.getByText('Imported transactions (25)', { exact: true }).click();
  const ledger = page.getByRole('table', { name: 'Imported bank transactions' });
  await expect(ledger.locator('tbody tr')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next transaction page' }).click();
  await expect(ledger.locator('tbody tr')).toHaveCount(5);
  await page.getByLabel('Search imported transactions').fill('Merchant 24');
  await expect(ledger.locator('tbody tr')).toHaveCount(1);
  await expect(ledger.getByText('-£4.56', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Saved plans', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved plans, not bank-verified spending' })).toBeVisible();
  await expect(page.getByText('£88,888.00', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Bank source', exact: true }).click();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await expect(summary.getByText('£200.00', { exact: true })).toBeVisible();
  await expect(summary.getByText(/Imported full-month range/)).toBeVisible();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(summary.getByText('Unavailable', { exact: true })).toHaveCount(3);
  await expect(page.getByText(/£88,888/)).not.toBeVisible();
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await expect(summary.getByText('£234.56', { exact: true })).toBeVisible();
  unavailable = true;
  await page.getByRole('button', { name: 'Refresh actual cash flow', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Synthetic bank source unavailable' })).toBeVisible();
  await expect(summary).not.toBeVisible();
  await expect(page.getByText(/999,999/)).not.toBeVisible();
  unavailable = false;
  plansUnavailable = true;
  await page.reload();
  await page.getByRole('button', { name: 'Bank source', exact: true }).click();
  await expect(summary.getByText('£234.56', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Saved plans', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Saved plans could not be loaded' })).toBeVisible();
  await expect(page.getByText(/999,999/)).not.toBeVisible();
  await expect(page.getByText('Planned Expenses', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Bank source', exact: true }).click();
  await expect(summary.getByText('£234.56', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await summary.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(summary.locator('path.recharts-rectangle')).toHaveCount(3);
  await page.screenshot({ path: 'output/playwright/bank-overview-phone.png', fullPage: false });
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(summary.getByText('£234.56', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('income planning and history forecast work on phone and desktop without mixing plans into actuals', async ({ page }) => {
  const family = { id: 'forecast-family', familyName: 'Forecast family', familyCode: 'forecast', members: [] };
  const reference = new Date('2026-10-22T12:00:00Z');
  let incomePlans: any[] = [];
  let rejectSave = true;
  let savedCount = 0;
  const transactions = Array.from({ length: 24 }, (_, index) => [
    { accountId: 'synthetic', transactionDate: new Date(Date.UTC(2024, 9 + index, 15)), amount: 3000, direction: 'credit', transactionType: 'normal' },
    { accountId: 'synthetic', transactionDate: new Date(Date.UTC(2024, 9 + index, 16)), amount: 2000, direction: 'debit', transactionType: 'normal' },
  ]).flat();
  await page.clock.setFixedTime(reference);
  await page.route('**/api/families/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/api/families', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([family]) }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'forecast-user', email: 'fixture@example.test' }, family: null, familyMember: null, needsOnboarding: false }) }));
  await page.route('**/api/families/*/budget/cash-flow**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    month: '2026-10', summary: { actualIncome: 0, actualSpend: 0, actualNet: 0, plannedIncome: 0, plannedExpenses: 0, plannedNet: 0 },
    coverage: { status: 'none', transactionCount: 0, accounts: 0, completeAccounts: 0, firstTransactionDate: null, lastTransactionDate: null },
    categorySpend: [], reconciliations: [], transactions: [],
    connections: { planned: { incomeItems: incomePlans.length, expenseItems: 0 }, accounts: [], property: { projects: [], updatedAt: null } },
  }) }));
  await page.route('**/api/families/*/budget/income', async route => {
    if (route.request().method() === 'POST') {
      if (rejectSave) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic save unavailable' }) });
      const item = { ...route.request().postDataJSON(), id: 'planned-pay', createdAt: reference.toISOString() };
      incomePlans = [item]; savedCount++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(item) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(incomePlans) });
  });
  await page.route('**/api/families/*/budget/forecast**', route => {
    const months = Number(new URL(route.request().url()).searchParams.get('months'));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildHistoryForecast({
      accounts: [{ id: 'synthetic', name: 'Synthetic bank', currency: 'GBP' }],
      imports: [{ accountId: 'synthetic', statementStart: '2024-10-01', statementEnd: '2026-10-20' }],
      transactions, incomePlans, expensePlans: [], referenceDate: reference, horizon: months,
    })) });
  });
  await page.addInitScript(() => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    localStorage.setItem('familyId', 'forecast-family');
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?view=budget');
  await page.getByText('Expected money and longer-term plans', { exact: true }).click();
  const panel = page.getByRole('region', { name: 'Income & forecast' });
  await expect(panel.getByText(/24 of 24 complete months available/)).toBeVisible({ timeout: 25_000 });
  await expect(panel.locator('svg.recharts-surface[role="application"]')).toBeVisible();
  await expect(panel.locator('path.recharts-line-curve')).toHaveCount(4);
  await panel.getByRole('button', { name: 'Plan income', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Plan income', exact: true });
  await dialog.getByLabel('Income Name *').fill('Future salary');
  await dialog.getByLabel('Amount (£) *').fill('3200');
  await dialog.getByLabel('First payment date *').fill('2026-11-28');
  await dialog.getByRole('button', { name: 'Save income plan' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Synthetic save unavailable');
  await expect(dialog.getByLabel('Income Name *')).toHaveValue('Future salary');
  rejectSave = false;
  await dialog.getByRole('button', { name: 'Save income plan' }).click();
  await expect(dialog).not.toBeVisible();
  expect(savedCount).toBe(1);
  await panel.getByLabel('Income basis').selectOption('plan');
  await expect(panel.getByText('£3,200', { exact: true }).first()).toBeVisible();
  await expect(panel.getByText('£1,200', { exact: true }).first()).toBeVisible();
  await expect(panel.getByText(/it is not added twice/)).toBeVisible();
  await panel.getByRole('button', { name: '12 months', exact: true }).click();
  await expect(panel.locator('tbody tr')).toHaveCount(12);
  const headingBox = await panel.getByRole('heading', { name: 'Income & forecast' }).boundingBox();
  expect(headingBox?.x).toBeGreaterThanOrEqual(288);
  await page.screenshot({ path: 'output/playwright/income-forecast-desktop.png', fullPage: false });
  await page.reload();
  await page.getByText('Expected money and longer-term plans', { exact: true }).click();
  await panel.getByLabel('Income basis').selectOption('plan');
  await expect(panel.getByText('£3,200', { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.getByRole('button', { name: 'Plan income', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(panel.locator('svg.recharts-surface[role="application"]')).toBeVisible();
  await expect(panel.locator('path.recharts-line-curve')).toHaveCount(4);
  await page.screenshot({ path: 'output/playwright/income-forecast-phone.png', fullPage: false });
  expect(savedCount).toBe(1);
});
