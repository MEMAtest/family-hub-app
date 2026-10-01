import { expect, test, type Page } from '@playwright/test';
import { createTestPrisma, hasTestDatabase, TEST_DATABASE_REQUIRED } from './test-database';

test.skip(!hasTestDatabase, TEST_DATABASE_REQUIRED);

const prisma = createTestPrisma();

const openProperty = async (page: Page) => {
  await page.locator('nav, aside').getByRole('button', { name: /^Property$/ }).first().click();
  await expect(page.getByText('Tremaine Improvements').first()).toBeVisible();
};

test.beforeAll(async () => {
  // Run on its own, the app needs a household before it will show the Property view.
  let family = await prisma.family.findFirst({ orderBy: { createdAt: 'asc' }, include: { members: true } });
  if (!family) {
    family = await prisma.family.create({
      data: { familyName: 'E2E Sourcing Family', familyCode: `src-${Date.now().toString().slice(-6)}` },
      include: { members: true },
    });
  }
  if (family.members.length === 0) {
    await prisma.familyMember.create({
      data: { familyId: family.id, name: 'Sourcing Parent', role: 'Parent', ageGroup: 'Adult', color: '#2563eb', icon: '🧪' },
    });
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('matches each bathroom quote item to supplier products and keeps the basket', async ({ page }) => {
  const projectName = `Tile sourcing ${Date.now()}`;
  await page.addInitScript(() => localStorage.setItem('familyHub_setupComplete', 'skipped'));
  await page.goto('/');
  await openProperty(page);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByPlaceholder('e.g., Bathroom Renovation').fill(projectName);
  await page.getByRole('button', { name: /Bathroom/ }).last().click();
  await page.locator('form').getByRole('button', { name: 'Create Project', exact: true }).click();
  await page.getByRole('button', { name: /Materials/ }).click();

  // Two rooms only: the main bathroom and the smaller shower room.
  await expect(page.getByText('Materials sourcing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Main Bathroom' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Shower Room' })).toBeVisible();
  await expect(page.getByText('Small Bathroom')).toHaveCount(0);

  await page.getByRole('button', { name: 'Open Main Bathroom' }).click();
  await page.getByRole('button', { name: /^Equivalent for Harlem Caliza/ }).click();
  await expect(page.getByText(/Reference product outside Topps Tiles: Harlem Caliza/)).toBeVisible();
  await page.getByRole('button', { name: 'Search Topps Tiles' }).click();
  const bone = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Kapital™ Bone Tile (59.5cm x 59.5cm)' }) });
  await expect(bone).toBeVisible();
  await expect(bone.getByText(/1mm smaller each way than Harlem Caliza/)).toBeVisible();
  await expect(bone.getByRole('link', { name: /Topps Tiles/ })).toHaveAttribute('href', /toppstiles\.co\.uk\/bathroom-tiles\/kapitaltm-bone/);
  await bone.getByRole('button', { name: 'Add' }).click();

  // Every quote item states what it is and its size; products link straight to their own supplier page.
  await page.getByRole('button', { name: /^B-shaped shower bath/ }).click();
  await expect(page.getByText('Size: 1700mm long × 850–900mm wide')).toBeVisible();
  await page.getByRole('button', { name: /View details for Fairford 1700 x 900mm B Shaped Left Hand Shower Bath/ }).click();
  const detail = page.getByRole('dialog', { name: /Fairford 1700 x 900mm B Shaped Left Hand Shower Bath/ });
  await expect(detail.getByRole('link', { name: /Stonewater Bathrooms product page/ })).toHaveAttribute('href', 'https://www.stonewaterbathrooms.com/products/fairford-1700-x-900mm-b-shaped-left-hand-shower-bath');
  await expect(detail.getByText('Fitter check')).toBeVisible();
  await detail.getByRole('button', { name: 'Ask fitter' }).click();
  await detail.getByRole('button', { name: 'Close product details' }).click();

  await page.getByRole('combobox', { name: 'Switch room' }).selectOption('shower-room');
  await page.getByRole('button', { name: /^Floor tiles · Cemente Basalt 60/ }).click();
  const basalt = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Cemente™ Basalt Tile (60cm x 60cm)' }) });
  await expect(basalt).toBeVisible();
  await basalt.getByRole('button', { name: 'Add' }).click();

  await expect(page.getByText('3 basket items')).toBeVisible();
  // Projects sync to the household store in the background; reload only once the change is shared.
  await expect(page.getByText('Shared with family').first()).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await openProperty(page);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByText(projectName, { exact: true }).click();
  await page.getByRole('button', { name: /Materials/ }).click();
  await expect(page.getByText('3 basket items')).toBeVisible();
  const basket = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Project basket' }) });
  await expect(basket.getByText('Kapital™ Bone Tile (59.5cm x 59.5cm)')).toBeVisible();
  await expect(basket.getByText('Fairford 1700 x 900mm B Shaped Left Hand Shower Bath')).toBeVisible();
  await expect(basket.getByText('Cemente™ Basalt Tile (60cm x 60cm)')).toBeVisible();
});
