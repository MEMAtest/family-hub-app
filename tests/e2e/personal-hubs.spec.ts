import { expect, test, type Page } from '@playwright/test';

const familyId = 'personal-hubs-e2e-family';
const memberId = 'personal-hubs-e2e-angela';

const skipSetupWizard = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
  localStorage.setItem('familyId', familyId);
  localStorage.setItem(
    'familyMembers',
    JSON.stringify([
      {
        id: memberId,
        familyId,
        name: 'Angela',
        role: 'Parent',
        ageGroup: 'Adult',
        color: '#d8527d',
        icon: 'A',
      },
    ])
  );
};

const mockAngelaSession = async (page: Page, isOwner = false) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'personal-hubs-e2e-user', email: 'angela@example.test', displayName: 'Angela' },
        family: { id: familyId, familyName: 'E2E household' },
        familyMember: { id: memberId, name: 'Angela', privateCycleAccess: true },
        isOwner,
        needsOnboarding: false,
      }),
    });
  });
};

const mockUnrelatedApiRequests = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
};

const mockFamilyBootstrap = async (page: Page) => {
  await page.route('**/api/families', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: familyId, familyName: 'E2E household', members: [] }]),
    });
  });
};

const dismissSetupWizard = async (page: Page) => {
  const skipButton = page.getByRole('button', { name: 'Skip Setup' });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
  }
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(skipSetupWizard);
  await mockUnrelatedApiRequests(page);
  await mockAngelaSession(page);
  await mockFamilyBootstrap(page);
});

test('a legacy adult profile receives a one-use Google account invite', async ({ page }) => {
  await page.unroute('**/api/auth/me');
  await mockAngelaSession(page, true);

  await page.route('**/api/families/*/members', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'ade-member', name: 'Ade', ageGroup: 'Adult', hasGoogleAccount: true },
        { id: memberId, name: 'Angela', ageGroup: 'Adult', userId: 'legacy-angela-user', hasGoogleAccount: false },
      ]),
    });
  });
  await page.route('**/api/families/*/invites', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ memberId });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'ABCD-EFGH', memberName: 'Angela', expiresAt: '2088-09-14T12:00:00.000Z' }),
    });
  });

  await page.goto('/?view=family');
  await dismissSetupWizard(page);
  await page.getByRole('button', { name: /^Access$/ }).click();
  await expect(page.getByText('No account linked yet')).toBeVisible();
  await page.getByRole('button', { name: 'Create one-use invite' }).click();
  await expect(page.getByText('Invite for Angela')).toBeVisible();
  await expect(page.getByText('ABCD-EFGH')).toBeVisible();
});

test('Angela can save and see a private period entry without using the shared calendar', async ({ page }) => {
  const periods: Array<{ id: string; startDate: string; endDate: string | null; notes: string | null }> = [];
  const cyclePosts: Array<Record<string, unknown>> = [];

  await page.route('**/api/families/*/cycles**', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      cyclePosts.push(payload);
      const period = {
        id: 'period-e2e-1',
        startDate: `${payload.startDate}T12:00:00.000Z`,
        endDate: payload.endDate ? `${payload.endDate}T12:00:00.000Z` : null,
        notes: typeof payload.notes === 'string' ? payload.notes : null,
      };
      periods.unshift(period);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(period) });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: null,
        periods,
        logs: [],
        reminders: [],
        calendarConnection: null,
        insights: {
          averageCycleLength: null,
          averagePeriodLength: null,
          predictedNextPeriod: null,
          confidence: 'low',
          irregular: false,
          loggedCycles: periods.length,
        },
      }),
    });
  });

  await page.goto('/?view=cycle');
  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Health & Cycle' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Log period' })).toBeVisible();

  await page.getByRole('button', { name: 'Log period' }).click();
  await page.getByLabel('Start date').fill('2088-09-14');
  await page.getByLabel('End date, optional').fill('2088-09-18');
  await page.locator('textarea[name="notes"]').fill('E2E private period note');
  await page.getByRole('button', { name: 'Save private period' }).click();

  await expect(page.getByText('14 Sept 2088')).toBeVisible();
  expect(cyclePosts).toEqual([
    {
      action: 'period',
      startDate: '2088-09-14',
      endDate: '2088-09-18',
      notes: 'E2E private period note',
    },
  ]);
  expect(page.url()).not.toContain('calendar');
});

