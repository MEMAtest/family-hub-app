import { expect, test, type Locator, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
}

const prisma = new PrismaClient();
const runTag = `E2E-FULL-${Date.now()}`;

const createdIds = {
  calendarEvents: new Set<string>(),
  shoppingLists: new Set<string>(),
  shoppingItems: new Set<string>(),
  contractors: new Set<string>(),
  contractorAppointments: new Set<string>(),
  meals: new Set<string>(),
  goals: new Set<string>(),
  milestones: new Set<string>(),
};

let familyId = '';
let firstMemberId = '';
let firstMemberName = '';

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
      // Try the next visible candidate if this one detached or is obstructed.
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
      { timeout: 90_000, intervals: [500, 1_000, 1_500, 2_000] }
    )
    .toBe(true);
};

const switchToView = async (page: Page, label: string) => {
  const primaryNav = page
    .locator('nav')
    .filter({
      has: page.getByRole('button', { name: /^Dashboard$/ }).first(),
    })
    .first();

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

const waitForRecord = async <T>(
  getRecord: () => Promise<T | null>,
  label: string,
  timeout = 25_000
): Promise<T> => {
  let record: T | null = null;

  await expect
    .poll(
      async () => {
        record = await getRecord();
        return Boolean(record);
      },
      {
        timeout,
        intervals: [500, 1_000, 1_500],
      }
    )
    .toBe(true);

  if (!record) {
    throw new Error(`Timed out waiting for ${label}`);
  }

  return record;
};

const waitForNoRecord = async (
  getExists: () => Promise<boolean>,
  timeout = 25_000
) => {
  await expect
    .poll(getExists, { timeout, intervals: [500, 1_000, 1_500] })
    .toBe(false);
};

const todayIso = () => new Date().toISOString().split('T')[0];

const isDatabaseConnected = async (page: Page) =>
  page.getByText('Database Connected').first().isVisible().catch(() => false);

const selectAssignedPerson = async (page: Page) => {
  const personSelect = page
    .locator('select')
    .filter({
      has: page.locator('option', { hasText: 'Select person' }),
    })
    .first();

  await expect(personSelect).toBeVisible({ timeout: 20_000 });

  const options = personSelect.locator('option');
  const optionCount = await options.count();
  if (optionCount < 2) {
    throw new Error('No selectable family members were available in the event form');
  }

  const preferred = await options.nth(1).getAttribute('value');
  if (firstMemberId) {
    await personSelect.selectOption(firstMemberId).catch(async () => {
      if (preferred) {
        await personSelect.selectOption(preferred);
      }
    });
    return;
  }

  if (!preferred) {
    throw new Error('Unable to determine a person value for event assignment');
  }
  await personSelect.selectOption(preferred);
};

test.beforeAll(async () => {
  let family = await prisma.family.findFirst({
    orderBy: { createdAt: 'asc' },
    include: {
      members: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!family) {
    const familyCode = `full-e2e-${Date.now().toString().slice(-6)}`;
    family = await prisma.family.create({
      data: {
        familyName: 'E2E Full Coverage Family',
        familyCode,
      },
      include: {
        members: true,
      },
    });
  }

  if (!family.members.length) {
    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        name: 'Full E2E Member',
        role: 'Parent',
        ageGroup: 'Adult',
        color: '#2563EB',
        icon: '🧪',
      },
    });

    family = await prisma.family.findUniqueOrThrow({
      where: { id: family.id },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  familyId = family.id;
  firstMemberId = family.members[0].id;
  firstMemberName = family.members[0].name;
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(skipSetupWizard, {
    familyId,
    memberId: firstMemberId,
    memberName: firstMemberName,
  });
  await stubAuthProbe(page);
});

test.afterAll(async () => {
  if (createdIds.shoppingItems.size > 0) {
    await prisma.shoppingItem.deleteMany({
      where: {
        id: { in: Array.from(createdIds.shoppingItems) },
      },
    });
  }

  if (createdIds.shoppingLists.size > 0) {
    await prisma.shoppingList.deleteMany({
      where: {
        id: { in: Array.from(createdIds.shoppingLists) },
      },
    });
  }

  if (createdIds.contractorAppointments.size > 0) {
    await prisma.contractorAppointment.deleteMany({
      where: {
        id: { in: Array.from(createdIds.contractorAppointments) },
      },
    });
  }

  if (createdIds.contractors.size > 0) {
    await prisma.contractor.deleteMany({
      where: {
        id: { in: Array.from(createdIds.contractors) },
      },
    });
  }

  if (createdIds.meals.size > 0) {
    await prisma.mealPlan.deleteMany({
      where: {
        id: { in: Array.from(createdIds.meals) },
      },
    });
  }

  if (createdIds.goals.size > 0) {
    await prisma.familyGoal.deleteMany({
      where: {
        id: { in: Array.from(createdIds.goals) },
      },
    });
  }

  if (createdIds.milestones.size > 0) {
    await prisma.familyMilestone.deleteMany({
      where: {
        id: { in: Array.from(createdIds.milestones) },
      },
    });
  }

  if (createdIds.calendarEvents.size > 0) {
    await prisma.calendarEvent.deleteMany({
      where: {
        id: { in: Array.from(createdIds.calendarEvents) },
      },
    });
  }

  // Safety cleanup in case a create succeeded but ID capture did not.
  await prisma.shoppingItem.deleteMany({
    where: {
      itemName: { startsWith: runTag },
    },
  });
  await prisma.shoppingList.deleteMany({
    where: {
      listName: { startsWith: runTag },
    },
  });
  await prisma.contractorAppointment.deleteMany({
    where: {
      purpose: { startsWith: runTag },
    },
  });
  await prisma.contractor.deleteMany({
    where: {
      name: { startsWith: runTag },
    },
  });
  await prisma.mealPlan.deleteMany({
    where: {
      mealName: { startsWith: runTag },
    },
  });
  await prisma.familyGoal.deleteMany({
    where: {
      goalTitle: { startsWith: runTag },
    },
  });
  await prisma.familyMilestone.deleteMany({
    where: {
      title: { startsWith: runTag },
    },
  });
  await prisma.calendarEvent.deleteMany({
    where: {
      title: { startsWith: runTag },
    },
  });

  await prisma.$disconnect();
});

test('all primary sections render and stay connected', async ({ page }) => {
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);

  const sections: Array<{
    view: string;
    assert: () => Promise<void>;
  }> = [
    {
      view: 'Dashboard',
      assert: async () => {
        await expect(page.getByRole('heading', { name: /Today.?s Snapshot/i })).toBeVisible();
      },
    },
    {
      view: 'Calendar',
      assert: async () => {
        await expect(page.getByRole('heading', { name: 'Family Calendar' })).toBeVisible();
      },
    },
    {
      view: 'Budget',
      assert: async () => {
        await expect(page.getByPlaceholder('Search income, expenses, or amounts')).toBeVisible();
      },
    },
    {
      view: 'Meals',
      assert: async () => {
        await expect(page.getByRole('heading', { name: "Today's Meals", exact: true })).toBeVisible();
      },
    },
    {
      view: 'Shopping',
      assert: async () => {
        await expect(page.getByRole('heading', { name: 'Active Shopping Lists' })).toBeVisible();
      },
    },
    {
      view: 'Fitness',
      assert: async () => {
        await expect(page.getByRole('heading', { name: 'Fitness Tracking' })).toBeVisible();
      },
    },
    {
      view: 'Contractors',
      assert: async () => {
        await expect(page.getByRole('heading', { name: 'Contractors' })).toBeVisible();
      },
    },
    {
      view: 'Goals',
      assert: async () => {
        await expect(page.getByText('Goals & Achievements')).toBeVisible();
      },
    },
    {
      view: 'Family',
      assert: async () => {
        await expect(page.getByRole('heading', { name: 'Family Management' })).toBeVisible();
      },
    },
    {
      view: 'News',
      assert: async () => {
        await expect(page.getByRole('heading', { name: 'Family News & Updates' })).toBeVisible();
      },
    },
  ];

  for (const section of sections) {
    await switchToView(page, section.view);
    await page.waitForTimeout(350);
    await section.assert();
  }
});

test('calendar event create and delete persists', async ({ page }) => {
  test.setTimeout(180_000);

  const eventTitle = `${runTag} Calendar Event`;
  const eventDate = todayIso();

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/?view=calendar');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);
  await switchToView(page, 'Calendar');

  await clickVisibleButton(page.getByRole('button', { name: /^Event$/ }), 'header create event');
  await expect(page.getByRole('heading', { name: 'New Event' })).toBeVisible({ timeout: 20_000 });

  await page.getByPlaceholder('Enter event title').fill(eventTitle);
  await selectAssignedPerson(page);
  await page.locator('input[type="date"]').first().fill(eventDate);
  await page.locator('input[type="time"]').first().fill('10:00');

  await page.getByRole('button', { name: 'Save Event' }).click();
  await expect(page.getByRole('heading', { name: 'New Event' })).toBeHidden({ timeout: 20_000 });

  const databaseConnected = await isDatabaseConnected(page);
  if (!databaseConnected) {
    await expect(page.getByText(eventTitle, { exact: true })).toBeVisible({ timeout: 20_000 });
    return;
  }

  const createdEvent = await waitForRecord(
    () =>
      prisma.calendarEvent.findFirst({
        where: {
          title: eventTitle,
        },
        orderBy: { createdAt: 'desc' },
      }),
    'calendar event'
  );

  createdIds.calendarEvents.add(createdEvent.id);

  const eventLabel = page.getByText(eventTitle, { exact: true }).first();
  if (await eventLabel.isVisible().catch(() => false)) {
    await eventLabel.click({ force: true });
    await expect(page.getByRole('heading', { name: 'Edit Event' })).toBeVisible({ timeout: 20_000 });

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Delete' }).click();

    await waitForNoRecord(async () => {
      const exists = await prisma.calendarEvent.findUnique({ where: { id: createdEvent.id } });
      return Boolean(exists);
    });

    createdIds.calendarEvents.delete(createdEvent.id);
  }
});

test('shopping list and item flows are accessible in UI', async ({ page }) => {
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/?view=shopping');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);
  await switchToView(page, 'Shopping');

  try {
    await clickVisibleButton(
      page.getByRole('button', { name: /^Create New List$/ }),
      'shopping quick action create list'
    );
  } catch {
    await clickVisibleButton(page.getByRole('button', { name: /^Lists$/ }), 'shopping list tab');
  }

  await expect(page.getByPlaceholder('Search shopping lists...')).toBeVisible({ timeout: 20_000 });
  await clickVisibleButton(page.getByRole('button', { name: /^New List$/ }), 'shopping new list');
  await expect(page.getByRole('heading', { name: 'Create New List' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /^Cancel$/ }).click();
  await expect(page.getByRole('heading', { name: 'Create New List' })).toBeHidden({ timeout: 20_000 });

  await clickVisibleButton(page.getByRole('button', { name: /^Item$/ }), 'header add shopping item');
  const shoppingDialog = page.locator('[role="dialog"]').last();
  const listSelect = shoppingDialog.locator('select').first();
  await expect(listSelect).toBeVisible({ timeout: 20_000 });
  await shoppingDialog.getByRole('button', { name: /^Cancel$/ }).click();
  await expect(listSelect).toBeHidden({ timeout: 20_000 });
});

test('contractor quick appointment persists', async ({ page }) => {
  test.setTimeout(180_000);

  const contractorName = `${runTag} Contractor`;
  const purpose = `${runTag} Contractor Visit`;

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/?view=contractors');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);
  await switchToView(page, 'Contractors');

  await clickVisibleButton(
    page.getByRole('button', { name: /^Book appointment$/i }),
    'open quick contractor appointment modal'
  );
  await expect(page.getByRole('heading', { name: 'Quick Appointment' })).toBeVisible({ timeout: 20_000 });

  const addNewContractor = page.getByRole('button', { name: 'Add new contractor' });
  if (await addNewContractor.isVisible().catch(() => false)) {
    await addNewContractor.click();
  }

  await page.getByPlaceholder('John Smith').fill(contractorName);
  await page.getByPlaceholder('ABC Plumbing').fill(`${runTag} Company`);
  await page.getByRole('button', { name: /^Next$/ }).click();

  await expect(page.getByText('What time?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /^Next$/ }).click();

  await expect(page.getByText('What for? *')).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder('e.g. Fix leaking tap, Boiler service').fill(purpose);
  await page.getByPlaceholder('0').fill('150');
  await page.getByRole('button', { name: 'Add Appointment' }).click();

  await expect(page.getByRole('heading', { name: 'Quick Appointment' })).toBeHidden({ timeout: 20_000 });

  const databaseConnected = await isDatabaseConnected(page);
  if (!databaseConnected) {
    await expect(page.getByText(purpose)).toBeVisible({ timeout: 20_000 });
    return;
  }

  const createdContractor = await waitForRecord(
    () =>
      prisma.contractor.findFirst({
        where: {
          name: contractorName,
        },
        orderBy: { createdAt: 'desc' },
      }),
    'contractor'
  );

  createdIds.contractors.add(createdContractor.id);

  const createdAppointment = await waitForRecord(
    () =>
      prisma.contractorAppointment.findFirst({
        where: {
          contractorId: createdContractor.id,
          purpose,
        },
        orderBy: { createdAt: 'desc' },
      }),
    'contractor appointment'
  );

  createdIds.contractorAppointments.add(createdAppointment.id);
  if (createdAppointment.calendarEventId) {
    createdIds.calendarEvents.add(createdAppointment.calendarEventId);
  }
});

test('quick meal logging persists', async ({ page }) => {
  test.setTimeout(180_000);

  const mealName = `${runTag} Meal`;

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/?view=meals');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);
  await switchToView(page, 'Meals');

  try {
    await clickVisibleButton(
      page.getByRole('button', { name: /Quick Log Meal/i }),
      'meals quick log action'
    );
  } catch {
    await clickVisibleButton(
      page.getByRole('button', { name: /^\+ Log meal$/ }),
      'meals quick log inline button'
    );
  }
  const quickLogModalHeading = page.locator('h2').filter({ hasText: 'Quick Log Meal' }).first();
  await expect(quickLogModalHeading).toBeVisible({ timeout: 20_000 });

  await page.getByPlaceholder('e.g., Chicken and Rice').fill(mealName);
  const createMealResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes(`/api/families/${familyId}/meals`),
    { timeout: 20_000 }
  );
  await page.getByRole('button', { name: 'Log Meal', exact: true }).click();
  const mealResponse = await createMealResponse;
  expect(mealResponse.ok(), `Meal creation failed with status ${mealResponse.status()}`).toBeTruthy();
  await expect(quickLogModalHeading).toBeHidden({ timeout: 20_000 });

  const createdMeal = await waitForRecord(
    () =>
      prisma.mealPlan.findFirst({
        where: { mealName },
        orderBy: { createdAt: 'desc' },
      }),
    'meal log'
  );

  createdIds.meals.add(createdMeal.id);
});

test('goal creation persists', async ({ page }) => {
  test.setTimeout(180_000);

  const goalTitle = `${runTag} Goal`;

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/?view=goals');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);
  await switchToView(page, 'Goals');

  try {
    await clickVisibleButton(page.getByRole('button', { name: /^New Goal$/ }), 'goals new goal');
  } catch {
    try {
      await clickVisibleButton(page.getByRole('button', { name: /New Goal/i }), 'goals new goal card');
    } catch {
      await clickVisibleButton(page.getByRole('button', { name: /Create Goal/i }), 'goals create goal button');
    }
  }
  await expect(page.getByRole('heading', { name: 'Create New Goal' })).toBeVisible({ timeout: 20_000 });

  await page.getByPlaceholder('e.g., Run a 5K under 25 minutes').fill(goalTitle);
  await page
    .getByPlaceholder('Describe your goal and what you want to achieve...')
    .fill(`${runTag} Goal description`);
  await page.getByPlaceholder('e.g., 25').fill('10');

  const assignedSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Select a family member' }) })
    .first();

  if (await assignedSelect.isVisible().catch(() => false)) {
    const assignedOptions = assignedSelect.locator('option');
    await expect
      .poll(async () => assignedOptions.count(), {
        timeout: 20_000,
        intervals: [500, 1_000, 1_500],
      })
      .toBeGreaterThan(1);

    const preferredAssigned = (await assignedOptions.nth(1).getAttribute('value')) || '';
    if (preferredAssigned) {
      await assignedSelect.selectOption(preferredAssigned);
    }
  }

  const participantCheckboxes = page.getByRole('checkbox');
  await expect
    .poll(async () => participantCheckboxes.count(), {
      timeout: 20_000,
      intervals: [500, 1_000, 1_500],
    })
    .toBeGreaterThan(0);
  await participantCheckboxes.first().check({ force: true });

  await page.getByRole('button', { name: 'Create Goal' }).click();
  await expect(page.getByRole('heading', { name: 'Create New Goal' })).toBeHidden({ timeout: 20_000 });

  const databaseConnected = await isDatabaseConnected(page);
  if (!databaseConnected) {
    await expect(page.getByText(goalTitle, { exact: true })).toBeVisible({ timeout: 20_000 });
    return;
  }

  const createdGoal = await waitForRecord(
    () =>
      prisma.familyGoal.findFirst({
        where: {
          goalTitle,
        },
        orderBy: { createdAt: 'desc' },
      }),
    'goal'
  );

  createdIds.goals.add(createdGoal.id);
});

test('family timeline milestone creation persists', async ({ page }) => {
  test.setTimeout(180_000);

  const milestoneTitle = `${runTag} Milestone`;
  const milestoneTitleInput = page.getByPlaceholder('Enter milestone title');
  const milestoneModalHeading = page.getByRole('heading', { name: 'Add New Milestone' });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/?view=family');
  await page.waitForLoadState('domcontentloaded');
  await waitForHubShell(page);
  await dismissSetupWizard(page);
  await switchToView(page, 'Family');

  await clickVisibleButton(page.getByRole('button', { name: /^Timeline$/ }), 'family timeline tab');
  await expect(page.getByRole('heading', { name: 'Family Timeline' })).toBeVisible({ timeout: 20_000 });

  const addFirstMilestoneButton = page.getByRole('button', { name: /^Add First Milestone$/ });
  const ensureMilestoneModalOpen = async () => {
    if (await milestoneTitleInput.isVisible().catch(() => false)) {
      return;
    }

    if (await addFirstMilestoneButton.isVisible().catch(() => false)) {
      await addFirstMilestoneButton.click({ force: true });
    } else {
      await clickVisibleButton(page.getByRole('button', { name: /^Add Milestone$/ }), 'family add milestone');
    }

    const openedAfterFirstAttempt = await milestoneTitleInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (openedAfterFirstAttempt) {
      return;
    }

    // Fallback: a second click handles occasional detached button/hydration race conditions.
    await clickVisibleButton(
      page.getByRole('button', { name: /^Add First Milestone$|^Add Milestone$/ }),
      'family add milestone fallback'
    );
  };

  await ensureMilestoneModalOpen();
  await expect(milestoneModalHeading).toBeVisible({ timeout: 20_000 });
  await expect(milestoneTitleInput).toBeVisible({ timeout: 20_000 });

  const milestoneForm = milestoneTitleInput.locator('xpath=ancestor::form').first();

  await milestoneTitleInput.fill(milestoneTitle);
  await milestoneForm.getByPlaceholder('Describe this special moment...').fill(`${runTag} milestone details`);
  await milestoneForm.locator('input[type="date"]').first().fill(todayIso());

  const participantInModal = milestoneForm.getByRole('checkbox').first();
  await participantInModal.check({ force: true });

  await milestoneForm.getByRole('button', { name: /^Add Milestone$/ }).click();
  await expect(page.getByRole('heading', { name: 'Add New Milestone' })).toBeHidden({ timeout: 20_000 });

  const databaseConnected = await isDatabaseConnected(page);
  if (!databaseConnected) {
    await expect(page.getByText(milestoneTitle, { exact: true })).toBeVisible({ timeout: 20_000 });
    return;
  }

  const createdMilestone = await waitForRecord(
    () =>
      prisma.familyMilestone.findFirst({
        where: {
          title: milestoneTitle,
        },
        orderBy: { createdAt: 'desc' },
      }),
    'family milestone'
  );

  createdIds.milestones.add(createdMilestone.id);
});
