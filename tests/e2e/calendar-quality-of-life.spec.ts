import { expect, test, type Page } from '@playwright/test';

const family = { id: 'presence-family', familyName: 'Presence family', familyCode: 'presence' };
const members = [
  { id: 'amari', familyId: family.id, name: 'Amari', role: 'Child', ageGroup: 'Child', color: '#3855c8', icon: 'A' },
  { id: 'angela', familyId: family.id, name: 'Angela', role: 'Parent', ageGroup: 'Adult', color: '#147c72', icon: 'A' },
  { id: 'ade', familyId: family.id, name: 'Ade', role: 'Parent', ageGroup: 'Adult', color: '#a16207', icon: 'A' },
];

const stubHousehold = async (page: Page) => {
  let savedEvent: Record<string, unknown> | null = null;
  let preferences = { hiddenUpcoming: [] as string[], acceptedOverlaps: [], lastPlace: null };
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