test('period and check-in history load safely before edits are saved', async ({ page }) => {
  const periods: Array<{ id: string; startDate: string; endDate: string | null; notes: string | null }> = [{ id: 'period-history-1', startDate: '2088-09-14T12:00:00.000Z', endDate: '2088-09-18T12:00:00.000Z', notes: 'Original period note' }];
  const logs = [{ id: 'checkin-history-1', logDate: '2088-09-15T12:00:00.000Z', flow: 'Light', mood: 'Good', energy: 4, painLevel: 2, sleepHours: 8, medication: 'Magnesium', notes: 'Original check-in note', symptoms: ['Cramps'] }];
  const posts: Array<Record<string, unknown>> = [];

  await page.route('**/api/families/*/cycles**', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      posts.push(payload);
      if (payload.action === 'update-period') {
        periods[0] = { id: 'period-history-1', startDate: `${payload.startDate}T12:00:00.000Z`, endDate: payload.endDate ? `${payload.endDate}T12:00:00.000Z` : null, notes: String(payload.notes || '') };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(periods[0]) });
        return;
      }
      if (payload.action === 'daily-log') {
        logs[0] = { id: 'checkin-history-1', ...payload, logDate: `${payload.logDate}T12:00:00.000Z` } as typeof logs[number];
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(logs[0]) });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profile: null, periods, logs, reminders: [], calendarConnection: null, insights: { averageCycleLength: null, averagePeriodLength: null, predictedNextPeriod: null, confidence: 'low', irregular: false, loggedCycles: periods.length } }),
    });
  });

  await page.goto('/?view=cycle');
  await dismissSetupWizard(page);
  await expect(page.getByRole('button', { name: 'Edit period starting 14 Sept 2088' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Edit period starting 14 Sept 2088' }).click();
  await expect(page.getByRole('heading', { name: 'Edit period' })).toBeVisible();
  await expect(page.getByLabel('Start date')).toHaveValue('2088-09-14');
  await page.locator('textarea[name="notes"]').fill('Corrected period note');
  await page.getByRole('button', { name: 'Save period changes' }).click();
  await expect(page.getByText('Private period updated.')).toBeVisible();

  await page.getByLabel('Check-in date').fill('2088-09-15');
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Good', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByPlaceholder('Private note, optional').first()).toHaveValue('Original check-in note');
  await page.getByPlaceholder('Private note, optional').first().fill('Corrected check-in note');
  await page.getByRole('button', { name: 'Save private check-in' }).click();
  await expect(page.getByText('Private daily check-in saved.')).toBeVisible();

  expect(posts).toEqual([
    { action: 'update-period', id: 'period-history-1', startDate: '2088-09-14', endDate: '2088-09-18', notes: 'Corrected period note' },
    { action: 'daily-log', logDate: '2088-09-15', flow: 'Light', mood: 'Good', energy: 4, painLevel: 2, sleepHours: 8, medication: 'Magnesium', notes: 'Corrected check-in note', symptoms: ['Cramps'] },
  ]);
});

test('the catalogue search adds a verified release to the private collection', async ({ page }) => {
  const catalogueEntry = {
    id: 'catalogue-smoking-hot',
    house: 'Kilian',
    name: 'Smoking Hot',
    concentration: 'Eau de Parfum',
    releaseYear: 2023,
    olfactiveFamily: 'Woody amber',
    notes: ['smoke', 'apple', 'vanilla'],
    accords: ['smoky', 'sweet'],
    source: { name: 'Verified catalogue', url: null, kind: 'licensed', status: 'verified' },
    isInCollection: false,
  };
  let collection: any[] = [];
  const catalogRequests: string[] = [];

  await page.route('**/api/families/*/perfumes**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recommendations')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ wearToday: [], buyNext: [] }) });
      return;
    }
    if (url.pathname.endsWith('/catalog')) {
      catalogRequests.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ ...catalogueEntry, isInCollection: collection.length > 0 }]) });
      return;
    }
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ catalogEntryId: catalogueEntry.id });
      collection = [{
        id: 'private-smoking-hot',
        house: catalogueEntry.house,
        name: catalogueEntry.name,
        concentration: catalogueEntry.concentration,
        photoUrl: null,
        catalog: {
          id: catalogueEntry.id,
          olfactiveFamily: catalogueEntry.olfactiveFamily,
          notes: catalogueEntry.notes,
          accords: catalogueEntry.accords,
          sourceName: catalogueEntry.source.name,
          sourceUrl: null,
          catalogueStatus: 'verified',
        },
        wearLogs: [],
      }];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(collection[0]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collection) });
  });

  await page.goto('/?view=perfume');
  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Perfume Hub' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Browse catalogue' }).click();
  await expect(page.getByText('Source-aware library')).toBeVisible();
  await page.getByLabel('Search catalogue').fill('Smoking');
  await expect.poll(() => catalogRequests.length).toBe(2);
  expect(catalogRequests[1]).toContain('q=Smoking');
  expect(catalogRequests[1]).toContain('limit=20');
  await expect(page.getByRole('button', { name: 'Add bottle' })).toBeVisible();
  await page.getByRole('button', { name: 'Add bottle' }).click();

  await expect(page.getByText('Kilian Smoking Hot added to your private collection.')).toBeVisible();
  await expect(page.getByLabel('Log a wear test for Kilian Smoking Hot')).toBeVisible();
});

