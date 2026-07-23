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
        familyMember: { id: memberId, name: 'Angela' },
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
          fertileWindow: null,
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
  await expect(page.getByRole('button', { name: /^Period$/ })).toBeVisible();

  await page.getByRole('button', { name: /^Period$/ }).click();
  await page.getByLabel('Start date').fill('2088-09-14');
  await page.getByLabel('End date, optional').fill('2088-09-18');
  await page.getByPlaceholder('Private note, optional').fill('E2E private period note');
  await page.getByRole('button', { name: /^Save$/ }).click();

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
  const catalogQueries: string[] = [];

  await page.route('**/api/families/*/perfumes**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/recommendations')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ wearToday: [], buyNext: [] }) });
      return;
    }
    if (url.pathname.endsWith('/catalog')) {
      catalogQueries.push(url.searchParams.get('q') || '');
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
  await expect.poll(() => catalogQueries.some((query) => query === 'Smoking')).toBe(true);
  await page.getByRole('button', { name: 'Add bottle' }).click();

  await expect(page.getByText('Kilian Smoking Hot added to your private collection.')).toBeVisible();
  await expect(page.getByLabel('Log a wear test for Kilian Smoking Hot')).toBeVisible();
  await expect(page.getByText('Woody amber · smoke · apple · vanilla · 2023')).toBeVisible();
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
  await page.getByRole('button', { name: 'Confirm and save' }).click();

  await expect(page.getByText('Fragrance saved to your private collection.')).toBeVisible();
  expect(confirmationPayloads).toEqual([{
    house: 'KILIAN PARIS',
    name: 'Smoking Hot',
    concentration: 'Eau de Parfum',
  }]);
});

test('a collection perfume accepts a direct bottle photo', async ({ page }) => {
  let hasPhoto = false;
  let photoUploadCount = 0;

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
      await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('small-test-image') });
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
  expect(photoUploadCount).toBe(1);
});
