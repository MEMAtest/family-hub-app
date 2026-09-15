import { expect, test, type Page } from '@playwright/test';

/**
 * The calendar used to give up on its first failed hydration.
 *
 * `lastHydrationKey` was claimed before the events fetch resolved, so an
 * interrupted request — a navigation mid-load, a cold server, a dropped
 * connection — left the guard set with nothing loaded. Nothing re-hydrated
 * until the 60-second poll, and the user stared at an empty month in between.
 *
 * This is how the brain-integrations calendar journey failed intermittently in
 * CI: its trace showed `/events` aborted 20ms after it started, then no network
 * activity at all for the rest of the test.
 */

const family = { id: 'hydration-family', familyName: 'Hydration family', familyCode: 'hydration' };
const child = { id: 'hydration-child', familyId: family.id, name: 'Test Child', role: 'Child', ageGroup: 'Child', color: '#147c72', icon: 'TC' };

/**
 * Database shape, not app shape — this is what `/events` returns and what
 * `mapDatabaseEventsToCalendarEvents` expects. An app-shaped fixture maps to
 * `time: "NaN:NaN"` with no `type`, which the grid then filters out entirely.
 */
const dbEvent = {
  id: 'hydration-event',
  title: 'Swimming lesson',
  personId: 'hydration-child',
  eventDate: '2026-09-02T00:00:00.000Z',
  // Wall-clock 17:00 is stored as a UTC instant; the mapper reads UTC parts.
  eventTime: '2026-09-02T17:00:00.000Z',
  durationMinutes: 60,
  location: null,
  recurringPattern: 'weekly',
  isRecurring: true,
  cost: 0,
  eventType: 'sport',
  notes: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

/** The same event in the shape the localStorage cache holds. */
const cachedEvent = {
  id: 'hydration-event',
  title: 'Swimming lesson',
  person: 'hydration-child',
  date: '2026-09-02',
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

/**
 * Fails the events fetch `failures` times, then serves it normally — the shape
 * of a transient interruption rather than a broken endpoint.
 */
const stubApis = async (page: Page, failures: number, mode: 'abort' | 'hang' = 'abort') => {
  let seen = 0;

  // Playwright matches the most recently registered route first, so the
  // catch-all goes down before the specific handlers or it swallows them.
  await page.route('**/api/families/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: route.request().method() === 'GET' ? '[]' : '{}' })
  );

  await page.route('**/api/families', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ ...family, members: [child] }]) });
  });

  await page.route('**/api/families/*/members', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([child]) })
  );

  await page.route('**/api/families/*/events', async (route) => {
    if (route.request().method() !== 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    seen += 1;
    if (seen <= failures) {
      // 'hang' is the one that actually bit us in CI: the server stops
      // answering rather than refusing, so a bare fetch never rejects.
      if (mode === 'hang') return new Promise(() => {});
      return route.abort('connectionreset');
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([dbEvent]) });
  });

  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'hydration-user', email: 'hydration@example.com', displayName: 'E2E User' },
        family: null,
        familyMember: null,
        needsOnboarding: false,
      }),
    })
  );
};

/** The fixture sits in September 2026; pin the clock so the grid opens there. */
const TODAY = new Date('2026-09-14T09:00:00.000Z');

const openCalendar = async (page: Page, failures: number, seedCache: boolean, mode: 'abort' | 'hang' = 'abort') => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.setFixedTime(TODAY);
  await page.addInitScript(({ seed, withCache }) => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    localStorage.setItem('familyId', 'hydration-family');
    // Deliberately empty unless asked: a cached copy would paint the grid on the
    // fallback path and hide whether the fetch ever recovered.
    localStorage.setItem('calendarEvents', withCache ? JSON.stringify([seed]) : '[]');
  }, { seed: cachedEvent, withCache: seedCache });

  await stubApis(page, failures, mode);
  await page.goto('/');
  await page.getByRole('button', { name: /calendar/i }).first().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });
};

test.describe('the calendar survives a failed first load', () => {
  test('an interrupted events fetch still ends with a populated grid', async ({ page }) => {
    // Two aborts, then success, and nothing in the cache to fall back on — so
    // the only way these can appear is if the fetch was actually retried.
    await openCalendar(page, 2, false);

    // Well inside the 60s poll: were this only passing because of the poll it
    // would take a minute, not seconds.
    await expect
      .poll(() => page.locator('.rbc-event', { hasText: 'Swimming lesson' }).count(), { timeout: 25_000 })
      .toBe(5);
  });

  test('a hung request does not leave the month blank forever', async ({ page }) => {
    // The CI failure mode: the first events request never answers at all. With
    // no timeout the fetch stays pending, so nothing retries and the calendar
    // waits for the 60s poll. One attempt must give up and the next succeed.
    test.setTimeout(90_000);
    await openCalendar(page, 1, false, 'hang');

    await expect
      .poll(() => page.locator('.rbc-event', { hasText: 'Swimming lesson' }).count(), { timeout: 40_000 })
      .toBe(5);
  });

  test('a load that fails outright still falls back to the cache', async ({ page }) => {
    // More failures than attempts: the database is simply unreachable, and the
    // cached series must still be drawn rather than an empty month.
    await openCalendar(page, 99, true);

    await expect
      .poll(() => page.locator('.rbc-event', { hasText: 'Swimming lesson' }).count(), { timeout: 20_000 })
      .toBe(5);
  });
});
