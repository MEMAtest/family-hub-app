# Family Hub calendar — state of play and handover

**Branch:** `fix/calendar-recurrence` (3 commits, not yet pushed)
**Base:** behind `origin/main` by 2 commits (Google sign-in work) — no file overlap, merges clean
**Date:** 14 September 2026

---

## What was wrong

The calendar had three structural problems, not three bugs.

1. **Recurrence was declared but never implemented.** `CalendarEvent` carried three
   overlapping fields — `recurring` (string), `isRecurring` (boolean) and
   `recurringPattern` (a full RRULE-shaped object). Nothing populated the rich one and
   nothing expanded any of them. `CalendarMain` mapped one database row to one grid
   entry, so a weekly event rendered once, on the day it was created. The Prisma column
   is `recurring_pattern String @default("none")` — there was never anywhere to store
   an interval or a day list.

2. **Work with a deadline had nowhere to live.** "Homework set Wednesday, due Sunday"
   cannot be an event: an event happens *at* a time and has no done state. The concept
   existed in the wrong module — `BrainNode` due dates were surfaced onto the calendar
   as fake 30-minute 09:00 appointments with a 🧠 prefix.

3. **The "AI" was a regex that only fired on command verbs.** `isCreateIntent` required
   the sentence to *start* with add/create/book/schedule/put/make. "Kayode has swimming
   on Tuesdays" fell through to "I don't understand". When no child was named it
   silently assigned to `people[0]` and buried a warning in the summary line.

---

## What is done

### Commit 1 — `81b1607` Expand recurring events into their actual dates

- **`src/utils/recurrence.ts`** (new) — the single source of truth for "what is on
  between X and Y". `expandOccurrences` / `expandEvents` / `groupOccurrencesByDate` /
  `resolvePattern` / `getExpansionRange`.
  - daily, weekly, monthly, yearly; `interval`, `daysOfWeek`, `dayOfMonth`, `endDate`,
    `endAfter`
  - `RecurrenceException` model so one instance can be skipped or moved
  - all date maths on `YYYY-MM-DD` strings via **UTC-noon** Date objects, so a BST/GMT
    transition cannot shift an occurrence onto the wrong day
  - monthly **skips** months lacking the day (31 Jan + 1 month) per RFC 5545 rather than
    clamping, and a skipped month does not terminate the series
  - `endAfter` counts from the series start, not the query window — otherwise a finished
    series reappears when you page forward
  - `resolvePattern` upgrades legacy rows by anchoring to the start weekday, so **no data
    migration is needed**
- **`CalendarMain.tsx`** — grid expands before rendering, over the visible month ±2
  months. Entries keyed by `occurrenceId` (`${event.id}:${seriesDate}`); `event.id` is no
  longer unique once a series expands and duplicate React keys make the grid reuse DOM
  nodes across weeks.
- **`CalendarContext.tsx`** — `deleteEvent` now clears the `localStorage` cache.
  `createEvent` and `updateEvent` both wrote through; `deleteEvent` did not, so
  `mergeEvents` pulled the deleted event back out on the next hydration.

### Commit 2 — `ce9ba96` Homework/task model and plain-English input

- **`CalendarTask`** type — `assignedDate`, `dueDate`, `assignees[]` (plural: homework is
  often set for both kids), `completedAt`, `taskType`, `subject`, `effortMinutes`,
  `sourceEventId`, optional `recurringPattern`.
- **`src/utils/tasks.ts`** — status machine (not-started → in-progress → due-soon →
  due-today → overdue → completed), urgency sort, and expansion of repeating work that
  preserves the set-to-due gap on every instance. Reuses the event expander rather than
  reimplementing recurrence, so the two cannot drift on DST or month-end.
- **`src/utils/taskCalendar.ts`** — renders a task as an **all-day band** from set date to
  due date. Coloured by urgency, not by person. Dashed start edge, solid deadline edge, so
  it reads differently from an event block. Note: react-big-calendar treats all-day `end`
  as **exclusive**, so the band ends the day *after* the deadline or the due date is not
  covered.
