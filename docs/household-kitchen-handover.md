# Household sharing, Kitchen, issues log and kids activities — state of play and handover

**Branch:** `claude/pdf-quote-extractor-UJdM2` (name is historical; the PDF quote work merged earlier)
**Base:** `origin/main` @ `1af631a` merged in; branch is 0 behind, 16 commits ahead, merges cleanly
**Date:** 26 September 2026
**Goal for the next agent:** review, get CI green, merge to `main`, then do the one-off production step below.

---

## What this branch adds, in plain terms

1. **Property issues log** (Property → Issues). Type or say "gutters overflowing and the
   windows need a clean"; it is split into jobs with trade, cost, urgency, suggested date,
   repeat interval and safety note, then synced to property tasks and the calendar.
2. **Shared household data.** Property records, issues, kids bookmarks, Kitchen usuals and
   the Monday email settings used to live only in one browser's localStorage. They now sync
   to every signed-in device through a new `family_documents` table.
3. **Kids activities** (News → Kids Events) rebuilt as an evergreen, honest catalogue near
   SE20 (the earlier version had hard-coded summer dates and invented ratings/prices).
4. **Kitchen** (new page, Plan section): household "usuals" with learned run-out
   predictions, one-tap / typed / spoken "we're low", a Top-ups shopping list, receipt
   scanning to restock, an AI fridge-photo check, and a "what you made this/last week" log.
5. **Monday email** gains four optional sections: kids ideas, home jobs, worth stocking up
   on, and what you made last week. Settings panel is shared by Kitchen and Kids Events.

Full design of the sync layer: [`docs/shared-household-data.md`](./shared-household-data.md).

---

## Commits (oldest first)

| Commit | What |
| --- | --- |
| `6ccc12a` `11dbd6d` | First kids events version (superseded by `b80ad0f`) |
| `1bf651c` | package-lock refresh from that work (lockfile later taken from main in the merge) |
| `5094c75` | Property issues log with AI triage and calendar/task sync |
| `c1180df` | Fix kids events page compile error; remove broken server self-fetch |
| `ce381c8` | Fixes from rehearsal: safety jobs never DIY, AI fast-fail limits, task categories reuse survey ones, image fallback loop |
| `5c380f8` | **Shared household data** (`FamilyDocument` model, API, 3-way merge, sync engine, status badge) |
| `b80ad0f` | Kids activities evergreen catalogue, stable ids, working age filter |
| `0923bdd` | Monday email: kids ideas + home jobs, extra recipients |
| `ace143a` | Warn before logging an issue that is already open |
| `38d0dbc` | E2E: household data shared between two devices |
| `b4ab4c7` | Shared `useSpeechInput` hook |
| `1c7ea85` | **Kitchen** page |
| `42c48fa` | Monday email: meals recap + stock-up |
| `07f3b86` | E2E: Kitchen across two devices |

66 files, ~8.1k lines added (much of it tests).

---

## Merge checklist

1. **CI.** `ci.yml` runs Jest + smoke + one calendar E2E. `user-journey-review.yml` spins up
   Postgres, runs `prisma db push`, then `npm run test:e2e:user-journeys`, which now includes
   `household-sharing.spec.ts` and `kitchen.spec.ts`. Both must be green.
2. **Locally, if you can:** `npm ci && npx prisma generate && npm test` (expect 41 suites,
   408 tests) and `npx tsc --noEmit` (expect 0 errors once Prisma client is generated).
3. **Merge to `main`** (normal merge commit or squash; history is clean either way).
4. **Production schema — required once, by hand.** Nothing in the deploy pipeline runs
   `db push` (see `docs/calendar-handover.md`). After merging, run:
   ```bash
   npm run db:push
   ```
   - Additive only: creates `family_documents` and a relation on `families`. No data changes.
   - **`.env` / `.env.local` point at the production Neon database**, so running it locally
     changes production. That is the intended way here, but be deliberate.
   - Safe in either order relative to the deploy: until the table exists, the documents API
     answers 503, the app keeps working per-device, and the UI shows "Only on this device".
   - After it runs, the first device to open the app uploads its local data. Ideally that is
     the owner's phone with the most complete property data.
