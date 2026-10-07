import { test, expect, type Page } from '@playwright/test';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';
import { addHouseholdItem, addHouseholdProduct } from '@/lib/sourcing/householdItems';
import { requiredDemands } from '@/lib/sourcing/selection';
import type { ProjectSourcing } from '@/types/sourcing.types';

const seed = createBathroomSourcingSeed();
const project = {
  id: 'bathroom-journey-fixture', title: 'Bathroom UX check', category: 'bathroom', status: 'planning',
  budgetMin: 800, budgetMax: 22000, currency: 'GBP', createdAt: '2026-10-01', updatedAt: '2026-10-01',
  emails: [], tasks: [], contacts: [], quotes: [], scheduledVisits: [], followUps: [], milestones: [], attachments: [],
  sourcing: { ...seed, basket: [{ id: 'existing-selection', requirementId: 'main-wc-unit', productId: 'sw-614103150', quantity: 1, status: 'review' }] },
};

const openProject = async (page: Page, sourcing?: ProjectSourcing) => {
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'local-qa', email: 'qa@example.com' }, needsOnboarding: false }) }));
  await page.addInitScript((fixture) => {
    if (!localStorage.getItem('family-storage')) localStorage.setItem('family-storage', JSON.stringify({ version: 8, state: {
      currentView: 'property', propertyRole: 'owner', propertyProjects: [fixture], activeProjectId: fixture.id,
    } }));
  }, sourcing ? { ...project, sourcing } : project);
  await page.goto('/?view=property&tab=projects');
  await expect(page.getByRole('heading', { name: 'Bathroom UX check' })).toBeVisible();
};

test('two-room overview preserves the existing selection and offers direct next actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProject(page);
  await expect(page.getByRole('heading', { name: 'Project overview' })).toBeVisible();
  const toiletOption = page.getByRole('button', { name: /^View option for Grove back-to-wall toilet:/ }).first();
  await expect(toiletOption).toBeVisible();
  await expect(toiletOption).not.toContainText(/cistern/i);
  await expect(page.getByText('£239.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Compare rooms', exact: true }).click();
  await expect(page.getByText('No selection').first()).toBeVisible();
  await page.getByRole('button', { name: 'Close comparison', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/bathroom-overview-desktop-final.png' });
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Shower Room choices' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Main Bathroom', exact: true })).toBeVisible();
  await expect(page.getByText(/Quote: 500mm wide/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Shower Room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shower Room', exact: true })).toBeVisible();
});

test('phone navigation, room notes and basket quantities survive reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openProject(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/bathroom-overview-mobile-final.png', fullPage: true });
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Shower Room choices' })).not.toBeVisible();
  const healthCheck = page.getByRole('region', { name: 'Bathroom health check' });
  await expect(healthCheck).toBeVisible();
  await expect(healthCheck).toContainText('Tiles');
  const visualMap = page.getByRole('region', { name: 'Main Bathroom visual progress' });
  await visualMap.scrollIntoViewIfNeeded();
  await expect(visualMap).toContainText('WC & cistern');
  await page.screenshot({ path: 'output/playwright/bathroom-progress-phone.png' });
  await page.getByRole('button', { name: /Edit room/ }).click();
  await page.getByLabel('Size & layout notes').fill('QA: confirm door clearance before ordering');
  await page.getByRole('button', { name: 'Save room', exact: true }).click();
  await page.getByRole('button', { name: /^Products/ }).click();
  const basket = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Project basket' }) });
  await basket.getByRole('spinbutton').fill('2');
  await expect(basket).toContainText('£478.00');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Quote item' })).toBeVisible();
  await expect(basket.getByRole('spinbutton')).toHaveValue('2');
  await expect(basket).toContainText('£478.00');
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  await expect(page.getByText('QA: confirm door clearance before ordering')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/bathroom-room-mobile-final.png', fullPage: true });
  await page.context().storageState({ path: 'output/playwright/bathroom-local-state.json' });
});

const localChoice = (id: string, requirementId: string, name: string, components: string[], price = 45) => ({
  id, requirementIds: [requirementId], name, components, price, source: 'household' as const, imageUrl: '/fixture-product.png',
  supplier: 'Mock supplier', url: '', dimensions: {}, stock: 'UNKNOWN' as const, stockEvidence: 'Mock only', lastChecked: '2026-10-07',
});

