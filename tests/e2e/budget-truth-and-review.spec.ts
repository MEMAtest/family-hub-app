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
  await page.getByRole('button', { name: /^Budget$/ }).click();

  await expect(page.getByRole('heading', { name: 'Budget Management' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Planned Income', { exact: true })).toBeVisible();
  await expect(page.getByText('Plan Balance', { exact: true })).toBeVisible();
  await expect(page.getByText(/1 test or rehearsal row is excluded/)).toBeVisible();
  await expect(page.getByText(/This is not actual savings/)).toBeVisible();

  await page.getByRole('button', { name: 'Import Statement' }).click();
  await expect(page.getByRole('option', { name: 'Virgin' })).toBeAttached();
  await page.locator('input[type="file"]').setInputFiles({ name: 'statement.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Description,Amount') });
  await expect(page.getByText('1 transactions found')).toBeVisible();
  expect(statementCommits).toBe(0);
  await page.getByRole('button', { name: 'Add reviewed transactions' }).click();
  await expect.poll(() => statementCommits).toBe(1);
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