- **`src/utils/familyInputParser.ts`** — replaces the command-verb gate.
  - no command verb required
  - a deadline phrase (due / by / hand in / deadline) produces a **task**, and the start
    date is read only from the text *before* the deadline clause, so "homework due Sunday"
    does not treat Sunday as the day it was set
  - times as people say them: "at 5" → 17:00, "half past four", "teatime"
  - "on Mondays", "fortnightly", "every Monday and Wednesday"
  - an unnamed assignee is returned in `needs` and **never guessed**
- `runCalendarAssistant` delegates to the parser and keeps its existing shape, so the API
  route and copilot panel work unchanged. The panel gained a confirm step for homework.
- **Bug fixed in passing:** the assistant derived "today" through an implicit UTC
  conversion, so an evening during BST resolved to tomorrow.
- **Prisma:** `calendar_tasks` and `calendar_event_exceptions` models added.

### Commit 3 — `f825b21` Run the calendar E2E journeys in CI

`tests/e2e/calendar-recurrence.spec.ts` stubs the family APIs, so unlike the rest of the
suite it needs no `DATABASE_URL`. CI already installs Playwright browsers, so this is one
step. Traces/screenshots/video upload on failure. Also added `prisma generate` before the
test steps.

---

## Verification status — read this before trusting anything

| Check | Status |
|---|---|
| Jest, full suite | ✅ **239 passing**, 24 suites (65 new tests) |
| `tsc --noEmit` | ✅ clean |
| ESLint across `src/` | ✅ clean |
| Playwright spec collects | ✅ 3 tests listed |
| **Playwright actually executed** | ❌ **never run anywhere** |
| **App opened in a browser** | ❌ **never** |
| `prisma validate` / `generate` | ❌ could not run |
| Migration applied | ❌ not applied |

**Three hard blockers in the sandbox this was built in**, all network/permission, none
fixable with more effort:

- **Chromium will not install** — the Playwright CDN is blocked by the egress proxy, there
  is no sudo, and the npm-hosted browser package downloads from the same host. So the e2e
  spec and the CI step it enables are **unproven**; expect the first CI run to need a
  selector tweak.
- **Prisma engine binaries are blocked** (same proxy), so `prisma generate` and
  `prisma validate` could not run. The schema edits are syntactically careful but
  **unvalidated**.
- **No GitHub credentials** — no token, no credential helper, no `~/.netrc`, and SSH
  cannot resolve github.com. The branch cannot be pushed from here.

---

## Immediate next steps

```bash
# 1. push and open a PR against main (CI only triggers on PRs to main)
git push -u origin fix/calendar-recurrence

# 2. validate what the sandbox could not
npx prisma generate
npx prisma validate

# 3. run the e2e locally — first real execution
npm run test:e2e -- tests/e2e/calendar-recurrence.spec.ts

# 4. only when you want tasks persisted server-side (currently localStorage)
npm run db:push
```

The Prisma change is **purely additive** — two new tables, no changes to existing columns
— and nothing queries them yet, so deploying before `db:push` is safe.

**Also worth doing:** `origin/main` moved ahead during this work. The copies of
`.env.example`, `middleware.ts`, `src/app/auth/sign-in/page.tsx` and `src/lib/auth-utils.ts`
sitting uncommitted in the working tree are **older** than main — `sign-in/page.tsx` is
missing the `auth_unavailable` error handling and the owner-email hint. They were left
untouched and backed up to `.local-backup-20260914/`. Check them out from main before they
cause confusion.

---

## What is left, in the order I would do it

### 1. Tasks API route and persistence — *blocks everything else about homework*
Tasks live in `localStorage` (`familyHubTasks`) via `CalendarContext`. Needs
`/api/families/[familyId]/tasks` following the shape of the existing `events` route, then
swap the context over. The models are already in `schema.prisma`.

### 2. Single-instance editing UI — *the model exists, nothing drives it*
`RecurrenceException` supports skip and move, and `expandOccurrences` honours it, but
nothing writes one. Today, clicking any occurrence opens the **series** via
`openEditForm(occ.event)`. Needs the standard "this event / this and following / all
events" prompt. `occurrence.seriesDate` is the value to write into the exception row.
`calendar_event_exceptions` is already in the schema.

