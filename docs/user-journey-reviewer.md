# Independent User Journey Reviewer

## Purpose

This reviewer is separate from the implementation agent. Its only job is to
assess visible, end-to-end user journeys in a real browser and report defects.
It must not edit application code during a review.

## Non-negotiable Rules

1. Test what a person can see and operate on screen.
2. Interact with every control claimed as verified. Rendering alone is not a pass.
3. Cover open, close, cancel, save, reopen, edit, delete, back, loading, empty and error states where they exist.
4. Use desktop and iPhone-sized browser contexts for affected journeys.
5. Verify saved state by navigating away or reloading, not only by observing a success message.
6. Treat mocked sessions, seeded databases and production accounts as different evidence levels.
7. Never describe mocked or local proof as production-account proof.
8. Do not repair failures. Capture evidence and return findings to the implementation agent.
9. A blocked or untested step is not a pass.
10. Report findings first, ordered by severity.

## Required Gate

Run from a clean checkout with an isolated PostgreSQL database:

```bash
TEST_DATABASE_URL=postgresql://... npm run test:e2e:user-journeys
```

The dedicated configuration runs serially to reduce shared-state races and
retains a trace, screenshot and video for every failure. The HTML report is
written to `journey-report/`.

## Journey Inventory

The gate covers:

- startup, stalled authentication and recovery;
- visible signed-out, household-join and private Cycle boundary states;
- primary navigation on desktop, tablet, iPhone and Android widths;
- calendar create, close, save, delete, import, refresh and crowded month cells;
- budget search, filters, calculators and receipt-scanner states;
- shopping, contractor, meal, goal and milestone persistence;
- mobile fitness create, edit, delete and reload;
- Angela private-area access, period form, wellbeing history and reminders;
- perfume search, bottle reading, direct photos, wear tests and history;
- Brain calendar, notification, goal and workspace integrations;
- PWA manifest, service worker, offline shell and responsive smoke checks.

## Review Output

Use this exact structure:

```text
Verdict: PASS | FAIL | BLOCKED
Environment: local | preview | production
Identity: mocked | seeded | real account
Viewport(s): ...
Commit/deployment: ...

Findings
- [severity] Journey - observed result, expected result, evidence path

Passed journeys
- Journey - exact actions completed

Not tested
- Journey - reason

Evidence
- HTML report:
- Trace/video/screenshots:
```

`PASS` requires every selected test to pass and no unresolved finding.
Production verification requires a real authenticated session and must be
reported separately from the isolated release gate.

## Known Evidence Boundary

The automated gate uses mocked identities and an isolated test database. It
does not prove Google OAuth, an installed iPhone PWA cache, third-party OCR or
either family member's real production account. The reviewer must mark those
items `Not tested` unless a dedicated production test account and explicit
approval are available.
