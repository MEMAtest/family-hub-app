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

/**
 * Every fixture below is anchored to September 2026, and the grid opens on
 * whatever month it believes today to be. Pin the clock so these journeys keep
 * meaning the same thing tomorrow — an earlier version asserted a Monday series
 * was "on today", which was true on the Monday it was written and broke main
 * the next morning.
 */
const TODAY = new Date('2026-09-14T09:00:00.000Z');

/** Seed the local cache the calendar hydrates from, then open the calendar. */
const openCalendarWith = async (page: Page, events: unknown[]) => {
  await page.clock.setFixedTime(TODAY);
  await page.addInitScript(skipSetupWizard);
  await page.addInitScript((seed) => {
    localStorage.setItem('calendarEvents', JSON.stringify(seed));
    localStorage.setItem('familyId', 'recurrence-e2e-family');
  }, events);

  await stubApis(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: /calendar/i }).first().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });
};

/**
 * Which day-of-month cell each rendered event actually sits above.
 *
 * Counting events is not enough: a series rendered on the wrong weekday, or
 * bleeding a month either side, counts the same as a correct one. This reads
 * the grid the way a person does — by looking at which square the block is in.
 */
const renderedByDate = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('.rbc-month-row').forEach((row) => {
      const cells = Array.from(row.querySelectorAll('.rbc-date-cell')).map((c) => ({
        day: (c.textContent || '').trim(),
        box: c.getBoundingClientRect(),
      }));
      row.querySelectorAll('.rbc-event').forEach((ev) => {
        const b = ev.getBoundingClientRect();
        const cell = cells.find((c) => b.left + 4 >= c.box.left && b.left + 4 < c.box.right);
        out.push(`${cell ? cell.day : '??'}:${(ev.textContent || '').trim()}`);
      });
    });
    return out;
  });

const nextMonth = async (page: Page) => {
  await page.getByRole('button', { name: /next/i }).first().click();
  await page.waitForTimeout(1_000);
};

const withPattern = (over: Record<string, unknown>) => ({ ...weeklyEvent, ...over });

test.describe('recurring events render across weeks', () => {
  test('a weekly event lands on every Wednesday of the month, and only those', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);

    // September 2026 contains five Wednesdays: 2, 9, 16, 23, 30.
    await expect
      .poll(() => renderedByDate(page), { timeout: 15_000 })
      .toEqual([
        '02:Swimming lesson',
        '09:Swimming lesson',
        '16:Swimming lesson',
        '23:Swimming lesson',
        '30:Swimming lesson',
      ]);
  });

  test('the series continues onto the right days of the next month', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toHaveLength(5);

    await nextMonth(page);

    // Before the fix this was empty — the single stored row belonged to
    // September. The leading 30 is September's last Wednesday, which the
    // October grid shows in its first row.
    await expect
      .poll(() => renderedByDate(page), { timeout: 15_000 })
      .toEqual([
        '30:Swimming lesson',
        '07:Swimming lesson',
        '14:Swimming lesson',
        '21:Swimming lesson',
        '28:Swimming lesson',
      ]);
  });

  test('a one-off event still appears exactly once, on its own date', async ({ page }) => {
    await openCalendarWith(page, [
      withPattern({ id: 'one-off', title: 'Dentist', date: '2026-09-10', recurring: 'none', isRecurring: false }),
    ]);

    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toEqual(['10:Dentist']);
  });
});

