import { expect, test, type Locator, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
}

const prisma = new PrismaClient();
const createdFitnessIds = new Set<string>();
let familyId = '';
let memberId = '';
let memberName = '';

test.describe.configure({ mode: 'serial' });

const skipSetupWizard = (bootstrap?: {
  familyId?: string;
  memberId?: string;
  memberName?: string;
}) => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
  if (bootstrap?.familyId) {
    localStorage.setItem('familyId', bootstrap.familyId);
  }
  if (bootstrap?.memberId && bootstrap?.familyId) {
    localStorage.setItem(
      'familyMembers',
      JSON.stringify([
        {
          id: bootstrap.memberId,
          familyId: bootstrap.familyId,
          name: bootstrap.memberName ?? 'Family Member',
          role: 'Parent',
          ageGroup: 'Adult',
          color: '#2563EB',
          icon: '🧪',
        },
      ])
    );
  }
};

const stubAuthProbe = async (page: Page) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'playwright-open-user',
          email: 'playwright@family-hub.app',
          displayName: 'Playwright User',
        },
        family: null,
        familyMember: null,
        needsOnboarding: false,
      }),
    });
  });
};

const dismissSetupWizard = async (page: Page) => {
  const skipButton = page.getByRole('button', { name: 'Skip Setup' });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(400);
  }
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const clickVisibleButton = async (locator: Locator, description: string) => {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const button = locator.nth(index);
    await button.scrollIntoViewIfNeeded().catch(() => undefined);
    if (!(await button.isVisible().catch(() => false))) {
      continue;
    }

    try {
      await button.click({ timeout: 3_000, force: true });
      return;
    } catch {
      // Try the next matching button if this candidate is obstructed or detached.
    }
  }
  throw new Error(`No visible button found for ${description}`);
};

const waitForHubShell = async (page: Page) => {
  await expect
    .poll(
      async () => {
        const primaryDashboardButton = page.getByRole('button', { name: /^Dashboard$/ }).first();
        return primaryDashboardButton.isVisible().catch(() => false);
      },
      { timeout: 90_000, intervals: [500, 1000, 1500, 2000] }
    )
    .toBe(true);
};

const switchToView = async (page: Page, label: string) => {
  const primaryNav = page.locator('nav').filter({
    has: page.getByRole('button', { name: /^Dashboard$/ }).first(),
  }).first();

  const exactMatch = primaryNav.getByRole('button', {
    name: new RegExp(`^${escapeRegex(label)}$`),
  });
  try {
    await clickVisibleButton(exactMatch, `view "${label}" (exact)`);
    return;
  } catch {
    const textMatch = primaryNav.locator('button').filter({ hasText: label });
    await clickVisibleButton(textMatch, `view "${label}" (text)`);
  }
};

const assertNoHorizontalOverflow = async (page: Page, view: string) => {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    docWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(
    metrics.docWidth,
    `${view}: document width ${metrics.docWidth}px exceeds viewport ${metrics.viewport}px`
  ).toBeLessThanOrEqual(metrics.viewport + 1);

  expect(
    metrics.bodyWidth,
    `${view}: body width ${metrics.bodyWidth}px exceeds viewport ${metrics.viewport}px`
  ).toBeLessThanOrEqual(metrics.viewport + 1);
};

const waitForFitnessByName = async (workoutName: string, timeoutMs = 25_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const record = await prisma.fitnessTracking.findFirst({
      where: { workoutName },
      orderBy: { createdAt: 'desc' },
    });
    if (record) return record;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
};

test.beforeAll(async () => {
  const firstFamily = await prisma.family.findFirst({
    orderBy: { createdAt: 'asc' },
    include: { members: true },
  });

  if (firstFamily && firstFamily.members.length > 0) {
    familyId = firstFamily.id;
    memberId = firstFamily.members[0].id;
    memberName = firstFamily.members[0].name;
    return;
  }

  if (firstFamily) {
    const createdMember = await prisma.familyMember.create({
      data: {
        familyId: firstFamily.id,
        name: 'Mobile Test Member',
        role: 'Parent',
        ageGroup: 'Adult',
        color: '#2563EB',
        icon: '🧪',
      },
    });
    familyId = firstFamily.id;
    memberId = createdMember.id;
    memberName = createdMember.name;
    return;
  }

  const familyCode = `e2e-${Date.now().toString().slice(-6)}`;
  const createdFamily = await prisma.family.create({
    data: {
      familyName: 'E2E Mobile Family',
      familyCode,
    },
  });

  const createdMember = await prisma.familyMember.create({
    data: {
      familyId: createdFamily.id,
      name: 'Mobile Test Member',
      role: 'Parent',
      ageGroup: 'Adult',
      color: '#2563EB',
      icon: '🧪',
    },
  });

  familyId = createdFamily.id;
  memberId = createdMember.id;
  memberName = createdMember.name;
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(skipSetupWizard, { familyId, memberId, memberName });
  await stubAuthProbe(page);
});

test.afterAll(async () => {
  if (createdFitnessIds.size > 0) {
    await prisma.fitnessTracking.deleteMany({
      where: {
        id: { in: Array.from(createdFitnessIds) },
      },
    });
  }
  await prisma.$disconnect();
});

