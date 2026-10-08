# Council Bins and Nursery Inbox Clarity

## Behaviour

- The saved, exact 21 Tremaine Road / SE20 7UA property connects to Bromley's published ICS calendar, not a guessed weekly schedule.
- Mixed recycling, paper/cardboard, refuse, food and garden collections retain distinct council dates. Date-only values remain date-only across BST/GMT and host timezone differences.
- Family-scoped, deterministic calendar records are refreshed by the server reminder cron and the authenticated calendar panel. The source is checked at most once per six hours; failures retry after fifteen minutes and hold unverified sends.
- A first-screen collection strip shows today, tomorrow or the next collection, with council provenance and a visible failure/retry state.
- Evening-before reminders become due at 20:00 Europe/London and catch up before midnight. They target parent profiles independently, reuse the durable outbox, and respect cancellation, disabled reminders, completion and snooze. No collection time is invented.
- A cancelled source event and existing reminder preferences survive refresh. Changed or removed council dates cannot cause unverified pushes.
- Stewart Fleming inbox rows no longer inherit Askia's nursery label. Grandir email previews show their quoted topic and remain explicitly pending until original content is read.

## Verification Boundaries

Mocked browser journeys verify the mobile and desktop interface; they do not prove a live provider login, a scheduled production execution or physical phone receipt. Grandir's existing browser sign-in is not automatically a retained server connection. This change does not copy a parent token or claim unattended portal sync is connected.

Private production rehearsal evidence belongs in output, not this public repository.