async function mockProductImages(page: Page) {
  await page.route('**/fixture-product.png', (route) => route.fulfill({ contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVTsAAAAASUVORK5CYII=', 'base64') }));
}

test('mobile quote choice stays upfront, Back restores quote scroll and a wrong-tag selection survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockProductImages(page);
  const sourcing = createBathroomSourcingSeed();
  const product = localChoice('manual-filler-regression', 'main-bath-filler', 'Chosen filler with unconfirmed contents', ['cistern'], 84.5);
  sourcing.products.push(product);
  sourcing.basket.push({ id: 'selected-filler', requirementId: 'main-bath-filler', productId: product.id, quantity: 1, status: 'review' });
  await openProject(page, sourcing);
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  const line = page.getByRole('listitem', { name: /^Element Five two-hole wall-mounted bath filler:/ });
  await line.scrollIntoViewIfNeeded();
  await expect(line).toContainText(product.name);
  await expect(line).not.toContainText('No product selected');
  const change = line.getByRole('button', { name: /^Change product for/ });
  await change.scrollIntoViewIfNeeded();
  const main = page.locator('main').filter({ has: page.getByRole('heading', { name: 'Bathroom UX check' }) });
  const previousScroll = await main.evaluate((element) => element.scrollTop);
  await change.click();
  const pinned = page.getByRole('region', { name: 'Current selected choice' });
  await expect(pinned).toContainText(product.name);
  await expect(pinned).toContainText('£84.50');
  await expect(pinned).toContainText('SELECTED');
  const bounds = await pinned.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThan(812);
  await expect(pinned.locator('img')).toHaveJSProperty('naturalWidth', 1);
  const roomBar = page.getByLabel('Switch bathroom');
  const roomBarBounds = await roomBar.boundingBox();
  expect(roomBarBounds!.y).toBeGreaterThanOrEqual(0);
  expect(roomBarBounds!.y + roomBarBounds!.height).toBeLessThan(bounds!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('details').filter({ has: page.getByText('Measurements & room fit', { exact: true }) })).not.toHaveAttribute('open');
  await expect(page.locator('details').filter({ has: page.getByText(/^Choice history/) })).not.toHaveAttribute('open');
  await page.getByRole('button', { name: 'Back to previous bathroom view', exact: true }).click();
  await expect(line).toBeVisible();
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeCloseTo(previousScroll, -1);
  await line.getByRole('button', { name: /^Change product for/ }).click();
  await page.reload();
  await expect(pinned).toContainText(product.name);
  await expect(page.getByRole('combobox', { name: 'Quote item', exact: true })).toHaveValue('main-bath-filler');
  await expect.poll(async () => {
    const reloadedBounds = await pinned.boundingBox();
    return Boolean(reloadedBounds && reloadedBounds.y >= 0 && reloadedBounds.y + reloadedBounds.height < 740);
  }).toBe(true);
  await page.goBack();
  await expect(line).toContainText(product.name);
});

test('mobile included bundle quantities reconcile quote after reload, without counting its price twice', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockProductImages(page);
  const sourcing = createBathroomSourcingSeed();
  const product = localChoice('manual-light-regression', 'main-downlights', 'Selected downlight pack', ['downlight', 'led-bulb'], 20);
  sourcing.products.push(product);
  sourcing.basket.push({ id: 'selected-pack', requirementId: 'main-downlights', productId: product.id, quantity: 2, status: 'review' });
  await openProject(page, sourcing);
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  const line = page.getByRole('listitem', { name: /^Chrome downlights with LED bulbs:/ });
  await expect(line).toContainText('downlight: 2/6');
  await line.getByRole('button', { name: /^Change product for/ }).click();
  await page.getByRole('region', { name: 'Current selected choice' }).getByRole('button', { name: /^Inspect current selection/ }).click();
  const dialog = page.getByRole('dialog', { name: product.name });
  await dialog.getByLabel('Included quantity downlight').fill('3');
  await dialog.getByLabel('Included quantity led bulb').fill('3');
  await dialog.getByRole('button', { name: 'Save included parts' }).click();
  await dialog.getByRole('button', { name: 'Close product details' }).click();
  await expect(page.getByRole('region', { name: 'Current selected choice' })).toContainText('Required quantity covered');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Current selected choice' })).toContainText('£40.00');
  await page.getByRole('button', { name: 'Back to previous bathroom view', exact: true }).click();
  await expect(line).toContainText('downlight: 6/6');
  const lighting = page.getByRole('region', { name: 'Category spending' }).getByRole('row', { name: /Lighting/ });
  await expect(lighting).toContainText('£40.00');
  await expect(lighting).toContainText('100.0%');
});

test('related alternative selected from original chooser remains there with deviation and stable progress after reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let sourcing = createBathroomSourcingSeed();
  sourcing = addHouseholdItem(sourcing, { roomId: 'main-bathroom', name: 'Alternative vanity', category: 'Furniture', quantity: 1, unit: 'each', size: '550mm wide', specification: 'Vanity with basin', relatedToId: 'main-vanity', replacement: true }, 'req-alt-vanity').sourcing;
  sourcing = addHouseholdProduct(sourcing, { requirementId: 'req-alt-vanity', name: 'Alternative vanity WITH basin', supplier: 'Mock supplier', price: 155, url: '', imageUrl: '', priceUnit: 'each', size: '550mm wide', components: [], notes: '' }, 'manual-alt-vanity').sourcing;
  const count = requiredDemands(sourcing, 'main-bathroom').length;
  await openProject(page, sourcing);
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Bathroom health check' })).toContainText(`0/${count} required items covered`);
  await page.getByLabel('Jump to project item').selectOption('main-vanity');
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Alternative vanity WITH basin', exact: true }) });
  await card.getByRole('button', { name: 'Add', exact: true }).click();
  const pinned = page.getByRole('region', { name: 'Current selected choice' });
  await expect(pinned).toContainText('Alternative vanity WITH basin');
  await expect(pinned).toContainText('Replacement - quote deviation needs review');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Quote item', exact: true })).toHaveValue('main-vanity');
  await expect(pinned).toContainText('Alternative vanity WITH basin');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('family-storage')!).state.propertyProjects[0].sourcing);
  expect(saved.basket[0]).toMatchObject({ requirementId: 'main-vanity', optionRequirementId: 'req-alt-vanity' });
  await page.getByRole('button', { name: 'Back to previous bathroom view', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Bathroom health check' })).toContainText(`1/${count} required items covered`);
});
