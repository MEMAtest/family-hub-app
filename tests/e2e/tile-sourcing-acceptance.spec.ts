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

test('finds the Harlem Caliza equivalent and both requested Topps Tiles products', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('familyHub_setupComplete', 'skipped'));
  await page.goto('/');
  await openProperty(page);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByPlaceholder('e.g., Bathroom Renovation').fill('Tile sourcing acceptance');
  await page.getByRole('button', { name: /Bathroom/ }).last().click();
  await page.locator('form').getByRole('button', { name: 'Create Project', exact: true }).click();
  await page.getByRole('button', { name: /Materials/ }).click();

  await expect(page.getByText('Materials sourcing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Main Bathroom' })).toBeVisible();
  await page.getByRole('button', { name: /Equivalent for Harlem Caliza/ }).click();
  await expect(page.getByText(/Reference product outside Topps Tiles: Harlem Caliza/)).toBeVisible();
  await page.getByRole('button', { name: 'Search Topps Tiles' }).click();
  const bone = page.getByRole('heading', { name: 'Kapital Bone Tile (59.5cm x 59.5cm)' });
  await expect(bone).toBeVisible();
  const boneCard = page.locator('article').filter({ has: bone });
  await expect(boneCard.getByText('Fitter check')).toBeVisible();
  await expect(boneCard.getByText(/1mm smaller than the reference/)).toBeVisible();
  await expect(boneCard.getByRole('link', { name: 'Supplier page' })).toHaveAttribute('href', /toppstiles\.co\.uk\/bathroom-tiles\/kapitaltm-bone/);
  await boneCard.getByRole('button', { name: 'Ask fitter' }).click();

  await page.getByRole('button', { name: 'Kapital Grey' }).click();
  await page.getByRole('button', { name: 'Search Topps Tiles' }).click();
  const greyCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Kapital™ Grey Tile (59.5cm x 59.5cm)' }) });
  await expect(greyCard).toBeVisible();
  await expect(greyCard.getByText('Fitter check')).toBeVisible();
  await greyCard.getByRole('button', { name: 'Ask fitter' }).click();

  await page.getByRole('button', { name: 'Small Bathroom' }).click();
  await expect(page.getByRole('button', { name: /Cemente Basalt 60/ })).toBeVisible();
  await page.getByRole('button', { name: /Cemente Basalt 60/ }).click();
  await page.getByRole('button', { name: 'Search Topps Tiles' }).click();
  const basaltCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Cemente™ Basalt Tile (60cm x 60cm)' }) });
  await expect(basaltCard).toBeVisible();
  await expect(basaltCard.getByText('Fitter check')).toBeVisible();
  await basaltCard.getByRole('button', { name: 'Ask fitter' }).click();

  await expect(page.getByText('4 basket items')).toBeVisible();
  await page.reload();
  await openProperty(page);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByText('Tile sourcing acceptance', { exact: true }).click();
  await page.getByRole('button', { name: /Materials/ }).click();
  await expect(page.getByText('4 basket items')).toBeVisible();
  await expect(page.getByText('Kapital Bone Tile (59.5cm x 59.5cm)')).toBeVisible();
  await expect(page.getByText('Kapital™ Grey Tile (59.5cm x 59.5cm)')).toBeVisible();
  await expect(page.getByText('Cemente™ Basalt Tile (60cm x 60cm)')).toBeVisible();
});
