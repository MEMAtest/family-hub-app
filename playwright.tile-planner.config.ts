import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 3206);
export default defineConfig({
  testDir: 'tests/e2e', testMatch: 'tile-planner-journey.spec.ts', workers: 1, retries: 0, timeout: 60000,
  outputDir: 'output/playwright/tile-planner-results',
  use: { baseURL: `http://127.0.0.1:${port}`, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: `node --require ./tests/e2e/node-runtime-fixes.cjs ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI, timeout: 120000,
    env: { NEXT_PUBLIC_E2E: 'true', NEXT_PUBLIC_SKIP_SETUP: 'true', DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://playwright:playwright@127.0.0.1:5432/family_hub_test' },
  },
});
