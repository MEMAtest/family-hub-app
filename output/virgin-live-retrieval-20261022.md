# Virgin Money Live Retrieval: 22 October 2026

## Verified

- Existing authenticated Chrome; joint M Plus Current only. No payments,
  paper-statement orders, preferences or account settings changed.
- Real Basic CSV exported through the bank's Download transactions screen.
- Final export requested 01/01/2000 to 22/10/2026.
- Returned 1,764 rows, from 2023-04-21 through 2026-10-20, 113,193 bytes.
- SHA-256: `5acc4220bebeeeb393df849ea33920084488530470d4ca5c35a348dd201c0ce0`.
- Canonical original:
  `/Users/omosanya_main/Library/Application Support/FamilyHubBankAssistant/virgin/5acc4220bebeeeb393df849ea33920084488530470d4ca5c35a348dd201c0ce0.csv`
- Private directory 0700; original 0600. No data uploaded to Family Hub or AI.
- Local service accepted the original and downloaded exactly identical bytes.
  Its bank connection stayed idle; PDF history remained incomplete and daily
  checks remained disabled. Local dashboard displays the real CSV record.
- Twelve controlled tests passed in 15.6 seconds after final changes. This
  includes synthetic browser export, legacy PDF tests, invalid CSV rejection,
  origin/cookie protection, persistence and concurrent deduplication.

## Not Verified or Not Implemented

- No PDF statements downloaded: bank communications/statement frames were blank.
- Standalone iframe navigation failed and required reauthentication; not reused.
- No live unattended worker authentication, Android approval relay or MCP.
- Existing Chrome login is not the worker's separate encrypted Chromium login.
- No production deployment, production ledger writes, daily schedule or startup.
- Returned range does not independently establish complete bank statement history.

## Storage

- Reused existing checkout and runtime; created no worktrees or project copies.
- Added approximately 9.5 MiB of pinned build dependencies to the small runtime;
  retained deliberately for rebuilding. Runtime dependencies total about 113 MiB.
- Removed 14 task-generated redundant CSV files, reclaiming 543,580 bytes,
  only after hash checks and row-multiplicity containment in the final original.
- Final original retained once; state references its hash. No unique financial
  evidence removed. Restore redundant ranges by exporting again if needed.
- QA output limited to a small test summary and one local-dashboard screenshot.
