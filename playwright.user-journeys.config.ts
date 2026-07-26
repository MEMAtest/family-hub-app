import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: [
    'auth-private-boundaries.spec.ts',
    'bootstrap-resilience.spec.ts',
    'brain-integrations.spec.ts',
    'budget.spec.ts',
    'full-app-critical.spec.ts',
    'mobile-persistence.spec.ts',
    'personal-hubs.spec.ts',
    'polish-navigation.spec.ts',
    'qa-smoke-checklist.spec.ts',
  ],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'test-results/user-journeys',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'journey-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/user-journeys.xml' }],
  ],
  use: {
    ...baseConfig.use,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
