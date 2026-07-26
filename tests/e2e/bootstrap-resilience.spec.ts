import { expect, test, type Page } from '@playwright/test';

const skipSetupWizard = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
};

const dismissSetupWizard = async (page: Page) => {
  const skipButton = page.getByRole('button', { name: 'Skip Setup' });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(400);
  }
};

const assertNoHorizontalOverflow = async (page: Page, view: string) => {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    docWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(
    metrics.docWidth,
    `${view}: document width ${metrics.docWidth}px exceeds viewport ${metrics.viewport}px`
  ).toBeLessThanOrEqual(metrics.viewport + 1);

  expect(
    metrics.bodyWidth,
    `${view}: body width ${metrics.bodyWidth}px exceeds viewport ${metrics.viewport}px`
  ).toBeLessThanOrEqual(metrics.viewport + 1);
};

const mockFallbackHousehold = async (page: Page) => {
  const member = {
    id: 'bootstrap-resilience-adult',
    familyId: 'bootstrap-resilience-family',
    name: 'Test Adult',
    role: 'Parent',
    ageGroup: 'Adult',
    color: '#147c72',
    icon: 'TA',
  };

  await page.route('**/api/families', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'bootstrap-resilience-family',
        familyName: 'Recovery household',
        members: [member],
      }]),
    });
  });
  await page.route('**/api/families/*/members', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([member]),
    });
  });
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(skipSetupWizard);
  await mockFallbackHousehold(page);
});

test('app exits loading state when auth probe stalls', async ({ page }) => {
  test.setTimeout(90_000);

  await page.route('**/api/auth/me', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 9_000));
    await route.abort('timedout');
  });

  await page.goto('/');
  await expect(page.getByText('Loading Family Hub...')).toBeVisible({ timeout: 10_000 });

  const dashboardButton = page.getByRole('button', { name: /^Dashboard$/ }).first();
  await expect(dashboardButton).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Loading Family Hub...')).toBeHidden({ timeout: 8_000 });
  await dismissSetupWizard(page);
});

test('mobile recovers from stalled auth and renders fitness without overflow', async ({ page }) => {
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/auth/me', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 9_000));
    await route.abort('timedout');
  });

  await page.goto('/?view=fitness');
  await expect(page.getByText('Loading Family Hub...')).toBeVisible({ timeout: 10_000 });

  const dashboardButton = page.getByRole('button', { name: /^Dashboard$/ }).first();
  await expect(dashboardButton).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Loading Family Hub...')).toBeHidden({ timeout: 12_000 });

  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Fitness Tracking' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^(Log Activity|Log)$/ })).toBeVisible({ timeout: 20_000 });
  await assertNoHorizontalOverflow(page, 'Fitness');
});
