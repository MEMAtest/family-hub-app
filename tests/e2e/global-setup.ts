import type { FullConfig } from '@playwright/test';

/**
 * Warm the API routes before any test runs.
 *
 * The suite runs against `next dev`, which compiles each route the first time
 * it is requested. On a loaded CI runner that first compile can take longer
 * than a test is willing to wait, and the request simply never answers — the
 * page hydrates against a server that is still building the endpoint.
 *
 * That is not a hypothesis. A failing run's trace showed seven endpoints
 * answering 200 while six others — the ones not yet compiled, `/events` among
 * them — hung and were still hanging three retries and twenty seconds later.
 * The calendar journey failed with an empty month because of it.
 *
 * Paying that compile cost once, up front, with a patient timeout, takes the
 * whole class of first-request flakiness out of the suite. Warming is
 * best-effort: a route that refuses or 404s here is not a reason to fail the
 * run, since the tests themselves assert what matters.
 */

const WARM_TIMEOUT_MS = 90_000;

/** Routes whose first compile is slow enough to outlast a test. */
const routesFor = (familyId: string) => [
  '/api/auth/me',
  '/api/families',
  `/api/families/${familyId}/events`,
  `/api/families/${familyId}/notifications?limit=1&offset=0`,
  `/api/families/${familyId}/brain/nodes?showOnCalendar=true`,
  `/api/families/${familyId}/brain/projects`,
  `/api/families/${familyId}/brain/today`,
  `/api/families/${familyId}/fitness?limit=1`,
  `/api/families/${familyId}/contractors/appointments`,
  `/api/families/${familyId}/calendar-intake/inbox`,
  `/api/families/${familyId}/goals`,
  `/api/families/${familyId}/meals`,
  `/api/families/${familyId}/shopping-lists`,
  `/api/families/${familyId}/achievements`,
  `/api/families/${familyId}/budget/income`,
  `/api/families/${familyId}/budget/expenses`,
  `/api/families/${familyId}/contractors`,
];

const warm = async (baseURL: string, path: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WARM_TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(`${baseURL}${path}`, { signal: controller.signal });
    const elapsed = Date.now() - started;
    // Only worth reporting when the compile was slow enough to have mattered.
    if (elapsed > 3_000) console.log(`  warmed ${path} -> ${response.status} in ${elapsed}ms`);
    return true;
  } catch (error) {
    console.log(`  warm failed ${path}: ${(error as Error).message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const globalSetup = async (config: FullConfig) => {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ||
    config.projects[0]?.use?.baseURL ||
    `http://${process.env.PLAYWRIGHT_HOST || '127.0.0.1'}:${process.env.PLAYWRIGHT_PORT || 3101}`;

  // `/api/families` reports the household the E2E fixture resolves to, which is
  // the one the per-family routes below need in their path.
  let familyId = 'warmup';
  try {
    const response = await fetch(`${baseURL}/api/families`);
    if (response.ok) {
      const families = await response.json();
      if (Array.isArray(families) && families[0]?.id) familyId = families[0].id;
    }
  } catch {
    // Warming with a placeholder id still compiles the route, which is the point.
  }

  console.log(`Warming API routes at ${baseURL} (family ${familyId})...`);
  const started = Date.now();
  // Serially: the point is to avoid a compile stampede, not to recreate one.
  for (const path of routesFor(familyId)) await warm(baseURL, path);
  console.log(`API routes warmed in ${Date.now() - started}ms`);
};

export default globalSetup;