test('the bottle reader shows progress, extracts a label, and confirms a catalogue match', async ({ page }) => {
  const collection: any[] = [];
  const confirmationPayloads: Array<Record<string, unknown>> = [];

  await page.route('**/api/families/*/perfumes**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recommendations')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ wearToday: [], buyNext: [] }) });
      return;
    }
    if (url.pathname.endsWith('/photo-drafts') && route.request().method() === 'POST') {
      expect(await route.request().headerValue('content-type')).toContain('multipart/form-data');
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'draft-e2e-1',
          suggestedHouse: 'KILIAN PARIS',
          suggestedName: 'Smoking Hot',
          suggestedConcentration: 'Eau de Parfum',
          extractedText: 'KILIAN PARIS\nSMOKING HOT',
          ocrStatus: 'ready',
          ocrConfidence: 0.92,
          ocrUsage: { inputTokens: 10_000, outputTokens: 200, estimatedUsd: 0.00052 },
          matchCandidates: [{
            id: 'catalogue-smoking-hot',
            house: 'KILIAN PARIS',
            name: 'Smoking Hot',
            concentration: 'Eau de Parfum',
            source: 'catalogue',
          }],
        }),
      });
      return;
    }
    if (url.pathname.endsWith('/photo-drafts/draft-e2e-1/confirm') && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      confirmationPayloads.push(payload);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'saved-smoking-hot', ...payload, photoUrl: null, wearLogs: [] }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(collection) });
  });

  await page.goto('/?view=perfume');
  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Perfume Hub' })).toBeVisible({ timeout: 30_000 });

  await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles({
    name: 'smoking-hot-label.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLtaQAAAABJRU5ErkJggg==', 'base64'),
  });

  await expect(page.getByAltText('Bottle label selected for reading')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reading bottle label...' })).toBeVisible();
  await expect(page.getByText('Label text read')).toBeVisible();
  await expect(page.getByText('Recognition confidence: 92%')).toBeVisible();
  await expect(page.getByText('This scan used < $0.01 of vision processing.')).toBeVisible();
  if (process.env.CAPTURE_PERFUME_E2E) {
    await page.screenshot({ path: 'output/playwright/perfume-bottle-reader-e2e.png', fullPage: true });
  }
  await page.getByRole('button', { name: /Catalogue match KILIAN PARIS Smoking Hot Use match/ }).click();
  await page.getByRole('button', { name: 'Save to collection' }).click();

  await expect(page.getByText('Bottle label confirmed and saved to your private collection.')).toBeVisible();
  expect(confirmationPayloads).toEqual([{
    house: 'KILIAN PARIS',
    name: 'Smoking Hot',
    concentration: 'Eau de Parfum',
  }]);
});

