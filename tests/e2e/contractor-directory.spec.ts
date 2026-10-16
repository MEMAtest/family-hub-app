import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const runTag = `E2E Contractor ${Date.now()}`;
const contractorsEndpoint = /\/api\/families\/[^/]+\/contractors$/;

const clearContractorFixtures = async (page: Page, endpoint: string) => {
  const response = await page.request.get(endpoint);
  const contractors = await response.json() as Array<{ id: string; name: string; website?: string }>;
  for (const contractor of contractors) {
    if (contractor.name.startsWith('E2E Contractor ') || /example\.(?:net|org)/.test(contractor.website ?? '')) {
      await page.request.delete(`${endpoint}/${encodeURIComponent(contractor.id)}`);
    }
  }
};

test('source-backed contractor persists through edit and reload', async ({ page }) => {
  test.setTimeout(120_000);
  const initialLoad = page.waitForResponse((response) => response.request().method() === 'GET' && contractorsEndpoint.test(response.url()));
  await page.goto('/?view=contractors');
  const endpoint = (await initialLoad).url();
  await clearContractorFixtures(page, endpoint);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Contractors & trades' })).toBeVisible();

  await page.getByRole('button', { name: 'Paste link' }).click();
  await page.getByPlaceholder('Paste company, Checkatrade or forum link').fill('https://example.net/family-hub-e2e-contractor');
  await page.getByRole('button', { name: 'Find company' }).click();
  await expect(page.getByText('Possible matches')).toBeVisible();
  const createResponse = page.waitForResponse((response) => response.request().method() === 'POST' && contractorsEndpoint.test(response.url()));
  await page.getByRole('button', { name: 'Save candidate' }).click();
  await expect((await createResponse).status()).toBe(201);

  await page.getByRole('button', { name: 'Open profile' }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill(runTag);
  await dialog.getByRole('combobox').nth(0).selectOption('roofer');
  await dialog.getByRole('combobox').nth(1).selectOption('contacted');
  await dialog.getByLabel('Household notes').fill('Persistence rehearsal');
  const updateResponse = page.waitForResponse((response) => response.request().method() === 'PUT' && /\/contractors\/[^/]+$/.test(response.url()));
  await dialog.getByRole('button', { name: 'Save profile' }).click();
  const update = await updateResponse;
  expect(update.status()).toBe(200);
  await expect(await update.json()).toMatchObject({ name: runTag, specialty: 'roofer', status: 'contacted' });
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(page.getByRole('heading', { name: runTag })).toBeVisible();
  const card = page.getByRole('heading', { name: runTag }).locator('..').locator('..').locator('..');
  await expect(card).toContainText('Roofer');
  await expect(card).toContainText('Contacted');

  await card.getByRole('button', { name: 'Open profile' }).click();
  await expect(page.getByRole('dialog').getByLabel('Household notes')).toHaveValue('Persistence rehearsal');
  page.once('dialog', (confirmation) => confirmation.accept());
  const deleteResponse = page.waitForResponse((response) => response.request().method() === 'DELETE' && /\/contractors\/[^/]+$/.test(response.url()));
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
  expect((await deleteResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: runTag })).toHaveCount(0);
});

test('failed persistence is surfaced and the optimistic record is rolled back', async ({ page }) => {
  await page.route('**/api/families/*/contractors', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Rejected by adversarial test' }) });
    } else {
      await route.continue();
    }
  });

  await page.goto('/?view=contractors');
  await page.getByRole('button', { name: 'Paste link' }).click();
  await page.getByPlaceholder('Paste company, Checkatrade or forum link').fill('https://example.org/family-hub-e2e-rejected');
  await page.getByRole('button', { name: 'Find company' }).click();
  await page.getByRole('button', { name: 'Save candidate' }).click();

  await expect(page.getByText('Rejected by adversarial test')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'example.org' })).toHaveCount(1);
});
