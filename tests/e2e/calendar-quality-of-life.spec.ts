import { expect, test, type Page } from '@playwright/test';

const family = { id: 'presence-family', familyName: 'Presence family', familyCode: 'presence' };
const members = [
  { id: 'amari', familyId: family.id, name: 'Amari', role: 'Child', ageGroup: 'Child', color: '#3855c8', icon: 'A' },
  { id: 'angela', familyId: family.id, name: 'Angela', role: 'Parent', ageGroup: 'Adult', color: '#147c72', icon: 'A' },
  { id: 'ade', familyId: family.id, name: 'Ade', role: 'Parent', ageGroup: 'Adult', color: '#a16207', icon: 'A' },
];

const stubHousehold = async (page: Page) => {
  let savedEvent: Record<string, unknown> | null = null;
  const preferences = { hiddenUpcoming: [] as string[], acceptedOverlaps: [], lastPlace: null };
  await page.route('**/api/families/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: route.request().method() === 'GET' ? '[]' : '{}',
  }));
  await page.route('**/api/families', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ ...family, members }]),
  }));
  await page.route('**/api/families/*/members', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(members),
  }));
  await page.route('**/api/families/*/calendar-preferences', async route => {
    if (route.request().method() === 'PUT') {
      const action = route.request().postDataJSON();
      if (action.action === 'hide') preferences.hiddenUpcoming = [...preferences.hiddenUpcoming, action.occurrenceId];
      if (action.action === 'restore') preferences.hiddenUpcoming = preferences.hiddenUpcoming.filter(id => id !== action.occurrenceId);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(preferences) });
  });
  await page.route('**/api/families/*/events', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    savedEvent = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'presence-event', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
    });
  });
  await page.route('**/api/families/*/bin-collections', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'connected',
      checkedAt: new Date().toISOString(),
      providerName: 'Bromley Council',
      sourceUrl: 'https://recyclingservices.bromley.gov.uk/',
      collections: [
        { date: new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' }), services: ['Food waste', 'Paper and cardboard'] },
        { date: '2099-10-28', services: ['Garden waste'] },
      ],
    }),
  }));
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { id: 'presence-user', email: 'presence@example.com' }, family: null, familyMember: null, needsOnboarding: false }),
  }));
  return () => savedEvent;
};

const openCalendar = async (page: Page, viewport: { width: number; height: number }) => {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    localStorage.setItem('familyId', 'presence-family');
  });
  const saved = await stubHousehold(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^Calendar$/ }).last().click();
  await expect(page.getByRole('button', { name: 'Where are you today?' })).toBeVisible({ timeout: 20_000 });
  return saved;
};

