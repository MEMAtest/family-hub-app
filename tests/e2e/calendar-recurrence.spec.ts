import { expect, test, type Page } from '@playwright/test';
import { encodeStoredRecurringPattern } from '@/lib/calendarEventMapping';

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

const stubApis = async (page: Page, events: unknown[]) => {
  const summaryRequests: Record<string, unknown>[] = [];
  const eventUpdates: Record<string, unknown>[] = [];
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

  // This specific handler is registered after the fallback above because
  // Playwright evaluates matching routes in reverse registration order.
  await page.route('**/api/families/*/events', (route) => {
    if (route.request().method() === 'PUT') eventUpdates.push(route.request().postDataJSON());
    const databaseEvents = (events as Record<string, any>[]).map((event) => ({
      id: event.id,
      title: event.title,
      personId: event.person,
      eventDate: `${event.date}T00:00:00.000Z`,
      eventTime: `${event.date}T${event.time || '00:00'}:00.000Z`,
      durationMinutes: event.duration ?? 60,
      location: event.location ?? null,
      recurringPattern: encodeStoredRecurringPattern(event.recurring, event.recurringPattern),
      isRecurring: event.isRecurring ?? false,
      cost: event.cost ?? 0,
      eventType: event.type ?? 'other',
      notes: event.notes ?? null,
      createdAt: event.createdAt ?? '2026-09-01T00:00:00.000Z',
      updatedAt: event.updatedAt ?? '2026-09-01T00:00:00.000Z',
    }));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().method() === 'GET' ? JSON.stringify(databaseEvents) : '{}',
    });
  });

  await page.route('**/api/families/*/events/summary', async (route) => {
    if (route.request().method() === 'POST') summaryRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ summary: '- Purpose: Weekly phonics session.\n- Details: Check the school message for current arrangements.' }),
    });
  });
  return { summaryRequests, eventUpdates };
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

  const apiState = await stubApis(page, events);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: /calendar/i }).first().click();
  await expect(page.locator('.rbc-calendar')).toBeVisible({ timeout: 20_000 });
  return apiState;
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
        const title = ev.querySelector('[data-calendar-event-title]')?.textContent || ev.textContent;
        out.push(`${cell ? cell.day : '??'}:${(title || '').trim()}`);
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
  test('dashboard Next includes a later recurring occurrence and opens its details', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Upcoming Events 5 Next: Swimming lesson', exact: true })).toBeVisible();
    const upcoming = page.getByRole('heading', { name: 'Upcoming Schedule' }).locator('../..');
    await upcoming.getByRole('button', { name: /Swimming lesson.*2026-09-16/ }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Event' })).toContainText('You opened');
  });

  test('recurring mobile tasks complete one occurrence only and survive reload', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => { if (!localStorage.getItem('familyHubTasks')) localStorage.setItem('familyHubTasks', JSON.stringify([{
      id: 'weekly-homework', title: 'Weekly homework', assignedDate: '2026-09-02', dueDate: '2026-09-06',
      assignees: ['recurrence-e2e-child'], recurringPattern: { frequency: 'weekly', interval: 1 },
      taskType: 'homework', priority: 'medium', createdAt: '2026-09-01', updatedAt: '2026-09-01',
    }])); });
    await openCalendarWith(page, []);
    await page.locator('.rbc-event').first().hover();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Day', exact: true }).first().click();
    await page.getByRole('button', { name: 'Next calendar period' }).click();
    await page.getByRole('button', { name: 'Next calendar period' }).click();
    const done = page.getByRole('checkbox', { name: 'Complete Weekly homework' });
    await expect(done).toBeVisible();
    await expect(done).not.toBeChecked();
    await done.check();
    await expect(done).toBeChecked();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('familyHubTasks') || '[]'));
    expect(stored[0].occurrenceCompletions).toHaveProperty('2026-09-16');
    expect(stored[0].completedAt).toBeUndefined();
    await page.reload();
    await page.getByRole('button', { name: 'Day', exact: true }).first().click();
    await page.getByRole('button', { name: 'Next calendar period' }).click();
    await page.getByRole('button', { name: 'Next calendar period' }).click();
    await expect(done).toBeChecked();
    for (let day = 0; day < 7; day += 1) await page.getByRole('button', { name: 'Next calendar period' }).click();
    await expect(done).not.toBeChecked();
    expect(errors).toEqual([]);
  });

  test('opening a later multi-day occurrence preserves the original two-day span', async ({ page }) => {
    const { eventUpdates } = await openCalendarWith(page, [withPattern({ title: 'Two-day trip', date: '2026-09-01', time: '09:00', duration: 2339 })]);
    const row = page.locator('.rbc-month-row').filter({ has: page.locator('.rbc-date-cell').filter({ hasText: /^15$/ }) });
    await row.locator('.rbc-event').filter({ hasText: 'Two-day trip' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Event' });
    await expect(dialog.locator('input[type="date"]').nth(0)).toHaveValue('2026-09-01');
    await expect(dialog.locator('input[type="date"]').nth(1)).toHaveValue('2026-09-02');
    await dialog.getByRole('button', { name: 'Update Event', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(eventUpdates[0]).toMatchObject({ date: '2026-09-01', endDate: '2026-09-02' });
    expect(eventUpdates[0].duration).toBeLessThan(2341);
  });

  test('calendar remains usable after reload without the old welcome marker', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);
    await page.addInitScript(() => localStorage.removeItem('familyHub_setupComplete'));
    await page.reload();
    await expect(page.locator('.rbc-calendar')).toBeVisible();
    await page.getByRole('button', { name: 'Next calendar period' }).click();
    await expect.poll(() => renderedByDate(page)).toHaveLength(5);
    await expect(page.getByText('Welcome to Omosanya Home', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New Event', exact: true })).toBeVisible();
  });

  test('stopping a series saves a one-off without moving the original date', async ({ page }) => {
    const { eventUpdates } = await openCalendarWith(page, [withPattern({ title: 'Phonics', date: '2026-09-18', time: '15:30' })]);
    await page.locator('.rbc-event').filter({ hasText: 'Phonics' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Edit Event' });
    await dialog.getByRole('button', { name: 'Stop repeating on save' }).click();
    await expect(dialog).toContainText('Repeats will stop when you save');
    await dialog.getByRole('button', { name: 'Update Event', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(eventUpdates).toHaveLength(1);
    expect(eventUpdates[0]).toMatchObject({ date: '2026-09-18', recurring: 'none', isRecurring: false });
    expect(eventUpdates[0].recurringPattern).toBeUndefined();
    await nextMonth(page);
    await expect.poll(() => renderedByDate(page)).toEqual([]);
  });
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

  test('a recurring occurrence shows its own date and keeps series edits anchored to the start', async ({ page }) => {
    const event = withPattern({
      id: 'recurrence-e2e-phonics',
      title: 'Phonics',
      date: '2026-09-18',
      time: '15:30',
      duration: 60,
      recurring: 'weekly',
      isRecurring: true,
      type: 'education',
      notes: 'Check the school message for current arrangements.',
    });
    const { summaryRequests } = await openCalendarWith(page, [event]);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toContain('18:Phonics');

    await nextMonth(page);
    await expect.poll(() => renderedByDate(page), { timeout: 15_000 }).toContain('02:Phonics');

    const octoberRow = page.locator('.rbc-month-row').filter({
      has: page.locator('.rbc-date-cell').filter({ hasText: /^0?2$/ }),
    });
    const occurrence = octoberRow.locator('.rbc-event').filter({ hasText: 'Phonics' });
    await occurrence.hover();
    await expect(page.getByText('Fri 2 Oct · 15:30 (60 min)')).toBeVisible();
    await page.getByRole('button', { name: 'AI summary' }).click();
    await expect(page.getByText(/Purpose: Weekly phonics session/)).toBeVisible();
    expect(summaryRequests).toEqual([{ eventId: 'recurrence-e2e-phonics', occurrenceDate: '2026-10-02' }]);

    await octoberRow.locator('.rbc-date-cell').filter({ hasText: /^0?2$/ }).click();
    await page.getByRole('dialog', { name: 'New Event' }).getByRole('button', { name: 'Close event form' }).click();
    const panel = page.getByTestId('selected-day-agenda');
    await expect(panel).toContainText('Friday, 2 October');
    await panel.getByRole('button', { name: /Phonics/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Event' });
    await expect(dialog).toContainText('You opened');
    await expect(dialog).toContainText(/2 Oct/);
    await expect(dialog).toContainText(/18 Sept?/);
    await expect(dialog.locator('input[type="date"]')).toHaveValue('2026-09-18');
  });

  test('the month analytics count occurrences, not stored rows', async ({ page }) => {
    await openCalendarWith(page, [weeklyEvent]);
    await page.getByRole('button', { name: 'Calendar settings', exact: true }).last().click();

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

    const quickPlan = page.getByRole('heading', { name: 'Quick plan' }).locator('../..');
    await page.getByRole('button', { name: 'School inbox', exact: true }).click();
    // Was empty: the panel only ever knew about the week the event was created.
    await expect(quickPlan).toContainText('1 today', { timeout: 10_000 });
    await expect(quickPlan).toContainText('Swimming lesson');
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