test('mobile views render without horizontal overflow', async ({ page }) => {
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);

  const viewLabels = [
    'Dashboard',
    'Calendar',
    'Budget',
    'Meals',
    'Shopping',
    'Fitness',
    'Contractors',
    'Goals',
    'Family',
    'News',
  ];

  for (const label of viewLabels) {
    await switchToView(page, label);
    await page.waitForTimeout(450);
    await assertNoHorizontalOverflow(page, label);
  }
});

test('mobile fitness add, edit, and delete persists end-to-end', async ({ page }) => {
  test.setTimeout(180_000);

  const stamp = Date.now();
  const workoutName = `E2E Mobile Workout ${stamp}`;
  const initialNote = `E2E mobile create note ${stamp}`;
  const updatedNote = `E2E mobile update note ${stamp}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?view=fitness');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);
  await expect(page.getByRole('heading', { name: 'Fitness Tracking' })).toBeVisible({ timeout: 60_000 });

  await clickVisibleButton(page.getByRole('button', { name: /^(Log Activity|Log)$/ }), 'fitness log activity button');
  await expect(page.getByText('What did you do today?')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Gym / Weights' }).click();
  await expect(page.getByText('How long was your workout?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('What exercises did you do?')).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder('e.g., Push Day, Upper Body, Leg Day').fill(workoutName);
  await page.getByPlaceholder('Search exercises...').fill('Bench Press');
  await page.getByRole('button', { name: /Bench Press/ }).first().click();
  await page.getByRole('button', { name: 'Continue to sets & reps' }).click();

  await expect(page.getByText('Add your sets and reps')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Any other activities?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('How did it go?')).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder('Any other thoughts about your workout...').fill(initialNote);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Add screenshots or photos')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Review your workout')).toBeVisible({ timeout: 20_000 });
  const createRequestPromise = page.waitForRequest(
    (request) =>
      request.url().includes('/api/families/') &&
      request.url().endsWith('/fitness') &&
      request.method() === 'POST' &&
      (request.postData() || '').includes(initialNote),
    { timeout: 20_000 }
  );
  await page.getByRole('button', { name: 'Save Workout' }).click();
  const createRequest = await createRequestPromise;
  const createResponse = await createRequest.response();
  expect(createResponse?.ok()).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Save Workout' })).toBeHidden({ timeout: 20_000 });

  const created = await waitForFitnessByName(workoutName);
  expect(created).not.toBeNull();
  const activityId = created!.id;
  createdFitnessIds.add(activityId);
  expect(created!.notes || '').toContain(initialNote);

  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible({ timeout: 20_000 });

  const workoutLabel = page.getByText(workoutName, { exact: true }).first();
  await expect(workoutLabel).toBeVisible({ timeout: 20_000 });

  const historyRow = workoutLabel.locator(
    'xpath=ancestor::div[contains(@class,"flex items-start justify-between")]'
  );
  await historyRow.locator('button[title="Edit"]').click();

  await expect(page.getByText('Review your workout')).toBeVisible({ timeout: 20_000 });
  const notesEditButton = page
    .locator('xpath=//h4[normalize-space()="Notes"]/ancestor::div[1]//button[normalize-space()="Edit"]')
    .first();
  await notesEditButton.click();

  await expect(page.getByText('How did it go?')).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder('Any other thoughts about your workout...').fill(updatedNote);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Add screenshots or photos')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Review your workout')).toBeVisible({ timeout: 20_000 });
  const updateRequestPromise = page.waitForRequest(
    (request) =>
      request.url().includes('/api/families/') &&
      request.url().includes('/fitness') &&
      (request.method() === 'PUT' || request.method() === 'POST') &&
      (request.postData() || '').includes(updatedNote),
    { timeout: 20_000 }
  );
  await page.getByRole('button', { name: 'Save Workout' }).click();
  const updateRequest = await updateRequestPromise;
  const updatePayload = updateRequest.postData() || '';
  expect(updateRequest.method()).toBe('PUT');
  expect(updateRequest.url()).toContain(`/fitness/${activityId}`);
  expect(updatePayload).toContain(updatedNote);
  await expect(page.getByRole('button', { name: 'Save Workout' })).toBeHidden({ timeout: 20_000 });

  await expect
    .poll(
      async () => {
        const record = await prisma.fitnessTracking.findUnique({ where: { id: activityId } });
        return record?.notes || '';
      },
      { timeout: 25_000, intervals: [500, 1000, 1500] }
    )
    .toContain(updatedNote);

  await page.getByRole('button', { name: 'History' }).click();
  const updatedWorkoutLabel = page.getByText(workoutName, { exact: true }).first();
  await expect(updatedWorkoutLabel).toBeVisible({ timeout: 20_000 });

  const updatedRow = updatedWorkoutLabel.locator(
    'xpath=ancestor::div[contains(@class,"flex items-start justify-between")]'
  );
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await updatedRow.locator('button[title="Delete"]').click();

  await expect(updatedWorkoutLabel).not.toBeVisible({ timeout: 20_000 });

  await expect
    .poll(async () => {
      const record = await prisma.fitnessTracking.findUnique({ where: { id: activityId } });
      return Boolean(record);
    }, { timeout: 25_000, intervals: [500, 1000, 1500] })
    .toBe(false);

  createdFitnessIds.delete(activityId);
});