### 3. Monday morning digest email
`NotificationPreferences` already has the right shape — `weeklyPreview`,
`weeklyPreviewDay`, `weeklyPreviewTime`. No sender exists. Build it on `expandEvents` +
`expandTasks` so it cannot drift from what the grid shows. Vercel Cron → a dedicated route.
**It would have been actively misleading before this work**, since it would have omitted
every recurring event.

### 4. Timezone — still half-broken
`mapDatabaseEventsToCalendarEvents` in `CalendarContext.tsx` reads `getUTCHours()` /
`getUTCMinutes()`, and `inferEndDate` builds `new Date(\`${date}T${time}:00Z\`)`. During
BST every event read from the database displays **one hour early**. Correct in winter,
which is why it has survived.
`inferEndDate` can be deleted — `recurrence.ts` derives `endDate` with string arithmetic
and no `Date`. The `getUTCHours` half needs a decision: `eventTime` is a Prisma `DateTime`
holding what is really a wall-clock time. Either store `HH:MM` as a string and stop
round-tripping through `Date` (probably right for a family calendar — "swimming at 5pm"
means 5pm whatever the offset), or convert through the family timezone.
`CalendarSettings.timeZone` exists and is unused.

### 5. Conflict detection is computed and thrown away
`createEvent` calls `detectConflicts(...)`, saves regardless, and uses the result only to
reword a toast. Its return type advertises `{ status: 'conflict' }` which is **never
returned**, and `openConflictModal` is wired into context but never called from the create
path. Either wire it up or delete it. Note it should now compare **occurrences**, not
events — two weekly events clash every shared week, not just the first.

### 6. Proactive suggestions ("Scouts, he's old enough now")
Needs a date of birth on the family member record — check whether one exists. Then an
age-and-interest rule set producing suggestions, surfaced in the digest rather than as
interruptions.

### 7. Collapse the three recurrence fields
`recurring`, `isRecurring` and `recurringPattern` all express one idea and are how they
drifted apart. `resolvePattern()` is the shim that makes a gradual migration safe: write
`recurringPattern` everywhere, backfill, then delete the other two.

### 8. Smaller things
- **Corrupted emoji** in `src/utils/eventSemantics.ts` — most of the icon map is mojibake
  (`'ð¤'`, `'ðª'`). A UTF-8 round-trip went wrong; users see broken glyphs. Only `⚽` and
  `⭐` survived.
- **`console.log` on every provider render** in `CalendarContext` and `CalendarMain`.
- **Three-way state with a 60s poll.** Events live in Postgres, `localStorage` and a
  zustand store, reconciled by a last-write-wins `updatedAt` heuristic, refreshed every
  60 seconds plus on focus plus on visibilitychange. The delete bug came from here and it
  will produce more. Worth collapsing to server-as-truth with localStorage as a read-only
  offline cache.
- **`priority` and `status` are hard-coded** to `'medium'` / `'confirmed'` when loading
  from the database, so stored values are discarded on every read.
- **Email sign-up / Gmail connect** — reported as broken, never diagnosed. The 7 September
  work (14 files, `gmailCalendarServer.ts`, `calendarEmailIngestion.ts`, the OAuth callback)
  is recent and unexamined. Could be scopes, redirect URI, or token storage.

---

## Landmines for whoever picks this up

- **Everything that answers "what is on between X and Y" must go through
  `expandEvents`/`expandTasks`.** Any new code filtering on `event.date` reintroduces the
  original bug. Current call sites still on raw dates: `eventMatches` in
  `calendarAssistant.ts`, and `conflictDetectionService`.
- **Never key a grid entry on `event.id`.** Use `occurrenceId`.
- **All-day `end` is exclusive** in react-big-calendar.
- **`npm run typecheck` OOMs** on the default heap. Use
  `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit`. Pre-existing.
- **Editing an occurrence currently edits the series.** Until item 2 lands, a user
  dragging one week's swimming lesson moves every week.
