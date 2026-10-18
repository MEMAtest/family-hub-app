import { expect, test, type Page } from '@playwright/test';

const openProperty = async (page: Page, tab: string) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { id: 'property-qa', email: 'qa@example.com' }, needsOnboarding: false }),
  }));
  await page.addInitScript(() => {
    localStorage.setItem('familyHub_setupComplete', 'skipped');
    if (!localStorage.getItem('family-storage')) {
      localStorage.setItem('family-storage', JSON.stringify({
        version: 8,
        state: { currentView: 'property', propertyRole: 'owner' },
      }));
    }
  });
  await page.goto(`/?view=property&tab=${tab}`);
};

const canvasPixelStats = async (page: Page) => {
  const screenshot = await page.locator('canvas').screenshot();
  return page.evaluate(async (encodedPng) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encodedPng}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) return { distinctSamples: 0, opaqueSamples: 0 };
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    let opaqueSamples = 0;
    for (let index = 0; index < pixels.length; index += 1600) {
      if (pixels[index + 3] > 0) opaqueSamples += 1;
      colors.add(`${pixels[index]}:${pixels[index + 1]}:${pixels[index + 2]}`);
    }
    return { distinctSamples: colors.size, opaqueSamples };
  }, screenshot.toString('base64'));
};

test('Tremaine model renders and floor focus works on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 980 });
  await openProperty(page, 'digital-twin');
  await expect(page.getByRole('heading', { name: '21 Tremaine Road model' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  const wholeHousePixels = await canvasPixelStats(page);
  expect(wholeHousePixels.opaqueSamples).toBeGreaterThan(50);
  expect(wholeHousePixels.distinctSamples).toBeGreaterThan(10);
  await page.locator('canvas').screenshot({ path: 'output/playwright/property-digital-twin-whole-house.png' });
  await page.getByRole('button', { name: /^First Floor/ }).click();
  await expect(page.getByText(/Room positions are indicative/)).toBeVisible();
  await page.locator('canvas').screenshot({ path: 'output/playwright/property-digital-twin-first-floor.png' });
  await page.screenshot({ path: 'output/playwright/property-digital-twin-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('canvas')).toBeVisible();
  const mobilePixels = await canvasPixelStats(page);
  expect(mobilePixels.opaqueSamples).toBeGreaterThan(20);
  expect(mobilePixels.distinctSamples).toBeGreaterThan(10);
  await page.locator('canvas').screenshot({ path: 'output/playwright/property-digital-twin-mobile.png' });
});

test('survey plan explains meaning, resolution, links and remaining cost on phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openProperty(page, 'tasks');
  await expect(page.getByRole('heading', { name: 'Building survey actions' })).toBeVisible();
  await expect(page.getByText('Likely remaining spend')).toBeVisible();
  await expect(page.getByText('What it means').first()).toBeVisible();
  await expect(page.getByText('How to resolve it').first()).toBeVisible();
  await expect(page.getByText(/Linked finding/).first()).toBeVisible();
  await page.screenshot({ path: 'output/playwright/property-survey-plan-mobile.png', fullPage: true });
});

test('awareness links sale evidence and presents verified planning applications', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openProperty(page, 'awareness');
  await page.unroute('**/api/property/valuation**');
  await page.route('**/api/property/valuation**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      areaStatistics: {
        averagePrice: 696250,
        medianPrice: 667500,
        transactions: 4,
        priceRange: { min: 525000, max: 925000 },
        period: { from: '2024-08-14', to: '2026-08-13' },
        scope: 'property_type',
        lowestSale: { transactionId: 'low', sourceUrl: 'https://landregistry.data.gov.uk/data/ppi/transaction/low/current', address: '1 LOW ROAD, LONDON, SE20', price: 525000, date: '2024-08-14', propertyType: 'T', newBuild: false },
        highestSale: { transactionId: 'high', sourceUrl: 'https://landregistry.data.gov.uk/data/ppi/transaction/high/current', address: '9 HIGH ROAD, LONDON, SE20', price: 925000, date: '2026-08-13', propertyType: 'T', newBuild: false },
      },
      estimatedValue: 700000,
      estimateBreakdown: { sources: [{ id: 'area-median', label: 'Area median', value: 667500 }] },
      comparableSales: [],
      disclaimer: 'Indicative estimate.',
    }),
  }));
  await page.unroute('**/api/property/council-news**');
  await page.route('**/api/property/council-news**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      news: [{
        id: 'Bromley-25_00203_FULL6',
        title: '10 Marlow Road SE20 7UY: Householder',
        summary: 'Single storey rear extension. The council has not recorded a decision yet.',
        date: '2025-01-31',
        category: 'planning',
        priority: 'high',
        source: 'London Planning Datahub',
        reference: '25/00203/FULL6',
        status: 'Application Under Consideration',
        distanceMetres: 310,
        url: 'https://www.bromley.gov.uk/planningaccess',
      }],
      dataFreshness: { latestSourceUpdate: '2025-04-04T20:00:27.223Z' },
    }),
  }));
  await page.reload();
  await expect(page.getByRole('link', { name: /Highest sale/ })).toHaveAttribute('href', /landregistry\.data\.gov\.uk/);
  await expect(page.getByText('25/00203/FULL6')).toBeVisible();
  await expect(page.getByText('310m away')).toBeVisible();
  await expect(page.getByText(/No sample or invented/)).not.toBeVisible();
  await page.screenshot({ path: 'output/playwright/property-awareness-desktop.png', fullPage: true });
});
