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

## School document intake

From **Calendar -> Quick add & import**, a family can upload one PDF or multiple page photos. Selectable PDF text is extracted server-side; photos are OCR'd in the browser. The original PDF/photos are retained privately as calendar-intake attachments, while dated items remain reviewable drafts rather than being silently added.

School email intake is Gmail-based. From **Calendar -> Quick add & import**, connect the Google account that receives school mail, then forward a newsletter to the generated `ademolaomosanya+familyhub@gmail.com` address and press **Sync Gmail**. Family Hub reads only messages addressed to that plus-address, keeps the existing parser/review workflow, deduplicates by Gmail message ID, stores supported attachments privately, and sends the normal in-app/push notification. The sync searches the last 90 days and does not read the rest of the inbox.

The signed `POST /api/inbound/calendar-email` webhook remains available for a separately configured inbound provider, but it is optional and is not required for Gmail intake. Production Google OAuth uses the existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_OAUTH_STATE_SECRET` settings; the OAuth consent screen must allow the Gmail read-only scope for the signed-in account.
