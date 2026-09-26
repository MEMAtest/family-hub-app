import { expect, test, type Browser, type Page } from '@playwright/test';
import { createTestPrisma, hasTestDatabase, TEST_DATABASE_REQUIRED } from './test-database';

/**
 * Household data that used to live in one browser (property issues, kids
 * bookmarks, Monday email settings) is shared through family_documents.
 * Each test uses two browser contexts with separate storage, standing in for
 * two parents' phones.
 */

test.skip(!hasTestDatabase, TEST_DATABASE_REQUIRED);
test.describe.configure({ mode: 'serial' });

const prisma = createTestPrisma();
let familyId = '';

const skipSetupWizard = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
};

const newDevice = async (browser: Browser) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(skipSetupWizard);
  const page = await context.newPage();
  return { context, page };
};

const waitForHubShell = async (page: Page) => {
  await expect(page.getByRole('button', { name: /^Dashboard$/ }).first()).toBeVisible({ timeout: 90_000 });
};

const openView = async (page: Page, label: string) => {
  await page.locator('nav, aside').getByRole('button', { name: new RegExp(`^${label}$`) }).first().click();
};

const openIssues = async (page: Page) => {
  await page.goto('/');
  await waitForHubShell(page);
  await openView(page, 'Property');
  await page.getByRole('button', { name: /Issues/ }).first().click();
  await expect(page.getByLabel('Describe the issue')).toBeVisible({ timeout: 30_000 });
};

const openKidsEvents = async (page: Page) => {
  await page.goto('/');
  await waitForHubShell(page);
  await openView(page, 'News');
  await page.getByRole('button', { name: /Kids Events/ }).click();
  await expect(page.getByText(/things to do/i).first()).toBeVisible({ timeout: 30_000 });
};

const sharedDocument = async (key: string) =>
  prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key } } });

const waitForDocument = async (key: string, predicate: (data: any) => boolean) => {
  await expect
    .poll(async () => {
      const doc = await sharedDocument(key);
      return doc ? predicate(doc.data) : false;
    }, { timeout: 30_000, intervals: [500, 1000] })
    .toBe(true);
};

test.beforeAll(async () => {
  let family = await prisma.family.findFirst({ orderBy: { createdAt: 'asc' }, include: { members: true } });
  if (!family) {
    family = await prisma.family.create({
      data: { familyName: 'E2E Sharing Family', familyCode: `share-${Date.now().toString().slice(-6)}` },
      include: { members: true },
    });
  }
  if (family.members.length === 0) {
    await prisma.familyMember.create({
      data: { familyId: family.id, name: 'Sharing Parent', role: 'Parent', ageGroup: 'Adult', color: '#2563EB', icon: '🧪' },
    });
  }
  familyId = family.id;
  await prisma.familyDocument.deleteMany({ where: { familyId } });
});

test.afterAll(async () => {
  await prisma.familyDocument.deleteMany({ where: { familyId } });
  await prisma.$disconnect();
});

test('an issue logged on one phone shows up, and gets ticked off, on the other', async ({ browser }) => {
  const first = await newDevice(browser);
  await openIssues(first.page);

  await first.page.getByLabel('Describe the issue').fill('gutters need clearing and clean windows');
  await first.page.getByRole('button', { name: /log it/i }).click();
  await expect(first.page.getByText(/before saving/i)).toBeVisible({ timeout: 30_000 });
  await expect(first.page.getByLabel('Title')).toHaveCount(2);
  await first.page.getByRole('button', { name: /^Save \d+ issues$/ }).click();
  await expect(first.page.getByRole('article')).toHaveCount(2);
  await expect(first.page.getByRole('status', { name: /Shared with family/ })).toBeVisible({ timeout: 30_000 });

  await waitForDocument('property.issues', (issues) => Array.isArray(issues) && issues.length === 2);
  // The linked property tasks travel too
  await waitForDocument('property.tasks', (tasks) => tasks.some((task: any) => task.recommendedContractor === 'Gutter cleaner'));

  const second = await newDevice(browser);
  await openIssues(second.page);
  const gutters = second.page.getByRole('article').filter({ hasText: 'Clear and check gutters' });
  await expect(gutters).toBeVisible({ timeout: 30_000 });
  await expect(second.page.getByRole('article').filter({ hasText: 'Window clean' })).toBeVisible();

  await gutters.getByRole('button', { name: /^Done$/ }).click();
  await waitForDocument('property.issues', (issues) =>
    issues.some((issue: any) => issue.title.startsWith('Clear and check gutters') && issue.status === 'done'));

  // Back on the first phone, returning to the app picks up the change.
  await first.page.reload();
  await waitForHubShell(first.page);
  await openView(first.page, 'Property');
  await first.page.getByRole('button', { name: /Issues/ }).first().click();
  await first.page.getByRole('tab', { name: 'done' }).click();
  await expect(first.page.getByRole('article').filter({ hasText: 'Clear and check gutters' })).toBeVisible({ timeout: 30_000 });

  await first.context.close();
  await second.context.close();
});

test('kids bookmarks and Monday email settings are shared', async ({ browser }) => {
  const first = await newDevice(browser);
  await openKidsEvents(first.page);

  await first.page.getByRole('button', { name: /^Save Crystal Palace Park/ }).click();
  await first.page.getByRole('button', { name: /^Add Horniman Museum and Gardens to the Monday email/ }).click();
  await first.page.getByRole('button', { name: 'Monday email', exact: true }).click();
  await first.page.getByLabel('Also send to').fill('grandma@example.com, not-an-email');
  await first.page.getByRole('button', { name: 'Save', exact: true }).click();

  await waitForDocument('kids.marks', (marks) =>
    marks.some((m: any) => m.id === 'saved:crystal-palace-park') && marks.some((m: any) => m.id === 'subscribed:horniman-museum'));
  await waitForDocument('digest.preferences', (prefs) =>
    JSON.stringify(prefs.extraRecipients) === JSON.stringify(['grandma@example.com']));

  const second = await newDevice(browser);
  await openKidsEvents(second.page);
  await second.page.getByLabel(/^Saved \(/).check();
  await expect(second.page.getByRole('article')).toHaveCount(1, { timeout: 30_000 });
  await expect(second.page.getByRole('article').first()).toContainText('Crystal Palace Park');
  await second.page.getByLabel(/^Saved \(/).uncheck();
  await expect(second.page.getByRole('button', { name: /^Remove Horniman Museum and Gardens from the Monday email/ })).toBeVisible();

  await first.context.close();
  await second.context.close();
});

test('the Monday email includes kids ideas and home jobs', async ({ request }) => {
  test.skip(!process.env.CRON_SECRET, 'Set CRON_SECRET to check the digest endpoint');
  const response = await request.get(`/api/cron/weekly-digest?dry=1&familyId=${familyId}`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  const result = body.results[0];
  expect(result.kidsIdeas).toBeGreaterThan(0);
  // Window clean is still open, and ticking off the yearly gutters job logged next year's.
  expect(result.homeJobs).toBe(2);
  expect(result.recipients).toContain('grandma@example.com');
});
