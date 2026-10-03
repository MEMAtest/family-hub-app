import { test, expect } from '@playwright/test';
import { createTestPrisma, hasTestDatabase, TEST_DATABASE_REQUIRED } from './test-database';
import { virginStatementPdf } from '../fixtures/virginStatement';
test.skip(!hasTestDatabase, TEST_DATABASE_REQUIRED);
const db = createTestPrisma();
let familyId: string;
let accountId: string;
const csv = Buffer.from('Date,Description,Amount\n2026-09-29,Synthetic Virgin purchase,-10.23\n2026-09-30,Synthetic Virgin refund,5.00');
test.beforeAll(async () => {
  const family = await db.family.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!family) throw new Error('Isolated test household is missing.');
  familyId = family.id;
  accountId = (await db.budgetAccount.create({ data: { familyId, name: 'Virgin synthetic QA', institution: 'Virgin Money' } })).id;
});

test('Virgin PDF extracts locally into a review without AI calls or ledger writes', async ({ request }) => {
  const before = await db.budgetTransaction.count({ where: { accountId } });
  const parsed = await request.post(`/api/families/${familyId}/budget/statement-import`, { multipart: {
    accountId, useAi: 'false', file: { name: 'virgin-synthetic.pdf', mimeType: 'application/pdf', buffer: await virginStatementPdf() },
  } });
  expect(parsed.ok()).toBe(true);
  const preview = await parsed.json();
  expect(preview.success).toBe(true); expect(preview.previewToken).toEqual(expect.any(String));
  expect(preview.transactions).toEqual([expect.objectContaining({ date: '2026-09-02', amount: 10, direction: 'debit', description: 'Synthetic shop' })]);
  expect(await db.budgetTransaction.count({ where: { accountId } })).toBe(before);
});
test.afterAll(async () => { if (accountId) await db.budgetAccount.delete({ where: { id: accountId } }); await db.$disconnect(); });

test('preview and cancel leave the ledger untouched; selected commit is durable and idempotent', async ({ page, request }) => {
  await page.addInitScript(() => localStorage.setItem('familyHub_setupComplete', 'skipped'));
  await page.goto('/?view=budget');
  await page.getByRole('button', { name: 'Import Statement', exact: true }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Import Statement', exact: true });
  await expect(dialog).toHaveAttribute('data-preview-contract', 'review-v1');
  await dialog.getByRole('combobox', { name: 'Statement account' }).selectOption(accountId);
  await expect(dialog.getByRole('checkbox', { name: 'Send PDF text to OpenRouter for AI parsing' })).not.toBeChecked();
  await dialog.locator('input[type=file]').setInputFiles({ name: 'virgin-synthetic.csv', mimeType: 'text/csv', buffer: csv });
  await expect(dialog.getByText('Synthetic Virgin purchase', { exact: true })).toBeVisible();
  expect(await db.statementImport.count({ where: { accountId } })).toBe(0);
  expect(await db.budgetTransaction.count({ where: { accountId } })).toBe(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await db.budgetTransaction.count({ where: { accountId } })).toBe(0);

  const endpoint = `/api/families/${familyId}/budget/statement-import`;
  const parsed = await request.post(endpoint, { multipart: { accountId, useAi: 'false', file: { name: 'virgin-synthetic.csv', mimeType: 'text/csv', buffer: csv } } });
  expect(parsed.ok()).toBe(true); const preview = await parsed.json();
  const incomeBefore = await db.budgetIncome.count({ where: { familyId } });
  const expenseBefore = await db.budgetExpense.count({ where: { familyId } });
  const selected = { ...preview.transactions[0], category: 'Food & Dining' };
  const body = { action: 'commit', accountId, previewToken: preview.previewToken, transactions: [selected] };
  expect((await request.post(endpoint, { data: body })).ok()).toBe(true);
  expect(await db.budgetTransaction.count({ where: { accountId } })).toBe(1);
  expect(await db.budgetTransaction.findFirst({ where: { accountId } })).toMatchObject({ amount: 10.23, category: 'Food & Dining', transactionType: 'normal' });
  const remaining = await request.post(endpoint, { data: { ...body, transactions: preview.transactions } });
  expect(remaining.ok()).toBe(true);
  expect(await db.budgetTransaction.count({ where: { accountId } })).toBe(2);
  expect(await db.statementImport.count({ where: { accountId } })).toBe(1);
  const repeat = await (await request.post(endpoint, { data: body })).json();
  expect(repeat.ledgerImport.alreadyImported).toBe(true);
  expect(await db.budgetTransaction.count({ where: { accountId } })).toBe(2);
  expect(await db.budgetIncome.count({ where: { familyId } })).toBe(incomeBefore);
  expect(await db.budgetExpense.count({ where: { familyId } })).toBe(expenseBefore);
});

test('two identical same-day purchases survive partial saves and re-parsing', async ({ request }) => {
  const endpoint = `/api/families/${familyId}/budget/statement-import`;
  const file = Buffer.from('Date,Description,Amount\n2026-10-01,Synthetic identical purchase,-3.21\n2026-10-01,Synthetic identical purchase,-3.21');
  const parse = async () => (await (await request.post(endpoint, { multipart: { accountId, useAi: 'false', file: { name: 'virgin-identical.csv', mimeType: 'text/csv', buffer: file } } })).json());
  const first = await parse();
  const save = (preview: any, transactions: any[]) => request.post(endpoint, { data: { action: 'commit', accountId, previewToken: preview.previewToken, transactions } });
  expect((await save(first, [first.transactions[1]])).ok()).toBe(true);
  const next = await parse();
  expect((await save(next, next.transactions)).ok()).toBe(true);
  const where = { accountId, description: 'Synthetic identical purchase' };
  expect(await db.budgetTransaction.count({ where })).toBe(2);
  expect((await save(next, next.transactions)).ok()).toBe(true);
  expect(await db.budgetTransaction.count({ where })).toBe(2);
});
