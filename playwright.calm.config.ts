import base from './playwright.config';
export default {
  ...base,
  // These journeys stub every household API; no database warm-up is required.
  globalSetup: undefined,
  workers: 1,
  testMatch: ['calendar-quality-of-life.spec.ts', 'budget-truth-and-review.spec.ts'],
};