5. **Env vars** (Vercel): no new required vars. Optional:
   `ANTHROPIC_VISION_MODEL`, `OPENROUTER_VISION_MODEL` (defaults: `ANTHROPIC_MODEL` or
   `claude-sonnet-4-20250514`; `OPENROUTER_MODEL` or `openai/gpt-4o-mini`). Photo features
   need `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`; without one they say so (no fake data).

---

## Verification status

**Verified** (in a cloud sandbox, real Next.js dev server + real Postgres 16):
- Jest: 41 suites / 408 tests pass; ESLint clean on all changed files; `tsc` 0 errors.
- Playwright, run like CI (`--workers=1`): `household-sharing.spec.ts` 3/3, `kitchen.spec.ts` 4/4.
  These use two browser contexts as two phones and assert against the database.
- Missing-table behaviour (table renamed away): app works, badge says "Only on this device",
  Monday email still renders without the table-backed sections.
- Real 3.8MB phone photo through the fridge upload path: shrunk client-side to 1200×1600
  (~320KB) and delivered to the vision API as a valid JPEG.

**Not verified — do this after deploy:**
- **Live AI output.** The sandbox had no AI key and blocked Prisma's engine download, so AI
  calls were exercised against a local stand-in speaking the Anthropic Messages API format.
  Plumbing, validation and fallbacks are tested; the *quality* of real Claude readings of a
  fridge photo or a receipt is not. Try: one fridge photo, one supermarket receipt, one
  issue note ("gutters overflowing and the windows need a clean").
- Monday email to real inboxes: use
  `GET /api/cron/weekly-digest?preview=1&familyId=…` with `Authorization: Bearer $CRON_SECRET`
  to eyeball it, then `?only=<one address>` for a single real send.

---

## Landmines for whoever picks this up

- **Rehearsal harness — do not commit.** In the sandbox, Prisma's native engines could not be
  downloaded (403), so local runs temporarily switched `prisma/schema.prisma` to
  `previewFeatures = ["queryCompiler","driverAdapters"]` + `engineType = "client"`, added a
  `prisma.config.ts`, and passed `@prisma/adapter-pg` in `src/lib/prisma.ts` and
  `tests/e2e/test-database.ts`. All of that was reverted before every commit; the committed
  code uses the normal engine. If you see those changes in a diff, they are a mistake.
- **`ShoppingContext.addItem` reads a render-time snapshot of lists.** Adding to a list created
  in the same tick silently no-ops. `useTopUpsList` deliberately bypasses it and writes through
  `databaseService` + the live store. Don't "simplify" it back to the context.
- **Top-ups list identity.** It is found by name (`Top-ups`). If duplicates ever exist, every
  device picks the one with most items, then the oldest. Before creating, the hook checks the
  server (lists may not have loaded yet).
- **Order matters in "we're low":** the Top-ups list is updated *before* the usual is flagged,
  otherwise an old ticked-off entry reads as "bought" instantly. There's a test for it.
- **Meal store keeps one meal per day** (`mealPlanning` keyed by date). The Kitchen meal log
  reads `/meals` directly for that reason; the Meals page won't show a second meal on the same
  day until that store is reworked.
- **Sync merge semantics** live in `src/lib/sharedDocumentMerge.ts`; the persisted "base" is
  only trusted if the device still holds ≥50% of it, so a wiped cache can never delete shared
  data. Read the tests before changing anything there.
- **Monday email timing** is `0 7 * * 1` UTC: 8am UK in summer, 7am in winter. Unchanged.
- **Kids catalogue** (`src/data/kidsActivities.ts`) is hand-curated and deliberately states
  only stable facts; every card links to the venue. There is no live events source.
- **Existing AI receipt route** `api/families/[familyId]/budget/ai-receipt` still returns mock
  data on failure (pre-existing, not touched here). The Kitchen uses its own honest route.

---

## What is left, in order

1. Run the post-deploy AI checks above and tune the prompts in `src/lib/kitchenVision.ts` /
   `src/services/aiService.ts#enhancePropertyIssues` if readings are poor.
2. Fix the pre-existing mock-data fallback in the Budget `ai-receipt` route.
3. Let the Meals store hold more than one meal per day.
4. Optional: an 8am-all-year digest (needs a second cron or an in-route London-hour check;
   check the Vercel plan's cron limits first).
