import { expect, test, type Page } from '@playwright/test';

const familyId = 'journey-boundary-family';
const memberId = 'journey-boundary-angela';

const mockAuthenticatedAngela = async (page: Page) => {
  await page.addInitScript(({ activeFamilyId, activeMemberId }) => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    localStorage.setItem('familyId', activeFamilyId);
    localStorage.setItem('familyMembers', JSON.stringify([{
      id: activeMemberId,
      familyId: activeFamilyId,
      name: 'Angela',
      role: 'Parent',
      ageGroup: 'Adult',
      color: '#d8527d',
      icon: 'A',
    }]));
  }, { activeFamilyId: familyId, activeMemberId: memberId });

  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'journey-angela-user', email: 'angela@example.test', displayName: 'Angela' },
        family: { id: familyId, familyName: 'Journey household', members: [] },
        familyMember: { id: memberId, name: 'Angela', privateCycleAccess: true },
        needsOnboarding: false,
      }),
    });
  });
};

test('signed-out household entry reaches the visible sign-in screen', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Sign in is required' }),
    });
  });

  await page.goto('/');

  await expect(page).toHaveURL(/\/auth\/sign-in$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Your household, securely yours.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('an authenticated account awaiting a household reaches the join screen', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'journey-pending-user', email: 'pending@example.test' },
        family: null,
        familyMember: null,
        accessPending: true,
        needsOnboarding: false,
      }),
    });
  });

  await page.goto('/');

  await expect(page).toHaveURL(/\/auth\/join$/);
  await expect(page.getByRole('heading', { name: 'Join your Family Hub.' })).toBeVisible();
  await expect(page.getByLabel('Household invite code')).toBeVisible();
});

const privateStates = [
  {
    name: 'another profile',
    status: 404,
    body: { error: 'Private area', privateArea: true },
    heading: "This is another profile's private area.",
  },
  {
    name: 'signed-out private request',
    status: 401,
    body: { error: 'Sign in is required' },
    heading: 'Sign in to open your private area.',
  },
  {
    name: 'private service failure',
    status: 500,
    body: { error: 'Test private service failure.' },
    heading: 'Private area unavailable.',
  },
];

for (const state of privateStates) {
  test(`Cycle shows its ${state.name} boundary on screen`, async ({ page }) => {
    await mockAuthenticatedAngela(page);
    await page.route('**/api/families/*/cycles**', async (route) => {
      await route.fulfill({
        status: state.status,
        contentType: 'application/json',
        body: JSON.stringify(state.body),
      });
    });

    await page.goto('/?view=cycle');

    await expect(page.getByRole('heading', { name: state.heading })).toBeVisible({ timeout: 30_000 });
    if (state.status === 500) {
      await expect(page.getByText('Test private service failure.')).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Log period' })).toHaveCount(0);
  });
}
