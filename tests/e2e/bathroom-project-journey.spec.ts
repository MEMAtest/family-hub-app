import { test, expect, type Page } from '@playwright/test';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';

const seed = createBathroomSourcingSeed();
const project = {
  id: 'bathroom-journey-fixture', title: 'Bathroom UX check', category: 'bathroom', status: 'planning',
  budgetMin: 800, budgetMax: 22000, currency: 'GBP', createdAt: '2026-10-01', updatedAt: '2026-10-01',
  emails: [], tasks: [], contacts: [], quotes: [], scheduledVisits: [], followUps: [], milestones: [], attachments: [],
  sourcing: { ...seed, basket: [{ id: 'existing-selection', requirementId: 'main-wc-unit', productId: 'sw-614103150', quantity: 1, status: 'review' }] },
};

const openProject = async (page: Page) => {
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'local-qa', email: 'qa@example.com' }, needsOnboarding: false }) }));
  await page.addInitScript((fixture) => {
    if (!localStorage.getItem('family-storage')) localStorage.setItem('family-storage', JSON.stringify({ version: 8, state: {
      currentView: 'property', propertyRole: 'owner', propertyProjects: [fixture], activeProjectId: fixture.id,
    } }));
  }, project);
  await page.goto('/?view=property&tab=projects');
  await expect(page.getByRole('heading', { name: 'Bathroom UX check' })).toBeVisible();
};

test('two-room overview preserves the existing selection and offers direct next actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProject(page);
  await expect(page.getByRole('heading', { name: 'Project overview' })).toBeVisible();
  await expect(page.getByText('£239.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Compare rooms', exact: true }).click();
  await expect(page.getByText('No selection').first()).toBeVisible();
  await page.getByRole('button', { name: 'Close comparison', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/bathroom-overview-desktop-final.png' });
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Main Bathroom', exact: true })).toBeVisible();
  await expect(page.getByText(/Quote: 500mm wide/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Shower Room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shower Room', exact: true })).toBeVisible();
});

test('phone navigation, room notes and basket quantities survive reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openProject(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/bathroom-overview-mobile-final.png' });
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  await page.getByRole('button', { name: /Edit room/ }).click();
  await page.getByLabel('Size & layout notes').fill('QA: confirm door clearance before ordering');
  await page.getByRole('button', { name: 'Save room', exact: true }).click();
  await page.getByRole('button', { name: /^Products/ }).click();
  const basket = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Project basket' }) });
  await basket.getByRole('spinbutton').fill('2');
  await expect(basket).toContainText('£478.00');
  await page.reload();
  await page.getByRole('button', { name: /^Products/ }).click();
  await expect(basket.getByRole('spinbutton')).toHaveValue('2');
  await expect(basket).toContainText('£478.00');
  await page.getByRole('button', { name: 'Main Bathroom', exact: true }).click();
  await expect(page.getByText('QA: confirm door clearance before ordering')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/bathroom-room-mobile-final.png' });
  await page.context().storageState({ path: 'output/playwright/bathroom-local-state.json' });
});