test('a collection perfume accepts a direct bottle photo', async ({ page }) => {
  let hasPhoto = false;
  let photoUploadCount = 0;
  let photoDeleteCount = 0;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLtaQAAAABJRU5ErkJggg==', 'base64');

  await page.route('**/api/families/*/perfumes**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recommendations')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ wearToday: [], buyNext: [] }) });
      return;
    }
    if (url.pathname.endsWith('/perfumes/fragrance-e2e-1/photo')) {
      if (route.request().method() === 'POST') {
        expect(await route.request().headerValue('content-type')).toContain('multipart/form-data');
        photoUploadCount += 1;
        hasPhoto = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ photoUrl: `/api/families/${familyId}/perfumes/fragrance-e2e-1/photo` }) });
        return;
      }
      if (route.request().method() === 'DELETE') {
        photoDeleteCount += 1;
        hasPhoto = false;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'image/png', body: png });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'fragrance-e2e-1',
          house: 'Kilian',
          name: 'Smoking Hot',
          concentration: 'Eau de Parfum',
          photoUrl: hasPhoto ? `/api/families/${familyId}/perfumes/fragrance-e2e-1/photo` : null,
          catalog: {
            id: 'catalogue-smoking-hot',
            notes: [],
            accords: [],
            imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLtaQAAAABJRU5ErkJggg==',
            sourceName: 'Official source',
            catalogueStatus: 'source-attributed',
          },
          wearLogs: [],
        },
      ]),
    });
  });

  await page.goto('/?view=perfume');
  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Perfume Hub' })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel('Add or replace bottle photo for Smoking Hot').setInputFiles({
    name: 'smoking-hot.png',
    mimeType: 'image/png',
    buffer: Buffer.from('small-test-image'),
  });

  await expect(page.getByText('Smoking Hot bottle photo saved.')).toBeVisible();
  await expect(page.getByAltText('Bottle of Kilian Smoking Hot')).toBeVisible();
  await page.getByRole('button', { name: 'Remove bottle photo for Smoking Hot' }).click();
  await expect(page.getByText('Smoking Hot will now use its official image when one is available.')).toBeVisible();
  await expect(page.getByAltText('Official bottle image for Kilian Smoking Hot')).toBeVisible();
  expect(photoUploadCount).toBe(1);
  expect(photoDeleteCount).toBe(1);
});

test('a wear test uses guided sliders and saves meaningful context', async ({ page }) => {
  const wearPayloads: Array<Record<string, unknown>> = [];

  await page.route('**/api/families/*/perfumes**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recommendations')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ wearToday: [], buyNext: [] }) });
      return;
    }
    if (url.pathname.endsWith('/wear-logs') && route.request().method() === 'POST') {
      wearPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'wear-e2e-1' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'fragrance-e2e-1',
        house: 'Kilian',
        name: 'Smoking Hot',
        concentration: 'Eau de Parfum',
        createdAt: '2088-09-14T12:00:00.000Z',
        photoUrl: null,
        wearLogs: [],
      }]),
    });
  });

  await page.goto('/?view=perfume');
  await dismissSetupWizard(page);
  await page.getByLabel('Log a wear test for Kilian Smoking Hot').click();
  await expect(page.getByText('Move the sliders to capture how it actually wore for you.')).toBeVisible();
  await page.getByLabel('Enjoyment').press('End');
  await page.getByLabel('Longevity').press('End');
  await page.getByLabel('Projection').press('End');
  await expect(page.getByLabel('Enjoyment')).toHaveValue('5');
  await expect(page.getByLabel('Longevity')).toHaveValue('12');
  await expect(page.getByLabel('Projection')).toHaveValue('5');
  await expect(page.getByRole('status').filter({ hasText: 'Exceptional' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '12+ hours' })).toBeVisible();
  await page.getByRole('button', { name: 'Add optional context' }).click();
  await page.getByPlaceholder('Sprays').fill('4');
  await page.getByPlaceholder('Occasion').fill('Dinner');
  await page.getByPlaceholder('Weather').fill('Warm');
  await page.getByPlaceholder('Anything worth remembering?').fill('A rich, lasting dry down.');
  await page.getByRole('button', { name: 'Save wear test' }).click();

  await expect(page.getByText('Wear test saved for Smoking Hot.')).toBeVisible();
  expect(wearPayloads).toHaveLength(1);
  expect(wearPayloads[0]).toMatchObject({
    overallRating: 5,
    longevityHours: 12,
    projectionRating: 5,
    notes: 'A rich, lasting dry down.',
    context: { sprays: '4', occasion: 'Dinner', weather: 'Warm' },
  });
  expect(wearPayloads[0].wornAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('a fragrance wear history can correct a dated test and its longevity follow-up', async ({ page }) => {
  const updates: Array<Record<string, unknown>> = [];
  const fragrance = {
    id: 'fragrance-history-1',
    house: 'Kilian',
    name: 'Smoking Hot',
    concentration: 'Eau de Parfum',
    photoUrl: null,
    wearLogs: [{
      id: 'wear-history-1',
      wornAt: '2088-09-14T12:00:00.000Z',
      overallRating: 4,
      longevityHours: 7,
      projectionRating: 3,
      context: { sprays: '3', occasion: 'Dinner', weather: 'Warm' },
      notes: 'Original dry down.',
    }],
  };

  await page.route('**/api/families/*/perfumes**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recommendations')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ wearToday: [], buyNext: [] }) });
      return;
    }
    if (url.pathname.endsWith('/wear-logs/wear-history-1') && route.request().method() === 'PUT') {
      updates.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'wear-history-1' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fragrance]) });
  });

  await page.goto('/?view=perfume');
  await dismissSetupWizard(page);
  await page.getByRole('button', { name: 'View wear history for Smoking Hot' }).click();
  await expect(page.getByRole('dialog', { name: 'Wear history for Kilian Smoking Hot' })).toBeVisible();
  await expect(page.getByText('Weather: Warm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit wear test from 14 Sept 2088' }).click();
  await expect(page.getByLabel('Date worn')).toHaveValue('2088-09-14');
  await page.getByLabel('Longevity').press('End');
  await page.getByRole('button', { name: 'Save wear test changes' }).click();
  await expect(page.getByText('Wear test updated for Smoking Hot.')).toBeVisible();
  expect(updates).toEqual([{
    wornAt: '2088-09-14',
    overallRating: 4,
    longevityHours: 12,
    projectionRating: 3,
    notes: 'Original dry down.',
    context: { sprays: '3', occasion: 'Dinner', weather: 'Warm' },
  }]);
});

