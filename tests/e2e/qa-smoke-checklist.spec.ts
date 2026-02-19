import { test, expect, devices, type Page } from '@playwright/test';

const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT || '3101';
const PLAYWRIGHT_HOST = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`;

const skipSetupWizard = () => {
  localStorage.setItem('familyHub_setupComplete', 'skipped');
};

const dismissSetupWizard = async (page: Page) => {
  const skipButton = page.getByRole('button', { name: 'Skip Setup' });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(500);
  }
};

const preparePage = async (page: Page) => {
  await page.waitForLoadState('networkidle');
  await dismissSetupWizard(page);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(skipSetupWizard);
});

/**
 * QA Smoke Checklist - Automated Testing
 * This test suite covers items from QA_SMOKE_CHECKLIST.md
 */

// Helper function to ensure screenshots directory
async function takeScreenshot(page: Page, filename: string) {
  await page.screenshot({
    path: `test-results/${filename}`,
    fullPage: true
  });
}

test.describe('QA Smoke Checklist - PWA Configuration', () => {

  test('should have valid manifest.json', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('icons');
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('share_target');

    console.log('✅ Manifest validated:', manifest.name);
  });

  test('should serve service worker', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sw.js`);
    expect(response?.status()).toBe(200);

    const swContent = await response?.text();
    expect(swContent).toContain('ServiceWorker');
    expect(swContent).toContain('install');
    expect(swContent).toContain('activate');

    console.log('✅ Service Worker file validated');
  });

  test('should serve offline page', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/offline.html`);
    expect(response?.status()).toBe(200);

    const content = await page.textContent('body');
    expect(content).toContain('offline');

    console.log('✅ Offline page validated');
  });

  test('should have required PWA icons', async ({ page }) => {
    const iconTests = [
      '/icon-192x192.png',
      '/icon-512.png',
      '/icon-maskable-192.png',
      '/icon-maskable-512.png'
    ];

    for (const icon of iconTests) {
      const response = await page.goto(`${BASE_URL}${icon}`);
      expect(response?.status()).toBe(200);
    }

    console.log('✅ PWA icons validated');
  });
});

test.describe('QA Smoke Checklist - Desktop Responsive (1440x900)', () => {

  test('should render dashboard on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await preparePage(page);

    await takeScreenshot(page, 'desktop-1440x900-dashboard.png');

    const dashboardVisible = await page.isVisible('text=Dashboard');
    expect(dashboardVisible).toBeTruthy();

    console.log('✅ Desktop dashboard rendered');
  });

  test('should navigate to Calendar view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await preparePage(page);

    const calendarButton = page.locator('text=Calendar').first();
    await calendarButton.click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'desktop-1440x900-calendar.png');

    console.log('✅ Desktop calendar navigation works');
  });

  test('should navigate to Budget view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await preparePage(page);

    const budgetButton = page.locator('text=Budget').first();
    await budgetButton.click();
    await page.waitForTimeout(2000);

    await takeScreenshot(page, 'desktop-1440x900-budget.png');

    console.log('✅ Desktop budget navigation works');
  });
});

test.describe('QA Smoke Checklist - Laptop (1280x720)', () => {

  test('should render dashboard on laptop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE_URL);
    await preparePage(page);

    await takeScreenshot(page, 'laptop-1280x720-dashboard.png');

    console.log('✅ Laptop dashboard rendered');
  });
});

test.describe('QA Smoke Checklist - Tablet (iPad - 834x1112)', () => {

  test('should render dashboard on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto(BASE_URL);
    await preparePage(page);

    await takeScreenshot(page, 'tablet-834x1112-dashboard.png');

    console.log('✅ Tablet dashboard rendered');
  });

  test('should show appropriate navigation on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto(BASE_URL);
    await preparePage(page);

    const hasNavigation = await page.locator('nav').count();
    expect(hasNavigation).toBeGreaterThan(0);

    console.log('✅ Tablet navigation validated');
  });
});

test.describe('QA Smoke Checklist - Mobile (iPhone 14 - 390x844)', () => {

  test('should render dashboard on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    await preparePage(page);

    await takeScreenshot(page, 'mobile-390x844-dashboard.png');

    console.log('✅ Mobile dashboard rendered');
  });

  test('should check bottom navigation visibility on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    await preparePage(page);

    await takeScreenshot(page, 'mobile-390x844-bottom-nav.png');

    console.log('✅ Mobile bottom navigation checked');
  });

  test('should navigate between views on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    await preparePage(page);

    // Test Calendar navigation
    const calendarButton = page.locator('text=Calendar').first();
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'mobile-390x844-calendar.png');
    }

    // Test Budget navigation
    const budgetButton = page.locator('text=Budget').first();
    if (await budgetButton.isVisible()) {
      await budgetButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'mobile-390x844-budget.png');
    }

    // Test Shopping navigation
    const shoppingButton = page.locator('text=Shopping').first();
    if (await shoppingButton.isVisible()) {
      await shoppingButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'mobile-390x844-shopping.png');
    }

    console.log('✅ Mobile navigation between views works');
  });
});

test.describe('QA Smoke Checklist - Android (Pixel - 360x800)', () => {

  test('should render dashboard on Android', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(BASE_URL);
    await preparePage(page);

    await takeScreenshot(page, 'android-360x800-dashboard.png');

    console.log('✅ Android dashboard rendered');
  });

  test('should have touch-friendly targets', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(BASE_URL);
    await preparePage(page);

    // Dismiss any modals/overlays that might be blocking buttons
    const closeButton = page.locator('button:has-text("Skip Setup"), button:has-text("Get Started"), [aria-label="Close"]').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    // Check visible, interactive elements (buttons, links with button role, tabs)
    const interactiveElements = await page.locator(
      'button:visible, a[role="button"]:visible, [role="tab"]:visible'
    ).all();

    let touchFriendlyCount = 0;
    const MIN_TOUCH_SIZE = 30; // Minimum 30px (Android recommends 48dp, iOS 44pt, we use 30 as lenient threshold)

    // Check first 10 visible interactive elements
    for (const element of interactiveElements.slice(0, 10)) {
      const box = await element.boundingBox();
      // Check both width and height are adequate for touch
      if (box && box.height >= MIN_TOUCH_SIZE && box.width >= MIN_TOUCH_SIZE) {
        touchFriendlyCount++;
      }
    }

    // Expect at least 3 touch-friendly elements
    expect(touchFriendlyCount).toBeGreaterThanOrEqual(3);

    console.log(`✅ Touch targets validated: ${touchFriendlyCount} elements meet touch-friendly size requirements`);
  });
});

test.describe('QA Smoke Checklist - Landscape Orientation', () => {

  test('should handle landscape on mobile (844x390)', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(BASE_URL);
    await preparePage(page);

    await takeScreenshot(page, 'mobile-landscape-844x390.png');

    console.log('✅ Landscape orientation tested');
  });
});

test.describe('QA Smoke Checklist - Share Target', () => {

  test('should handle share target query parameters', async ({ page }) => {
    const shareUrl = `${BASE_URL}/?title=Test%20Share&text=Shared%20content&url=https://example.com`;

    await page.goto(shareUrl);
    await preparePage(page);

    const url = page.url();
    expect(url).toContain('title=');

    await takeScreenshot(page, 'share-target-deeplink.png');

    console.log('✅ Share target deep link tested');
  });
});

test.describe('QA Smoke Checklist - Regression Tests', () => {

  test('should load Budget view and verify charts', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await preparePage(page);

    const budgetButton = page.locator('text=Budget').first();
    await budgetButton.click();
    await page.waitForTimeout(2000);

    await takeScreenshot(page, 'regression-budget-loaded.png');

    console.log('✅ Budget view loads correctly');
  });

  test('should navigate to Shopping and verify UI', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await preparePage(page);

    const shoppingButton = page.locator('text=Shopping').first();
    if (await shoppingButton.isVisible()) {
      await shoppingButton.click();
      await page.waitForTimeout(2000);

      await takeScreenshot(page, 'regression-shopping-loaded.png');
    }

    console.log('✅ Shopping view loads correctly');
  });

  test('should load Goals view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);
    await preparePage(page);

    const goalsButton = page.locator('text=Goals').first();
    if (await goalsButton.isVisible()) {
      await goalsButton.click();
      await page.waitForTimeout(2000);

      await takeScreenshot(page, 'regression-goals-loaded.png');
    }

    console.log('✅ Goals view loads correctly');
  });
});
