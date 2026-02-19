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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(skipSetupWizard);
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