test('Angela can save a private wellbeing check-in and reminder without fertility estimates', async ({ page }) => {
  const logs: Array<Record<string, unknown>> = [];
  const reminders: Array<Record<string, unknown>> = [];
  const posts: Array<Record<string, unknown>> = [];

  await page.route('**/api/families/*/cycles**', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      posts.push(payload);
      if (payload.action === 'daily-log') {
        const log = { id: 'daily-e2e-1', ...payload, logDate: `${payload.logDate}T12:00:00.000Z` };
        logs.unshift(log);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(log) });
        return;
      }
      if (payload.action === 'reminder') {
        const existing = reminders.findIndex((item) => item.reminderType === payload.reminderType);
        const reminder = { id: `reminder-${payload.reminderType}`, ...payload };
        if (existing >= 0) reminders.splice(existing, 1, reminder); else reminders.push(reminder);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(reminder) });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: { reminderEnabled: true, reminderTime: '20:00', personalCalendarEnabled: false },
        periods: [],
        logs,
        reminders,
        calendarConnection: null,
        insights: { averageCycleLength: null, averagePeriodLength: null, predictedNextPeriod: null, confidence: 'low', irregular: false, loggedCycles: 0 },
      }),
    });
  });

  await page.goto('/?view=cycle');
  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Health & Cycle' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/fertile/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  await page.getByLabel('Energy').press('End');
  await page.getByLabel('Pain').press('ArrowRight');
  await page.getByLabel('Sleep').press('ArrowRight');
  await page.getByRole('button', { name: 'Cramps', exact: true }).click();
  await page.getByPlaceholder('Medication or supplements, optional').fill('Magnesium');
  await page.getByPlaceholder('Private note, optional').first().fill('Quiet day, manageable symptoms.');
  await page.getByRole('button', { name: 'Save private check-in' }).click();
  await expect(page.getByText('Private daily check-in saved.')).toBeVisible();

  await page.getByLabel('Period estimate days before').fill('2');
  await page.getByLabel('Period estimate reminder time').fill('19:30');
  await page.getByLabel('Period estimate days before').locator('xpath=../../..').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Period estimate reminder updated.')).toBeVisible();
  if (process.env.CAPTURE_PERFUME_E2E) {
    await page.screenshot({ path: 'output/playwright/cycle-wellbeing-e2e.png', fullPage: true });
  }

  expect(posts).toHaveLength(2);
  expect(posts[0]).toMatchObject({ action: 'daily-log', flow: 'Light', mood: 'Good', energy: 5, painLevel: 1, sleepHours: 8, medication: 'Magnesium', symptoms: ['Cramps'], notes: 'Quiet day, manageable symptoms.' });
  expect(posts[1]).toEqual({ action: 'reminder', reminderType: 'period', enabled: true, daysBefore: 2, timeOfDay: '19:30' });
});

