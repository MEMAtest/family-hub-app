# Family Hub calendar — state of play and handover

**Branch:** `fix/calendar-recurrence`
**Base:** `origin/main` merged in; branch is up to date with it
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

## Verification status

Everything the original sandbox could not run has now been run on a real machine
(14 September 2026, macOS, Node 25, `Europe/London`).

| Check | Status |
|---|---|
| Jest, full suite | ✅ **239 passing**, 24 suites (65 new tests) |
| Jest under `TZ=UTC` and `TZ=Europe/London` | ✅ both green |
| `tsc --noEmit` | ✅ clean (needs `NODE_OPTIONS=--max-old-space-size=8192`) |
| ESLint across `src/` | ✅ clean |
| `prisma validate` / `prisma generate` | ✅ schema valid, client generates |
| **Playwright `calendar-recurrence.spec.ts`** | ✅ **3/3 passing — first real execution** |
| **Calendar rendered in a browser** | ✅ weekly series drawn on every Wednesday, one-off drawn once |
| Playwright, whole `user-journeys` suite | ✅ 62 passing locally; the 4 that fail in CI are red on `main` too |
| Prisma schema against a real Postgres | ✅ `db push` applies; both new tables created |
| Migration applied to production | ❌ not applied — deliberate, see below |

The first real e2e run found two things, both fixed in `921e29c`.

**`BrainFocusWidget` took the whole dashboard down on a malformed payload.** Its guard read
`!data || data.total === 0`, so any truthy non-`TodayData` response walked straight past it
and `data.groups.flatMap(...)` threw during render. That unwinds to the top-level
`ErrorBoundary`, so the user gets "Something went wrong" and no app at all — from one bad
response on a widget whose whole job is to render nothing when there is nothing to show.
It now type-guards the fetch and keys the render off `groups`. This is what made the e2e
fail: the calendar button was never reachable, because the dashboard had already crashed.

**Two `taskCalendar` assertions were timezone-dependent.** They read local-midnight `Date`s
back through `toISOString()`, which is UTC — green in the UTC sandbox, red on any British
summer afternoon. The grid works in local time, so they now compare local date parts.

Worth knowing: the `dateUtils`, `formatDate` and `schoolRoutineSchedule` suites (all
pre-existing, none touched by this branch) fail under `TZ=America/Los_Angeles` and
`TZ=Pacific/Auckland`. Green in the UK, and this is a UK family calendar, so it is noted
rather than fixed — but it means the suite is not a timezone-correctness check.

---

## Immediate next steps

```bash
# 1. the e2e journeys, now known to pass
npm run test:e2e -- tests/e2e/calendar-recurrence.spec.ts

# 2. only when you want tasks persisted server-side (currently localStorage)
npm run db:push
```

The Prisma change is **purely additive** — two new tables, no changes to existing columns
— and nothing queries them yet, so deploying before `db:push` is safe.

`origin/main` has been merged in (`75e188d`), which restored the `auth_unavailable`
handling and the owner-email hint that stale working-tree copies of
`src/app/auth/sign-in/page.tsx` had been masking. `.local-backup-20260914/` is now
redundant and can be deleted.

⚠️ **`.env` and `.env.local` both point at the production Neon database.** `npm run dev`
on this machine reads and writes the real family's data. The Playwright config points at
a separate `TEST_DATABASE_URL` and the calendar spec stubs its APIs client-side, so the
e2e run touches nothing real — but do the visual checks through Playwright, not through
`next dev`, unless you mean to be on prod.

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
  original bug. Four places were found doing exactly that after the grid was fixed, each
  one visible to a user, none caught by a test — the day panel under the grid ("No events
  on this date" on a day the grid had drawn), the month analytics (a weekly club counted
  as one September event and nothing in October), the year heat map (one coloured square
  for a whole year's series), and the copilot's "where everyone is today". All four now
  expand first, and all four are pinned by e2e journeys. Still on raw dates, and still to
  do: `eventMatches` in `calendarAssistant.ts`, and `conflictDetectionService`.
- **`toISOString()` on a locally-constructed `Date` reports the previous day** anywhere
  east of Greenwich — all summer, here. `YearView` built its day keys that way. Prefer
  string arithmetic (`recurrence.ts` has it) over round-tripping through `Date`.
- **Never key a grid entry on `event.id`.** Use `occurrenceId`.
- **An event whose `type` is not on the category allowlist is silently invisible.**
  `CalendarMain` filters with `selectedCategories.includes(event.type)` against a hardcoded
  list — `sport, meeting, fitness, social, education, family, other, appointment, work,
  personal, brain`. Today every producer emits a listed value, so nothing is lost. But add
  a new event type anywhere (the parser, Gmail intake, a template) without adding it there
  and the event saves, syncs, and never appears, with no error. Cost me an hour of thinking
  the grid was broken.
- **All-day `end` is exclusive** in react-big-calendar.
- **`npm run typecheck` OOMs** on the default heap. Use
  `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit`. Pre-existing.
- **Editing an occurrence currently edits the series.** Until item 2 lands, a user
  dragging one week's swimming lesson moves every week.
