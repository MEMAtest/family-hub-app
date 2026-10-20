import { expect, test } from '@playwright/test';

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
