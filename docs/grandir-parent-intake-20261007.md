# Grandir parent notice intake

## Implemented Behavior

- A parent-only connection verifies the signed-in household account against the provider account and its single nursery-child relationship. The child's member ID must agree with the household Grandir source rule.
- The connection stores an AES-256-GCM encrypted opaque session, never the parent password. Authenticated encryption binds the secret to its household. Generic shared-document APIs cannot read this private key.
- Retention is capped at 30 days; provider revocation expires access earlier. Disconnect drops the encrypted secret without deleting saved notices or calendar dates.
- The bounded recent feed is checked separately from Gmail at 08:00 and 20:00 Europe/London. Generated attendance/care logs, photos, comments, likes and payments are excluded from saved intake.
- Undated activity updates are saved for reference, not converted into invented future appointments. Only dated, ready, verified-child drafts can be created automatically. Offers, adult attendance and incomplete content retain review safeguards.
- Deterministic notice/event identities prevent duplicate imports. Changed notices flag original-source review rather than replacing manually saved dates. New sync results do not count earlier imported dates as newly added.
- Connection, last successful check, explicit reconnect, disconnect and original-post links are available from the School & nursery inbox. Errors never expose provider tokens or raw provider exceptions.

## Nursery Clarity Follow-up

- School and nursery updates have separate inbox filters and source accents. Nursery notices show the mapped child, a short purpose, original timing and preparation actions.
- Preparation such as bringing a book stays actionable even without a dated appointment. A parent chooses a due date and saves one child-linked task. Deterministic task IDs prevent retries from duplicating tasks or resetting completion. Saved tasks are reconciled with the inbox and refreshed into the calendar immediately.
- Explicit weekly routines can be scheduled for the nursery child using the existing routine flow. Past learning reports do not imply recurring attendance. Unknown dates, days or times remain decisions rather than invented calendar entries.
- Recent notice intake follows the parent app's observed cursor and older-than paging parameters: at most four pages, 120 non-generated notices and a 30-day lookback per check. Repeated pages stop safely. This is not a full-history guarantee.
- Relative timing is shown with the original notice date. Dated portal parsing uses that source date rather than the day a later sync runs.
- Attachment-only notices retain a pending-content action and original-post link. Attachment contents, photos and private messages are not automatically read by this connector.

The authenticated portal contained a next-week Book of the Week preparation notice behind the first page of daily updates. This follow-up addresses that missed-page and reference-only presentation problem; it does not activate the production account without the outstanding explicit session-retention consent.

Follow-up validation: 115 unit suites / 1,043 tests passed; 21 school/nursery browser journeys plus a nursery-routine phone journey passed. The browser suite includes immediate task display, save/reload, separate source filtering and attachment/reference handling. Independent review found verified-child remapping and same-page duplicate edge cases; both were fixed with regression tests and rechecked. Exact Grandir portal links resolve nursery notices; generic Famly links and lookalike hosts do not assert a child or nursery.

## Configuration

`GRANDIR_SESSION_ENCRYPTION_KEY` must be a canonical base64-encoded, cryptographically random 32-byte production secret. Do not rotate it without an explicit reconnect/migration plan. `CRON_SECRET` and `CALENDAR_INBOUND_FAMILY_ID` scope the existing household scheduler.

Connection requires explicit read-only/session-retention consent. A password may be submitted transiently to the official provider login operation; the official additional-verification challenge is not bypassed. An already authenticated parent session can be connected with consent using the masked session field. Never request or paste passwords into chat.

## Verification Boundaries

Local validation: 113 unit suites / 1,010 tests passed; 18 phone/desktop school-inbox journeys passed, including Grandir consent, verified-child display, reload persistence and revoked-session recovery. Typecheck and final production build passed. Browser fixtures do not assert physical phone receipt or real provider authentication.

The parent role, Askia's nursery association, official feed transport and original-post route were observed in the authenticated portal. This is not yet proof that a retained session successfully read notices from the production server. Require an actual successful connect/sync, reload and repeated-sync check before calling the account connected.

This release reads the bounded recent notice feed, not the entire historical portal or its attendance calendar, private messages or attachments. It does not imply support for the official organization-admin API. Provider internal transport may change; schema/authorization failures stop safely and expose a reconnect or retry action.

Scheduled configuration and browser/unit tests are not proof of a completed production time slot or physical phone delivery. The release-monitor automation remains paused at the user's request.
