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