test('desktop quick presence defaults to an adult and saves a morning office plan', async ({ page }) => {
  const saved = await openCalendar(page, { width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Where are you today?' }).click();
  await expect(page.getByRole('dialog', { name: 'Where are you today?' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Presence person' })).toHaveValue('angela');
  await page.getByRole('button', { name: 'Morning' }).click();
  await page.getByRole('button', { name: 'Add to today' }).click();
  await expect.poll(saved).toMatchObject({
    personId: 'angela',
    title: 'Going to the office',
    time: '09:00',
    durationMinutes: 240,
    location: 'Office',
  });
});

test('mobile presence and bin details stay within the viewport', async ({ page }) => {
  await openCalendar(page, { width: 390, height: 844 });
  const bins = page.getByRole('region', { name: 'Bin collections' });
  await expect(bins.getByRole('button', { name: /Bins tonight/ })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Bin collection details' })).toBeHidden();
  await bins.getByRole('button', { name: /Bins tonight/ }).click();
  await expect(page.getByRole('dialog', { name: 'Bin collection details' })).toBeVisible();
  await page.getByRole('button', { name: 'Close bin collection details' }).click();
  await page.getByRole('button', { name: 'Where are you today?' }).click();
  await expect(page.getByRole('dialog', { name: 'Where are you today?' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: 'output/playwright/calendar-quick-presence-mobile.png', fullPage: true });
});

test('upcoming dismissal survives reload and can be restored without changing the event', async ({ page }) => {
  await openCalendar(page, { width: 390, height: 844 });
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  let eventWrites = 0;
  const row = { id: 'calm-existing', familyId: family.id, personId: 'angela', title: 'School pickup', eventDate: `${day}T00:00:00Z`, eventTime: `${day}T15:30:00Z`, durationMinutes: 30, eventType: 'family', recurring: false, metadata: { status: 'confirmed' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await page.route('**/api/families/*/events', route => {
    if (route.request().method() !== 'GET') eventWrites++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) });
  });
  await page.reload();
  const upcoming = page.getByRole('region', { name: 'Upcoming this week' });
  await upcoming.getByRole('button', { name: 'Hide School pickup from Coming up' }).click();
  await expect(upcoming.getByRole('button', { name: 'Show hidden (1)' })).toBeVisible();
  await page.reload();
  await expect(upcoming.getByRole('button', { name: 'Hide School pickup from Coming up' })).toHaveCount(0);
  await upcoming.getByRole('button', { name: 'Show hidden (1)' }).click();
  await upcoming.getByRole('button', { name: 'Restore School pickup' }).click();
  await expect(upcoming.getByRole('button', { name: 'Hide School pickup from Coming up' })).toBeVisible();
  expect(eventWrites).toBe(0);
});

test('school inbox separates current decisions, unread content and past references on a phone', async ({ page }) => {
  await openCalendar(page, { width: 390, height: 844 });
  const base = { sender: 'School office', receivedAt: new Date().toISOString(), autoCreated: 0,
    needsReview: 1, parsedDrafts: [], duplicateCount: 0, conflictCount: 0,
    schoolSource: { institution: 'stewart-fleming', institutionName: 'Stewart Fleming', links: [] } };
  await page.route('**/api/families/*/calendar-intake/inbox', route => route.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify({ pendingReviewCount: 2,
      pendingDecisionCount: 1, pendingDecisionEmailCount: 1, waitingContentCount: 1,
      intakes: [
        { ...base, id: 'decision', subject: 'Choose parent for school meeting', status: 'review_required', queue: 'decision', actionRequired: true },
        { ...base, id: 'unread', subject: 'Unread nursery original', status: 'content_required', queue: 'waiting_content', actionRequired: true },
        { ...base, id: 'old', subject: 'Past school trip', status: 'reviewed', queue: 'reference', needsReview: 0, expiredDraftCount: 1, actionRequired: false },
      ] }) }));
  await page.reload();
  await page.getByRole('button', { name: 'School items to check' }).click();
  const inbox = page.getByRole('region', { name: 'School inbox and import' });
  await expect(inbox.getByText('Needs your decision · 1 update', { exact: true })).toBeVisible();
  await expect(inbox.getByRole('button', { name: /Choose parent for school meeting/ })).toBeVisible();
  await expect(inbox.getByRole('button', { name: /Unread nursery original/ })).toBeHidden();
  await inbox.getByText('Waiting for original content · 1', { exact: true }).click();
  await expect(inbox.getByRole('button', { name: /Unread nursery original/ })).toBeVisible();
  await inbox.getByText('Added & reference updates · 1', { exact: true }).click();
  await expect(inbox.getByRole('button', { name: /Past school trip/ })).toContainText('past date');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('family day distinguishes office availability, pickup overlap and unconfirmed adverts', async ({ page }) => {
  await openCalendar(page, { width: 1440, height: 900 });
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const row = (id: string, title: string, personId: string, time: string, durationMinutes: number, metadata = {}) => ({
    id, familyId: family.id, personId, title, eventDate: `${day}T00:00:00Z`, eventTime: `${day}T${time}:00Z`,
    durationMinutes, eventType: 'family', recurring: false, metadata: { status: 'confirmed', ...metadata },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  const rows = [
    row('office', 'Ade at office', 'ade', '09:00', 480, { workStatus: { type: 'office', affectsPickup: true } }),
    row('pickup', 'School pickup', 'ade', '15:00', 30),
    row('appointment', 'Dentist appointment', 'ade', '15:15', 45),
    row('other-parent', 'Angela client meeting', 'angela', '15:00', 60),
    { ...row('advert', 'Optional holiday camp', 'amari', '09:00', 420, { schoolImportReview: { reason: 'Booking has not been confirmed.' } }),
      eventDate: `${new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' })}T00:00:00Z` },
    { ...row('past-advert', 'Earlier advertised outing', 'amari', '10:00', 60, { schoolImportReview: { reason: 'Attendance not confirmed.' } }),
      eventDate: '2026-01-05T00:00:00Z' },
  ];
  await page.route('**/api/families/*/events', route => route.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify(rows) }));
  await page.reload();
  const check = page.getByRole('region', { name: 'Schedule check' });
  await expect(check.getByText('Ade has overlapping plans', { exact: true })).toBeVisible();
  await expect(check.getByText(/15 min overlap, 15:15-15:30/)).toBeVisible();
  await expect(check.getByText("Check Ade's availability", { exact: true }).first()).toBeVisible();
  await expect(check.getByText('Angela has overlapping plans', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Upcoming this week' }).getByText('Optional holiday camp', { exact: true })).toHaveCount(0);
  const held = page.getByRole('region', { name: 'Imported plans to confirm' });
  await held.getByText('2 imported plans need confirmation', { exact: true }).click();
  await expect(held.getByText('Optional holiday camp', { exact: true })).toBeVisible();
  await expect(held.getByText('Earlier advertised outing', { exact: true })).toBeVisible();
  await expect(held.getByRole('button', { name: 'Confirm my plan' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Where are you today?' }).click();
  await page.getByRole('combobox', { name: 'Presence person' }).selectOption('ade');
  await page.getByRole('button', { name: 'Morning', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Presence person' })).toHaveValue('ade');
  await page.getByRole('button', { name: 'Close quick presence', exact: true }).click();
  await page.getByRole('button', { name: /^Dashboard$/ }).last().click();
  await expect(page.getByText('Optional holiday camp', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Earlier advertised outing', { exact: true })).toHaveCount(0);
});
