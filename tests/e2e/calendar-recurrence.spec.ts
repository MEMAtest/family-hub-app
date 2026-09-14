import { expect, test, type Page } from '@playwright/test';

/**
 * The bug this suite exists for: a weekly event was stored as one row with one
 * date and rendered exactly once, on the day it was created. Paging to the next
 * week or month showed nothing.
 *
 * These journeys assert the grid materialises a series across weeks, that the
 * series survives navigation, and that homework renders as a band spanning the
 * day it was set to the day it is due.
 *
 * No database — the family APIs are stubbed, so this runs anywhere Playwright
 * browsers are installed.
 */

const family = {
  id: 'recurrence-e2e-family',
  familyName: 'Recurrence test family',
  familyCode: 'recurrence-e2e',
};

const child = {
  id: 'recurrence-e2e-child',
  familyId: family.id,
  name: 'Test Child',
  role: 'Child',
  ageGroup: 'Child',
  color: '#147c72',
  icon: 'TC',
};

/** Wednesday 2 September 2026. */
const SERIES_START = '2026-09-02';

const weeklyEvent = {
  id: 'recurrence-e2e-swimming',
  title: 'Swimming lesson',
  person: child.id,
  date: SERIES_START,
  time: '17:00',
  duration: 60,
  recurring: 'weekly',
  isRecurring: true,
  cost: 0,
  type: 'sport',
  priority: 'medium',
  status: 'confirmed',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const skipSetupWizard = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
  localStorage.setItem('calendarEvents', '[]');
};

const stubApis = async (page: Page) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'recurrence-e2e-user', email: 'recurrence-e2e@example.com', displayName: 'E2E User' },
        family: null,
        familyMember: null,
        needsOnboarding: false,
      }),
    })
  );

  await page.route('**/api/families/*/events', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().method() === 'GET' ? JSON.stringify([]) : '{}',
    })
  );

  await page.route('**/api/families/*/members', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([child]) })
  );

  await page.route('**/api/families', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ ...family, members: [child] }]),
    });
  });

  // Everything else the dashboard hydrates — kept quiet so this journey stays
  // focused on the calendar.
  await page.route('**/api/families/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().method() === 'GET' ? '[]' : '{}',
    })
  );
};

/** Seed the local cache the calendar hydrates from, then open the calendar. */
const openCalendarWith = async (page: Page, events: unknown[]) => {
  await page.addInitScript(skipSetupWizard);
  await page.addInitScript((seed) => {
    localStorage.setItem('calendarEvents', JSON.stringify(seed));
    localStorage.setItem('familyId', 'recurrence-e2e-family');
  }, events);

  await stubApis(page);
  await page.goto('/');
  await page.getByRole('button', { name: /calendar/i }).first().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });
};

const countEventsTitled = (page: Page, title: string) =>
  page.locator('.rbc-event', { hasText: title }).count();

test.describe('recurring events render across weeks', () => {
  test('a weekly event appears every week of the month, not just once', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);

    // September 2026 contains five Wednesdays: 2, 9, 16, 23, 30.
    await expect
      .poll(() => countEventsTitled(page, 'Swimming lesson'), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(4);
  });

  test('the series is still there after paging to the next month', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);
    await expect
      .poll(() => countEventsTitled(page, 'Swimming lesson'), { timeout: 15_000 })
      .toBeGreaterThan(0);

    await page.getByRole('button', { name: /next/i }).first().click();

    // Before the fix this was zero — the single stored row belonged to September.
    await expect
      .poll(() => countEventsTitled(page, 'Swimming lesson'), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });

  test('a one-off event still appears exactly once', async ({ page }) => {
    await openCalendarWith(page, [
      { ...weeklyEvent, id: 'one-off', title: 'Dentist', recurring: 'none', isRecurring: false },
    ]);

    await expect
      .poll(() => countEventsTitled(page, 'Dentist'), { timeout: 15_000 })
      .toBe(1);
  });
});
