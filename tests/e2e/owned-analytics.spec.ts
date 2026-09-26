import { expect, test } from '@playwright/test';

test('successful onboarding emits a privacy-safe signup event', async ({ page }) => {
  const events: Array<{ eventName: string; properties: Record<string, unknown> }> = [];

  await page.exposeFunction(
    'captureOwnedEvent',
    (eventName: string, properties: Record<string, unknown>) => {
      events.push({ eventName, properties });
    },
  );
  await page.addInitScript(() => {
    const analyticsWindow = window as typeof window & {
      captureOwnedEvent: (
        eventName: string,
        properties: Record<string, unknown>,
      ) => void;
      ownedPortfolioTrack: (
        eventName: string,
        properties: Record<string, unknown>,
      ) => boolean;
    };
    analyticsWindow.ownedPortfolioTrack = (eventName, properties) => {
      analyticsWindow.captureOwnedEvent(eventName, properties);
      return true;
    };
  });
  await page.route('**/tracker.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('**/api/onboarding', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  }));

  await page.goto('/onboarding');
  await page.getByPlaceholder('The Smith Family').fill('Private Family Name');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('John').fill('Private Member Name');
  await page.getByRole('button', { name: 'Create Family' }).click();

  await expect.poll(() => events).toContainEqual({
    eventName: 'signup_completed',
    properties: { flow: 'family_onboarding' },
  });
  expect(JSON.stringify(events)).not.toContain('Private Family Name');
  expect(JSON.stringify(events)).not.toContain('Private Member Name');
});
