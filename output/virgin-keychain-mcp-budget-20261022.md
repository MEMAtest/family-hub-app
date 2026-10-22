# Virgin Keychain, MCP and Budget Rehearsal

## Verified Locally

- Login saved to macOS Keychain by protected stdin with echo disabled; readback
  checked in memory. No password or login identifier belongs in this document.
- `virgin-money` registered in Codex with a 150-second tool timeout. SDK stdio
  handshake, tool discovery, real refresh and budget-preview preparation passed.
- Worker restarted and reused its encrypted session for a real export at
  2026-10-22T15:08:14.123Z. The five-row incremental file overlaps the original
  history; it is not five newly imported transactions.
- Daily London 07:00 and next-login startup enabled. Catch-up slot recorded as
  `2026-10-22:07`, but it subsequently needed phone approval which expired.
  This is not claimed as a successful scheduled slot or physical phone receipt.
- Original full export: 1,764 rows, 2023-04-21 to 2026-10-20, SHA-256
  `5acc4220bebeeeb393df849ea33920084488530470d4ca5c35a348dd201c0ce0`.
- Headed preview: 1,764 identical parsed rows, SHA-256
  `8a2ca4f7680888c205dcad8473b63fe6682f581a9b25b4270e884f0aeeb3f74c`.
- Balance reconciliation passed across the full export. Updated stable keys
  preserve all 1,764 rows, including two equal-payment pairs formerly collapsed.
- App unit tests: 1,367 passed across 159 suites. Connector tests: 18 passed.
  Build/typecheck passed. Browser budget preview-before-commit rehearsal passed.
  Initial production-mode fixture rehearsal did not load the synthetic family;
  it was corrected to use the isolated E2E build flags and passed.

## Live Budget

- Authenticated UI initially showed no bank account connected and no imported
  actual transactions. Agent created the approved tracking account
  `Virgin Money Joint Current`; this is not creation of a bank account.
- External AI was explicitly switched off. Live import is pending the verified
  production fix and must not be inferred from the local CSV or tests.

## Boundaries

- No payments, transfers, account preferences or statement orders changed.
- Issued PDF downloads remain unverified/unfinished.
- Routine download automation is configured; ongoing automatic uploads to the
  Family Hub ledger are not configured. MCP preparation never silently commits.
- Initial local private install/build budget: at most 3 GiB. No new checkout.
  Small pinned MCP runtime dependencies remain for operation; temporary app
  dependencies and build caches are to be removed after release verification.
