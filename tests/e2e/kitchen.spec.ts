import { expect, test, type Browser, type Page } from '@playwright/test';
import { createTestPrisma, hasTestDatabase, TEST_DATABASE_REQUIRED } from './test-database';

/**
 * Kitchen: usuals with one-tap "we're low", the Top-ups shopping list, the
 * meal log, and the fridge photo check's honest failure when no AI is set up.
 * Two browser contexts stand in for two parents' phones.
 */

test.skip(!hasTestDatabase, TEST_DATABASE_REQUIRED);
test.describe.configure({ mode: 'serial' });

const prisma = createTestPrisma();
const MEAL = `E2E pepper soup ${Date.now().toString().slice(-5)}`;
const LAST_WEEK_MEAL = `E2E jollof ${Date.now().toString().slice(-5)}`;
let familyId = '';

const newDevice = async (browser: Browser) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('familyHub_setupComplete', 'skipped'));
  return { context, page: await context.newPage() };
};

const openKitchen = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Dashboard$/ }).first()).toBeVisible({ timeout: 90_000 });
  await page.locator('nav, aside').getByRole('button', { name: /^Kitchen$/ }).first().click();
  await expect(page.getByLabel(/What have you got/)).toBeVisible({ timeout: 30_000 });
};

const cleanUp = async () => {
  await prisma.familyDocument.deleteMany({ where: { familyId, key: { startsWith: 'kitchen.' } } });
  await prisma.shoppingList.deleteMany({ where: { familyId, listName: 'Top-ups' } });
  await prisma.mealPlan.deleteMany({ where: { familyId, mealName: { in: [MEAL, LAST_WEEK_MEAL] } } });
};

test.beforeAll(async () => {
  let family = await prisma.family.findFirst({ orderBy: { createdAt: 'asc' }, include: { members: true } });
  if (!family) {
    family = await prisma.family.create({
      data: { familyName: 'E2E Kitchen Family', familyCode: `kit-${Date.now().toString().slice(-6)}` },
      include: { members: true },
    });
  }
  if (family.members.length === 0) {
    await prisma.familyMember.create({
      data: { familyId: family.id, name: 'Kitchen Parent', role: 'Parent', ageGroup: 'Adult', color: '#059669', icon: '🧪' },
    });
  }
  familyId = family.id;
  await cleanUp();
});

test.afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

test('one tap on one phone puts it on the list, and the other phone sees it', async ({ browser }) => {
  const first = await newDevice(browser);
  await openKitchen(first.page);
  await first.page.getByRole('button', { name: /Start with \d+ suggestions/ }).click();
  await first.page.getByRole('button', { name: 'Low on Tissues' }).click();

  await expect.poll(async () => prisma.shoppingItem.count({
    where: { itemName: 'Tissues', isCompleted: false, list: { familyId, listName: 'Top-ups' } },
  }), { timeout: 30_000 }).toBe(1);
  await expect.poll(async () => {
    const doc = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: 'kitchen.staples' } } });
    return (doc?.data as any[] | undefined)?.find((s) => s.name === 'Tissues')?.flag;
  }, { timeout: 30_000 }).toBe('low');

  const second = await newDevice(browser);
  await openKitchen(second.page);
  // Tap straight away, before shopping lists have loaded on this phone
  await second.page.getByRole('button', { name: 'Low on Bread' }).click();
  await expect(second.page.getByRole('button', { name: 'Tissues running low' })).toBeDisabled({ timeout: 30_000 });
  await expect(second.page.getByText('On Top-ups').first()).toBeVisible();

  await expect.poll(async () => prisma.shoppingItem.count({
    where: { itemName: 'Bread', isCompleted: false, list: { familyId, listName: 'Top-ups' } },
  }), { timeout: 30_000 }).toBe(1);
  expect(await prisma.shoppingList.count({ where: { familyId, listName: 'Top-ups' } })).toBe(1);

  await first.context.close();
  await second.context.close();
});

