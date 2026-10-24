import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', testMatch: ['budget-truth-and-review.spec.ts', 'family-money-planner.spec.ts', 'recent-spending.spec.ts', 'brain-phone-editor.spec.ts', 'project-funding.spec.ts', 'kitchen.spec.ts'], workers: 1, timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:3212', headless: true, screenshot: 'only-on-failure', trace: 'off', video: 'off' },
  outputDir: 'output/bank-budget-tests',
  webServer: {
    command: 'node --require ./tests/e2e/node-runtime-fixes.cjs ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3212',
    url: 'http://127.0.0.1:3212', reuseExistingServer: false,
    env: { DATABASE_URL: 'postgresql://playwright:playwright@127.0.0.1:5432/family_hub_test', NEXT_PUBLIC_E2E: 'true', NEXT_PUBLIC_E2E_SEED: 'true', NEXT_PUBLIC_SKIP_SETUP: 'true' },
  },
});
