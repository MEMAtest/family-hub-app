# Family planning release - 7 October 2026

## Scope

- Household institution rules use member IDs. Source-aware routing applies to Gmail, forwarding, documents and saved previews; class-specific uncertainty stays pending.
- Historical assignment repair is hash-checked, audited, update-only and preserves manual overrides and event IDs. Five verified Stewart Fleming imports, including today's photo day, were corrected to Amari; 42 saved draft assignments were repaired. Two malformed saved events were left unchanged for review.
- Saved-event source access shows institution, sender and received date with original text and mailbox access where available. Concise summaries keep original evidence separate.
- Rich event metadata now persists travel details, preparation, household coverage, status and reminder preferences across devices.
- Separate recipient reminder state, durable snooze and atomic deduplication run on the server. Routine prompts are planned for 08:00 and 20:00 London; a known departure also enables T-60. No assumed acceptance or invented departure time.
- Angela's existing 8 October wedding event now has travel/preparation/coverage context. Its identity, title, type and original times are retained. Ade is asked to confirm cover rather than silently assigned it.
- Bathroom quote, overview, map, chooser and exports use basket-backed selection and quantity-aware parts coverage. Unknown contents never hide a linked selection. Bundles are charged once, alternatives do not inflate progress and room selections remain isolated.
- Selected pictures/names/prices appear first; item navigation and Back restore position. Main Bathroom uses teal, Shower Room blue. Quote-size success, actual differences and unknown fit have separate states.
- Every spend category is shown against known selected goods cost. Ordered goods, unknown prices, delivery and the original dated labour/goods quote are distinct.

## Verification

- 93 Jest suites / 808 tests passed.
- Typecheck, whitespace checks and production build passed before final browser refinements; final build is repeated for the release commit.
- Isolated real-Postgres reminder rehearsal: 8 checks passed, including closed-browser scheduling, two-parent records, deduplication, recipient authorization, persistent snooze, independent completion and cancellation. No external push was attempted in this rehearsal.
- Phone/desktop browser journeys cover saved choices, replacements, bundle quantities, cost reconciliation, deep checklist Back, reload, school intake, assigned-child review and event summary.
- School repair was applied to the verified household and repeated read-only; approved event IDs no longer appear as proposed corrections.
- The actual saved Angela event was reloaded. A read-only 20:00 preview targets Angela for preparation and Ade for cover; departure and return remain unknown.

## External Boundaries

Grandir/Famly notice intake and official portal access are included. An authenticated read-only parent portal connector and encrypted parent session have NOT been established or implemented as a working connection. Background portal sync stays disabled; unopened content remains pending. Do not collect a password in chat or represent a mailbox notice as portal connectivity.

Phone push is restricted to the named recipient's opted-in subscription. Provider acceptance is not proof of phone receipt. WhatsApp travel reminders remain unavailable and are never marked delivered.

Exported assignment repairs retain existing Google IDs and mark pending updates, rather than reinserting events. The five applied corrections were not Google-exported; no Google-side change was needed.

## Release Procedure

Apply only `scripts/schema/family-planning.sql` through the dry-run/apply helper. No destructive schema push is needed. Commit the verified checkout, push the commit to main, deploy that commit with `RELEASE_COMMIT_SHA`, inspect Ready status and production alias, then rehearse authenticated production screens and `/api/families/<familyId>/planning-status`.

The communications dispatcher is hourly but opens Gmail only at 08:00/20:00 London. The reminder dispatcher is minute-based for T-60; deterministic IDs suppress routine repeats. Monitor runtime failures and recipient-specific delivery review. No physical phone or cross-device replacement proof is implied by responsive browser tests.
