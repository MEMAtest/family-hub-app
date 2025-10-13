# Release Notes – PWA & Responsive Polish (2025-03-05)

## Highlights

- **Full PWA experience:** refreshed manifest with id/scope, maskable icons (72–512px), navigation preload, share target metadata and custom Apple splash screens.
- **Offline-ready service worker:** caches the app shell, `_next/static` assets (stale-while-revalidate), and rich media (capped) with an `/offline.html` fallback plus upgrade handling via `SKIP_WAITING`.
- **In-app install flow:** install prompt hook + overlay banner (Android/desktop) and inline iOS guidance keep installation discoverable without nagging repeat visitors.

## Responsive UX improvements

- Added a fixed, scrollable bottom navigation bar on phones with safe-area padding and updated header spacing.
- Dashboard snapshot cards collapse into a swipeable carousel for quick access on mobile.
- Calendar view now stacks management actions (Templates / Conflict rules) for small screens while keeping the desktop toolbar intact.
- General spacing tweaks (`pb-24` app content, header flex wrap, mobile action buttons) prevent overlap with the new navigation.

## Testing & QA

- Confirmed smoke/unit suites are still green: `npm run test`, `npm run test:smoke`.
- Manual smoke run followed `QA_SMOKE_CHECKLIST.md` covering install prompts, offline fallback, navigation, and core workflows.
- Service worker registration validated on fresh installs and upgrades (verified via Chrome DevTools → Application → Service Workers).

## Rollout notes

- Bundle all new assets from `public/` (icons, apple-splash, offline.html) when packaging.
- If deploying via Vercel, no additional configuration is required; ensure `next.config.js` stays in sync with cache headers.
- Document QA sign-off by appending initials/date to the checklist once the sweep is run for a release candidate.
