import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
}

const prisma = new PrismaClient();
const createdIncomeIds: string[] = [];
const createdExpenseIds: string[] = [];
let familyId: string;

test.beforeAll(async () => {
  const family = await prisma.family.findFirst();
  if (!family) {
    throw new Error('No family records found. Seed the database before running Playwright tests.');
  }
  familyId = family.id;

  const paymentDate = new Date();
  const baseExpenseData = {
    familyId,
    paymentDate,
    category: 'Playwright QA',
    personId: null,
    isRecurring: false,
  };

  const receiptExpense = await prisma.budgetExpense.create({
    data: {
      ...baseExpenseData,
      expenseName: 'Playwright Receipt Expense',
      amount: 42.5,
      isReceiptScan: true,
      receiptScanDate: new Date(),
    },
  });
  createdExpenseIds.push(receiptExpense.id);

  const regularExpense = await prisma.budgetExpense.create({
    data: {
      ...baseExpenseData,
      expenseName: 'Playwright Filter Expense',
      amount: 87.75,
      budgetLimit: 200,
      isReceiptScan: false,
    },
  });
  createdExpenseIds.push(regularExpense.id);

  const income = await prisma.budgetIncome.create({
    data: {
      familyId,
      incomeName: 'Playwright Income Search',
      amount: 1234.56,
      category: 'Playwright QA',
      isRecurring: false,
      paymentDate,
    },
  });
  createdIncomeIds.push(income.id);
});

test.afterAll(async () => {
  if (createdExpenseIds.length) {
    await prisma.budgetExpense.deleteMany({
      where: { id: { in: createdExpenseIds } },
    });
  }
  if (createdIncomeIds.length) {
    await prisma.budgetIncome.deleteMany({
      where: { id: { in: createdIncomeIds } },
    });
  }
  await prisma.$disconnect();
});

test('budget search and receipt filter behave as expected', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('familyHub_setupComplete', 'skipped');
  });

  await page.goto('/');

  const budgetNavButton = page.locator('aside').getByRole('button', { name: 'Budget', exact: true });
  await budgetNavButton.click();

  const searchInput = page.getByPlaceholder('Search income, expenses, or amounts');
  await expect(searchInput).toBeVisible({ timeout: 60_000 });

  // Search incomes
  await searchInput.fill('Playwright Income Search');
  await expect(page.getByText('Playwright Income Search')).toBeVisible();
  await expect(page.getByText('Playwright Filter Expense')).not.toBeVisible();

  // Clear search and search expenses
  await searchInput.fill('');
  await searchInput.fill('Filter Expense');
  await expect(page.getByText('Playwright Filter Expense')).toBeVisible();
  await expect(page.getByText('Playwright Income Search')).not.toBeVisible();
  await searchInput.fill('');

  // View receipt scans only
  await searchInput.fill('');
  await page.getByRole('button', { name: 'Receipt scans' }).click();
  await expect(page.getByText('Playwright Receipt Expense')).toBeVisible();
  await expect(page.getByText('Playwright Filter Expense')).not.toBeVisible();

  // Reset to all items
  await page.getByRole('button', { name: 'All items' }).click();
  await searchInput.fill('Filter Expense');
  await expect(page.getByText('Playwright Filter Expense')).toBeVisible();
});