test('saying what we have sets counts and run-out dates that the other phone sees', async ({ browser }) => {
  const first = await newDevice(browser);
  // The AI's reading is stood in for here (CI has no key); the live AI is checked separately.
  await first.page.route('**/kitchen/stock-note', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [
      { name: 'Toilet roll', usual: 'Toilet roll', status: 'count', quantity: 20, unit: 'roll', unitContents: null, daysPerUnit: 2, rateSource: 'stated', assumption: 'You said one roll lasts about 2 days.', question: null, category: 'household' },
      { name: 'Baby wipes', usual: 'Baby wipes', status: 'count', quantity: 12, unit: 'pack', unitContents: 'about 80 wipes', daysPerUnit: 3, rateSource: 'estimated', assumption: 'Read as a box of 12 packs.', question: 'How many wipes are in each pack?', category: 'kids' },
      { name: 'Nappies', usual: null, status: 'count', quantity: 2, unit: 'pack', unitContents: 'about 50 nappies', daysPerUnit: 9, rateSource: 'estimated', assumption: 'About 50 nappies a pack.', question: null, category: 'kids' },
    ] }),
  }));
  await openKitchen(first.page);
  await first.page.getByLabel(/What have you got/).fill('we have 20 toilet tissue from costco, one lasts about 2 days, a box of 12 wipes, 2 diaper sets');
  await first.page.getByRole('button', { name: 'Add', exact: true }).click();

  const review = first.page.getByRole('region', { name: 'Check the stock note' });
  await expect(review.getByTestId('stock-note-item')).toHaveCount(3, { timeout: 30_000 });
  await expect(review.getByText(/Lasts about 40 days/)).toBeVisible();
  await review.getByLabel('How many Nappies').fill('3');
  await expect(review.getByText(/Lasts about 27 days/)).toBeVisible();
  await review.getByRole('button', { name: 'Save' }).click();
  await expect(review).toBeHidden();

  await expect.poll(async () => {
    const doc = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: 'kitchen.staples' } } });
    const staples = (doc?.data as any[] | undefined) ?? [];
    return ['Toilet roll', 'Baby wipes', 'Nappies'].map((name) => staples.find((s) => s.name === name)?.stock?.countedQuantity ?? null);
  }, { timeout: 30_000 }).toEqual([20, 12, 3]);

  const second = await newDevice(browser);
  await openKitchen(second.page);
  // Counts show without opening every usual
  const got = second.page.getByRole('list', { name: "What you've got" });
  await expect(got.getByText(/About 20 rolls left · 40 days/)).toBeVisible({ timeout: 30_000 });
  await expect(got.getByText(/About 3 packs left/)).toBeVisible();
  await expect(got.getByText(/one roll ≈ 2 days \(you said\)/)).toBeVisible();

  // Bought more on the second phone: it asks how many
  await second.page.getByRole('button', { name: 'Bought Toilet roll' }).first().click();
  await second.page.getByLabel('How many rolls of Toilet roll did you buy').fill('9');
  await second.page.getByRole('button', { name: 'Add bought Toilet roll' }).click();
  await expect(second.page.getByText(/About 29 rolls left/).first()).toBeVisible();
  await expect.poll(async () => {
    const doc = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: 'kitchen.staples' } } });
    return (doc?.data as any[] | undefined)?.find((s) => s.name === 'Toilet roll')?.stock?.addedSince;
  }, { timeout: 30_000 }).toBe(9);

  await first.context.close();
  await second.context.close();
});

test('meals logged on one phone show on the other', async ({ browser }) => {
  const first = await newDevice(browser);
  await openKitchen(first.page);
  await first.page.getByLabel('Meal you made').fill(MEAL);
  await first.page.getByRole('button', { name: 'Log it' }).click();
  await expect(first.page.getByText(MEAL)).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => prisma.mealPlan.count({ where: { familyId, mealName: MEAL, isEaten: true } }), { timeout: 30_000 }).toBe(1);

  const second = await newDevice(browser);
  await openKitchen(second.page);
  await expect(second.page.getByText(MEAL)).toBeVisible({ timeout: 30_000 });

  await first.context.close();
  await second.context.close();
});

test('a fridge photo without a working AI key fails honestly and saves nothing', async ({ browser }) => {
  test.skip(Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy') || Boolean(process.env.OPENROUTER_API_KEY),
    'A real AI key is configured, so the photo would actually be read');
  const { context, page } = await newDevice(browser);
  await openKitchen(page);
  await page.getByLabel('Upload fridge photo').setInputFiles({ name: 'fridge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(2048, 7) });
  await expect(page.getByRole('alert').filter({ hasText: /AI key|Couldn't read that photo/ })).toBeVisible({ timeout: 60_000 });
  const doc = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: 'kitchen.fridgeChecks' } } });
  expect((doc?.data as unknown[] | undefined)?.length ?? 0).toBe(0);
  await context.close();
});

test('the Monday email recaps last week’s meals and what to stock up on', async ({ request }) => {
  test.skip(!process.env.CRON_SECRET, 'Set CRON_SECRET to check the digest endpoint');
  const today = new Date();
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const lastWeek = new Date(monday);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 5);
  lastWeek.setUTCHours(12);
  await prisma.mealPlan.create({ data: { familyId, mealName: LAST_WEEK_MEAL, mealDate: lastWeek, isEaten: true, eatenAt: lastWeek } });

  const response = await request.get(`/api/cron/weekly-digest?dry=1&familyId=${familyId}`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(response.ok()).toBe(true);
  const result = (await response.json()).results[0];
  expect(result.mealsLastWeek).toBeGreaterThanOrEqual(1);
  expect(result.stockUp).toBeGreaterThanOrEqual(1); // tissues are low
});