test('Perfume and Cycle remain usable at iPhone width', async ({ page }) => {
  const noOverflow = async (view: string) => {
    const metrics = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(metrics.document, `${view} document width`).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.body, `${view} body width`).toBeLessThanOrEqual(metrics.viewport + 1);
  };

  await page.route('**/api/families/*/perfumes**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recommendations')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ wearToday: [], buyNext: [] }) });
      return;
    }
    if (url.pathname.endsWith('/catalog')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
        id: 'mobile-catalogue-smoking-hot', house: 'Kilian', name: 'Smoking Hot', concentration: 'Eau de Parfum', notes: ['vanilla'], accords: ['smoky'], source: { name: 'Official source', url: null, kind: 'official-house', status: 'source-attributed' }, isInCollection: false,
      }]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route('**/api/families/*/cycles**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ profile: { reminderEnabled: true, reminderTime: '20:00', personalCalendarEnabled: false }, periods: [], logs: [], reminders: [], calendarConnection: null, insights: { averageCycleLength: null, averagePeriodLength: null, predictedNextPeriod: null, confidence: 'low', irregular: false, loggedCycles: 0 } }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?view=perfume');
  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Perfume Hub' })).toBeVisible({ timeout: 30_000 });
  await noOverflow('Perfume Hub');
  await page.getByRole('button', { name: 'Open personal areas' }).click();
  await expect(page.getByRole('button', { name: 'Perfume', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Health & Cycle' })).toBeVisible();
  await page.getByRole('button', { name: 'Health & Cycle' }).click();
  await expect(page.getByRole('heading', { name: 'Health & Cycle' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Open personal areas' }).click();
  const closePersonalMenu = page.getByRole('button', { name: 'Close personal menu' });
  const personalCloseBounds = await closePersonalMenu.boundingBox();
  expect(personalCloseBounds?.width, 'Personal menu close button width').toBeGreaterThanOrEqual(44);
  expect(personalCloseBounds?.height, 'Personal menu close button height').toBeGreaterThanOrEqual(44);
  await closePersonalMenu.click();
  await expect(page.getByRole('button', { name: 'Close personal menu' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Health & Cycle' })).toBeVisible();
  await page.getByRole('button', { name: 'Open personal areas' }).click();
  await page.getByRole('button', { name: 'Perfume', exact: true }).click();
  await page.getByRole('button', { name: 'Browse catalogue' }).click();
  await expect(page.getByRole('dialog', { name: 'Fragrance catalogue' })).toBeVisible();
  await expect(page.getByLabel('Search catalogue')).toBeVisible();
  await noOverflow('Perfume catalogue');
  await page.getByRole('button', { name: 'Close catalogue' }).click();

  await page.goto('/?view=cycle');
  await expect(page.getByRole('heading', { name: 'Health & Cycle' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel('Energy')).toBeVisible();
  await noOverflow('Health & Cycle');
  await page.getByRole('button', { name: 'Log period' }).click();
  await expect(page.getByRole('heading', { name: 'Log a period' })).toBeVisible();
  await expect(page.getByLabel('Start date')).toBeVisible();
  await noOverflow('Period form');
  const closePeriodForm = page.getByRole('button', { name: 'Close period form' });
  const closeBounds = await closePeriodForm.boundingBox();
  expect(closeBounds?.width, 'Period close button width').toBeGreaterThanOrEqual(44);
  expect(closeBounds?.height, 'Period close button height').toBeGreaterThanOrEqual(44);
  await closePeriodForm.click();
  await expect(page.getByRole('heading', { name: 'Log a period' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Log period' })).toBeVisible();
});