test.describe('the other patterns reach the grid too', () => {
  test('fortnightly skips the odd weeks', async ({ page }) => {
    await openCalendarWith(page, [
      withPattern({ title: 'Fortnightly', recurringPattern: { frequency: 'weekly', interval: 2 } }),
    ]);
    await expect
      .poll(() => renderedByDate(page), { timeout: 15_000 })
      .toEqual(['02:Fortnightly', '16:Fortnightly', '30:Fortnightly']);
  });

  test('a two-day-a-week club lands on both days', async ({ page }) => {
    await openCalendarWith(page, [
      withPattern({ title: 'Club', recurringPattern: { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3] } }),
    ]);
    // Mondays 7, 14, 21, 28 and Wednesdays 2, 9, 16, 23, 30.
    await expect
      .poll(() => renderedByDate(page).then((r) => r.map((e) => e.split(':')[0]).sort()), { timeout: 15_000 })
      .toEqual(['02', '07', '09', '14', '16', '21', '23', '28', '30']);
  });

  test('a monthly event repeats into the following month', async ({ page }) => {
    await openCalendarWith(page, [
      withPattern({ title: 'Rent', date: '2026-09-15', recurring: 'monthly' }),
    ]);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toEqual(['15:Rent']);

    await nextMonth(page);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toEqual(['15:Rent']);
  });

  test('a yearly event does not repeat monthly', async ({ page }) => {
    await openCalendarWith(page, [
      withPattern({ title: 'Birthday', date: '2026-09-15', recurring: 'yearly' }),
    ]);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toEqual(['15:Birthday']);

    await nextMonth(page);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toEqual([]);
  });

  test('endDate stops the series', async ({ page }) => {
    await openCalendarWith(page, [
      withPattern({ title: 'Ends', recurringPattern: { frequency: 'weekly', interval: 1, endDate: '2026-09-16' } }),
    ]);
    await expect
      .poll(() => renderedByDate(page), { timeout: 15_000 })
      .toEqual(['02:Ends', '09:Ends', '16:Ends']);

    await nextMonth(page);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toEqual([]);
  });

  test('endAfter counts from the start of the series, not the visible month', async ({ page }) => {
    await openCalendarWith(page, [
      withPattern({ title: 'After3', recurringPattern: { frequency: 'weekly', interval: 1, endAfter: 3 } }),
    ]);
    await expect
      .poll(() => renderedByDate(page), { timeout: 15_000 })
      .toEqual(['02:After3', '09:After3', '16:After3']);

    // Paging forward must not restart the count and resurrect a finished series.
    await nextMonth(page);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toEqual([]);
  });
});

/**
 * Two places used to answer "what is on" by filtering `event.date` directly
 * instead of expanding first, so they only ever knew about the first instance
 * of a series. Both are user-visible and neither was caught by the grid tests.
 */
test.describe('everything else that answers "what is on" agrees with the grid', () => {
  test('clicking a later occurrence shows it in the day panel', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toHaveLength(5);

    // The third Wednesday of the series — not the day the event was stored on.
    await page.locator('.rbc-date-cell', { hasText: /^16$/ }).first().click();

    const panel = page.getByTestId('selected-day-agenda');
    await expect(panel).toContainText('Wednesday, 16 September', { timeout: 10_000 });
    // Said "No events on this date" while the grid drew the lesson right there.
    await expect(panel).toContainText('1 event on this date');
    await expect(panel).toContainText('Swimming lesson');
  });

  test('the month analytics count occurrences, not stored rows', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);

    const total = page.getByText('Total Events').locator('..');
    // Was 1 — one database row — for a series the grid drew five times.
    await expect(total).toContainText('5', { timeout: 10_000 });

    await nextMonth(page);
    // Was 0. October has four Wednesdays.
    await expect(total).toContainText('4', { timeout: 10_000 });
  });

  test('the "where everyone is today" panel knows about later occurrences', async ({ page }) => {
    // "Today" is Monday 14 September 2026 and the series starts Monday 17
    // August, so only an expanded view puts anything on today at all.
    await openCalendarWith(page, [
      withPattern({ title: 'Swimming lesson', date: '2026-08-17', recurring: 'weekly' }),
    ]);

    const today = page.getByText('WHERE EVERYONE IS TODAY').locator('..');
    // Was empty: the panel only ever knew about the week the event was created.
    await expect(today).toContainText('1 today', { timeout: 10_000 });
    await expect(today).toContainText('Swimming lesson');
  });

  test('the year view counts every week of a series, not just the first', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);

    await page.getByRole('button', { name: /^Year$/ }).first().click();

    // Wednesdays from 2 September to the end of 2026: 18 of them, 5 of which
    // are in September. Before this, the year heat map coloured a single square.
    const totals = page.getByText('Total Events').locator('..');
    await expect(totals).toContainText('18', { timeout: 15_000 });
    await expect(page.getByText('Busiest Month').locator('..')).toContainText('September');
  });
});
