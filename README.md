# family-hub-app
A comprehensive family management application with calendar, budget tracking, meal planning, shopping lists, and goals tracking for the Omosanya family

## Progressive Web App quick start

- **Install on Android/desktop Chromium:** open the app, accept the bottom install banner, or use the browser `Install` action; the app ships with a full manifest, maskable icons (72–512px), and window-controls overlay support.
- **Install on iOS Safari:** tap the share icon and choose **Add to Home Screen**; bespoke splash screens (iPhone + iPad) and Apple touch icons are bundled under `public/`.
- **Offline mode:** the enhanced service worker precaches the shell (`/`, `/offline.html`, manifest, icons) and falls back to an offline status page if navigation fails. Static `_next` assets use a stale-while-revalidate strategy, while media/fonts are cached with size limits.
- **Re-engagement:** notification scheduling continues to work; in-app install prompts nudge users until they install or dismiss, and the manifest share target exposes `title/text/url` query params so shared links reopen the dashboard inside the app.

## Testing

- `npm run test` – Jest unit tests.
- `npm run test:bugfixes` – Regression suite verifying recent hotfixes (calendar events, budget modals, chart visuals). Requires a configured `DATABASE_URL`.
- `npm run test:smoke` – AI budget smoke checks covering insights, UK benchmarking, and forecasting. Uses local Prisma data and stubs Anthropic responses; safe for CI or local runs without external API calls.
- `npm run test:e2e` – Playwright end-to-end tests that open the Budget view, drive the search/receipt filters, and require browsers installed via `npx playwright install --with-deps`.

_CI:_ A GitHub Actions workflow (`.github/workflows/ci.yml`) runs the unit tests, smoke suite, Playwright end-to-end suite, and bugfix regression on every push/PR. Provide `DATABASE_URL` (and optionally `ANTHROPIC_API_KEY`) as repository secrets so Prisma can connect during the run.
