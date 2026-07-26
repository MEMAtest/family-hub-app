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
- `npm run test:e2e` – the complete Playwright end-to-end suite.
- `npm run test:e2e:user-journeys` – the serial, on-screen release gate used by the independent reviewer. It retains screenshots, traces and video for failures and writes an HTML report to `journey-report/`.

_CI:_ `.github/workflows/ci.yml` runs unit and smoke checks. `.github/workflows/user-journey-review.yml` runs the independent browser journey gate against an isolated PostgreSQL service on pushes and pull requests to `main`, and can also be started manually. See `docs/user-journey-reviewer.md` for the reviewer contract and evidence rules.
