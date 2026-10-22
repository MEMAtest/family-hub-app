import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/bank-assistant', workers: 1, timeout: 45_000,
  use: { headless: true, screenshot: 'only-on-failure', trace: 'off', video: 'off' },
  outputDir: 'output/bank-assistant-tests',
});
