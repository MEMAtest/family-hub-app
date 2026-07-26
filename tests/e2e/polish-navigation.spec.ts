import { expect, test, type Page } from '@playwright/test';

const skipSetup = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
};

const waitForHub = async (page: Page) => {
  await expect(page.getByRole('button', { name: /^Dashboard$/ }).first()).toBeVisible({
    timeout: 90_000,
  });
};

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  ).toBe(true);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(skipSetup);
});

test('desktop daily flow is compact, navigable and review-first', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await waitForHub(page);

  const overview = page.getByRole('heading', { name: 'Omosanya family overview' });
  await expect(overview).toBeVisible();
  await expect(page.getByText('Quests', { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: /^Calendar$/ }).first().click();
  await expect(page).toHaveURL(/\?view=calendar/);
  await expect(page.getByRole('button', { name: 'Add or import' })).toBeVisible();
  await expect(page.getByText('Ask Family Hub', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add or import' }).click();
  await expect(page.getByText('Ask Family Hub', { exact: true })).toBeVisible();

  await page.goBack();
  await expect(overview).toBeVisible();

  await page.getByRole('button', { name: /^Meals$/ }).first().click();
  await expect(page.getByText('Nothing planned for today')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plan a meal' })).toBeVisible();

  await page.getByRole('button', { name: /^Shopping$/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Shopping Lists' }).first()).toBeVisible();
  await expect(page.getByText('Price Alerts', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Action required', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /^Goals$/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Goals', exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('iPhone month overflow reveals every event in the selected day agenda', async ({ page }) => {
  const eventDate = new Date().toISOString().slice(0, 10);
  const eventTitles = [
    'Breakfast club',
    'Dentist appointment',
    'School pickup',
    'Running session',
    'Family dinner',
  ];

  await page.addInitScript(({ date, titles }) => {
    const now = new Date().toISOString();
    localStorage.setItem('calendarEvents', JSON.stringify(titles.map((title, index) => ({
      id: `same-day-${index}`,
      title,
      person: '',
      date,
      time: `${String(8 + index * 2).padStart(2, '0')}:00`,
      duration: 60,
      recurring: 'none',
      cost: 0,
      type: 'family',
      isRecurring: false,
      priority: 'medium',
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
    }))));
  }, { date: eventDate, titles: eventTitles });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?view=calendar');
  await waitForHub(page);

  await expect(page.getByText(eventTitles[0], { exact: true }).first()).toBeVisible();
  const showMore = page.getByText(/\+\d+ more/).first();
  await expect(showMore).toBeVisible();
  await showMore.click();

  const agenda = page.getByTestId('selected-day-agenda');
  await expect(agenda).toBeFocused();
  await expect(agenda).toContainText('5 events on this date');
  for (const title of eventTitles) {
    await expect(agenda.getByText(title, { exact: true })).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
});

for (const viewport of [
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'iPhone', width: 390, height: 844 },
]) {
  test(`${viewport.name} keeps the daily flow usable without overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await waitForHub(page);

    await expect(page.getByRole('heading', { name: 'Omosanya family overview' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary mobile navigation' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: /^Calendar$/ }).last().click();
    await expect(page.getByRole('button', { name: 'Add or import' })).toBeVisible();
    await expect(page.getByText('Ask Family Hub', { exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: /^Shopping$/ }).last().click();
    await expect(page.getByRole('heading', { name: 'Shopping & Pantry' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
