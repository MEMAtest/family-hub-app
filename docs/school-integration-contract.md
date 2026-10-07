# School integration contract

Main owns the Prisma schema, calendar mapping/types, saved-event provenance views, and portal connector. At main's request this workstream integrates only trusted intake POST validation/provenance/deduplication and strict POST/PUT HH:MM validation into the general events API; all other shared changes are preserved.

## Event POST validation

Use `validateSchoolEventImport(familyId, sourceId, event)` from `src/lib/schoolIntakeServer.ts` for `gmail-school-email` and `calendar-intake` imports. Pass `source`, `personId`, `title`, `date`, `time`, `durationMinutes`, `eventType`, and `location`. This resolves the family institution and saved override rather than trusting the old stored child. `gmail-school-email` additionally requires a verified Stewart Fleming sender. Ordinary intake linkage is not sender authentication.

Preferred single-call integration: `getSchoolEventImportMetadata(familyId, sourceId, event)` returns `null` if invalid, otherwise the authoritative `schoolProvenance` and `schoolAssignment` JSON to merge into event metadata. Preserve unrelated metadata and main's durable `assignmentOverride`. This does not accept a client-supplied source snapshot.

## Saved-event metadata

`schoolEventMetadata(draft, intake)` produces the following JSON, preserving the separation between source identity and assignment:

```json
{
  "schoolProvenance": {
    "intakeId": "existing-intake-id",
    "institutionKey": "stewart-fleming",
    "institutionName": "Stewart Fleming Primary School",
    "sender": "outer From header, or null",
    "originalSenderClaim": "quoted forwarded From, or null; NOT authenticated",
    "sourceDate": "original RFC Date header, or null",
    "receivedAt": "intake received-at ISO timestamp, or null",
    "links": ["safe public source URLs without query/fragment credentials"],
    "senderVerified": false
  },
  "schoolAssignment": {
    "basis": "institution",
    "originalPersonId": "previous imported child ID",
    "sourceKey": "stewart-fleming",
    "sourceEventKey": "stable source draft hash"
  }
}
```

Show provenance beside saved events in CalendarMain tooltip/EventForm. Auto imports, UI imports, and approved repair write this shape. Original HTML and attachments remain private on the intake; normalized source links do not expose signed query tokens. A Gmail ID is stored in intake metadata but is not a guaranteed public mailbox URL.

Main's event PUT shape `metadata.assignmentOverride = { personId, changedAt, changedBy }` is recognized by repair and prevents automatic correction. It is independent of intake `schoolOverrides[sourceEventKey] = { personId, actorId, at }` and `schoolEventAssignments[eventId].manualOverride`. Do not let client metadata clear an existing durable assignment override implicitly.

## Storage and release

The source rules live in `family_documents` under `school.sources`; use the dedicated secured calendar-intake sources API (not the generic shared-document key whitelist). Bootstrap only unique child profiles named Amari and Askia to their actual IDs. Missing or ambiguous matches stay unassigned. Existing saved rules are validated against this family's child IDs.

The repair API uses a read-only dry-run followed by an explicitly approved apply with `planHash` and optional `approvedEventIds`. It never creates/deletes events, exports to Google, or sends messages. Existing exported corrections set `schoolExportPending`; main must integrate an update-only export worker using the existing Google IDs, not reinsert them.

Repair pagination is bounded to 50 sources: supply the returned `nextCursor` as `afterId` for the next dry-run, then include the same `afterId` with its apply. Original imported choices remain in `schoolOriginalParsedDrafts`, even when previews are corrected before saved-event approval. Differing legacy saved choices and both durable override shapes are preserved. Stale hashes/CAS changes return 409.

The family-communications route gates an hourly authorized cron to exactly 08:00/20:00 Europe/London before DB/mailbox calls. Main owns the hourly `vercel.json` schedule.

Grandir portal access remains pending. Famly mail alone does not establish a nursery identity, a parent session, or portal connectivity. The official sign-in link is https://www.app.grandiruk.com/ . No cross-origin browser session export or organization API token is treated as verified parent access.

## Workstream files

Paths below are relative to the shared release checkout; unrelated main/agent files are excluded.

```text
src/utils/schoolSources.ts
src/utils/schoolSyncSchedule.ts
src/utils/calendarImport.ts
src/utils/schoolEventPresentation.ts
src/lib/schoolIntakeServer.ts
src/lib/schoolIntakeRepair.ts
src/lib/calendarEmailIngestion.ts
src/lib/gmailCalendarServer.ts
src/app/api/cron/family-communications/route.ts
src/app/api/families/[familyId]/calendar-intake/route.ts
src/app/api/families/[familyId]/calendar-intake/email/route.ts
src/app/api/families/[familyId]/calendar-intake/document/route.ts
src/app/api/families/[familyId]/calendar-intake/pdf/route.ts
src/app/api/families/[familyId]/calendar-intake/inbox/route.ts
src/app/api/families/[familyId]/calendar-intake/repair/route.ts
src/app/api/families/[familyId]/calendar-intake/sources/route.ts
src/app/api/families/[familyId]/events/route.ts (limited integration, preserving main changes)
src/components/calendar/CalendarCopilotPanel.tsx
src/utils/__tests__/schoolSources.test.ts
src/lib/__tests__/schoolIntakeServer.test.ts
src/lib/__tests__/schoolIntakeRepair.test.ts
src/lib/__tests__/schoolEventImportRoute.test.ts
src/lib/__tests__/calendarEmailIngestion.test.ts
src/lib/__tests__/gmailCalendarServer.test.ts
src/lib/__tests__/schoolGmailSync.test.ts
src/app/api/cron/family-communications/route.test.ts
src/app/api/families/[familyId]/calendar-intake/inbox/route.test.ts
src/app/api/families/[familyId]/calendar-intake/repair/route.test.ts
tests/e2e/calendar-school-document.spec.ts
docs/school-email-whatsapp-reminders.md
docs/school-integration-contract.md
```

Focused verification: 12 Jest suites / 124 tests, including existing parser and presentation tests (not modified). Scoped ESLint and diff whitespace checks also pass. The school-document E2E fixtures/assertions were corrected for source context, scheduled labels, dismissal and persisted assignment PATCH; main owns the browser rerun and full shared build. No live repair, database mutation, send, deployment or commit was performed by this workstream.
