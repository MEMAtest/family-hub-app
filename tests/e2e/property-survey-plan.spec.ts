import { expect, test, type Page } from '@playwright/test';

const rehearseSurveyToContractor = async ({
  page,
  viewport,
}: {
  page: Page;
  viewport: { width: number; height: number };
}) => {
  await page.setViewportSize(viewport);
  let searchBody: Record<string, unknown> | undefined;
  await page.route('**/api/families/*/contractors/discover', async (route) => {
    searchBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        providers: { google: 'ok' },
        candidates: [{
          candidateId: 'structural-option-1',
          name: 'South London Structural Engineers',
          specialty: 'structural_engineer',
          address: 'London SE20',
          rating: 4.8,
          reviewCount: 42,
          matchReason: 'Google local business match',
          evidence: [],
        }],
      }),
    });
  });

  await page.goto('/?view=property&tab=tasks');
  const plan = page.locator('section').filter({ hasText: 'Survey action plan' }).first();
  await expect(plan).toContainText('6');
  await expect(plan).toContainText('Action now');
  await expect(plan).toContainText('3');
  await expect(plan).toContainText('Check proof');
  await expect(plan).toContainText('21 duplicate text extracts folded');
  await expect(page.getByText('All task records')).toBeHidden();

  await page.getByRole('link', { name: 'Find Structural Engineer' }).first().click();

  await expect(page.getByRole('heading', { name: 'Contractors & trades' })).toBeVisible();
  await expect(page.getByText('Linked to survey action')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'South London Structural Engineers' })).toBeVisible();
  expect(searchBody).toMatchObject({
    query: 'Structural engineer',
    location: 'SE20 7UA',
    specialty: 'structural_engineer',
  });
};

test('desktop survey plan prioritises real actions and opens a linked contractor search', async ({ page }) => {
  await rehearseSurveyToContractor({ page, viewport: { width: 1366, height: 900 } });
});

test('phone survey plan keeps the next action and contractor handoff usable', async ({ page }) => {
  await rehearseSurveyToContractor({ page, viewport: { width: 390, height: 844 } });
});
