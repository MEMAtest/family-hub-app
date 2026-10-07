# Family Hub rehearsal fixes - 7 October 2026

## Release boundary

This release builds on e2c64246cb3827efdb3a25fbe3ae946bbdf4ed64.
The first rehearsal-fix pass was local only. The subsequent intake redesign uses
an explicitly requested push to main through the existing Git deployment
pipeline. No production event edits or basket writes are part of
the rehearsal. The release-monitor automation remains PAUSED.
The previous authenticated production rehearsal remains in
`output/family-hub-live-rehearsal-20261007.md`; it is not replaced by a claim
that these local changes are already live.

## Changes

- External product import retains price evidence and prefers explicitly
  labelled VAT-inclusive amounts. The actual Extractor Fan World URL now reads
  GBP 104.88 gross, GBP 87.40 net, with the supplier's explicit 20% tax rule and
  a photo URL. Unverified/net-only prices require a consumer-total confirmation
  rather than silently entering a net number as gross. Public pages keep their
  original URL without an invented Shopify variant.
- Quote-line coverage checks the parts on that line, even if the linked demand
  only names WC furniture. Accessory titles such as towel rail valves and
  shower tray waste no longer count as complete fixtures. Compatibility prose
  does not supply another fixture. Explicit household evidence remains authoritative.
- An existing selected household item can explicitly be linked as a replacement
  for its related quote item. Purchases, quantities and prices are retained;
  the original demand remains, quote differences remain visible, and an ordered
  purchase cannot have its quote link changed by this action.
- Bath-filler mounting is compared separately from dimensions, contents and
  room fit. A deck-mounted selection against a wall-mounted quote remains
  selected with an amber difference, including in the pinned selection summary.
- Bathroom URLs restore the active project after hydration. Back to Projects
  clears bathroom navigation. Edit plan opens and scrolls to the saved tile
  calculator. Search results immediately follow search, including household
  additions outside the original quotation.
- Ordinary calendar and upcoming-list clicks use current server metadata to
  choose travel editing, just as reminder links do. Failed requests show Retry;
  local-only events remain editable without a server record.
- Imported event edit drafts use short titles and locations, with source text
  retained. Unspecified source times are blank and explicitly unconfirmed rather
  than presenting midnight and a 1439-minute duration as known appointment details.
  Confirming a time is deliberate and preserves the original imported fields.
- School intake separates decisions from added/reference-only notices. Opening
  a trusted update processes its eligible saved events server-side, without a
  second import click. GET requests stay read-only. Scheduled Gmail intake also
  performs a bounded, resumable saved-intake sweep, with source/event dedupe.
- Inbox counts reconcile saved events, not stale extraction metadata. Imported,
  generic non-event and dismissed rows cannot reappear as outstanding choices.
  Explicit adult attendance, invitation/booking confirmation and unsupported
  source clock values remain review-required. School preview routing uses current
  household rules while retaining manual overrides and original source evidence.
- Every outstanding update included in the pending count is available in the
  inbox, even when older than the recent reference-mail window. Recent notices
  cannot push unresolved decisions out of view; overlapping rows are deduplicated.
- The intake panel opens near the calendar header. Settings and reference mail
  are collapsed; document upload and event decisions use a focus-managed dialog
  with a phone-reachable footer. Sync refreshes current calendar events directly.
- Phone calendar filters are compact and the selected-day agenda precedes the
  full grid. Source-date conflicts remain visible in an expandable warning.
  Travel fields use full-width phone rows, readable light/dark controls, and
  a modal above the bottom navigation.

## Coverage regressions

Checks cover cistern-to-quote linking, accessory-versus-fixture inference,
duplicate valve/waste warnings, and deck-mounted versus wall-mounted bath
fillers. Read-only household evidence and screenshots stay in untracked local
output; no household purchase records are published in these notes.

## Verification

- Initial rehearsal: 102 Jest suites, 917 tests passed; 36 browser journeys passed.
- Final unit run: 103 Jest suites, 948 tests passed, including older-inbox
  decision visibility beyond the recent reference-mail window.
- Full local journey run: 112 passed, two external-email checks skipped, one
  timeline visibility failure. The focused rerun passed the timeline journey
  and the strengthened attendee-close/reopen regression. Release acceptance also
  requires the full Git pipeline journey run to pass, not just this focused rerun.
- All 12 bathroom tile, supplier-link, quote, measurement, photo refresh and
  download journeys passed in a complete separate run.
- Three isolated database-backed budget smoke checks passed.
- TypeScript check passed.
- Optimized production build passed, including lint and type validation.
- Isolated reminder-state rehearsal: 8 checks passed; no external delivery attempted.
- Initial desktop/phone browser rerun: 36 journeys passed, including replacement
  linking, reload without reopening the project, Back position, saved tile-plan
  opening, ordinary travel click, unknown-time editing and reachable phone footer.
- Actual dark-theme travel screenshot was visually inspected. The corrected
  browser test verifies the theme class and at least 4.5:1 inactive-button text
  contrast. It does not mistake a light-theme screenshot for dark-mode proof.

Commands: `npm test -- --runInBand`, `npm run typecheck`, `npm run build`,
`npm run test:smoke`, `PLAYWRIGHT_PORT=3212 npm run test:e2e:user-journeys`,
and `PLAYWRIGHT_PORT=3206 npm run test:e2e:tiles`.
The reminder rehearsal used the isolated localhost `family_hub_test` database.
Build/test warnings about stale Browserslist data, Node localStorage and existing
React test act wrappers remain non-fatal; no dependency churn was introduced.

Browser fixtures and persistence checks use isolated local test data. The supplier
URL verification is a read-only public supplier request. None of this is an
authenticated production acceptance. The deployed SHA, pipeline results and
authenticated live rehearsal are recorded separately in local release evidence.

## Still separate

Grandir's encrypted authenticated connector is not implemented and background
portal sync stays disabled. WhatsApp delivery and physical phone receipt are
not proven. Actual production scheduled slots, second-parent/cross-device writes,
original project PDF download and saved production CSV download are not newly
claimed by the initial fix pass. No departure time or accepted childcare coverage was invented.
