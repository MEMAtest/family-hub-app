# Bank-backed Overview

Home's Budget Overview and Actual net flow snapshot use the same authenticated,
family-scoped cash-flow endpoint as Budget Overview. They never read planned
totals from BudgetContext, familyStore, a device cache or example data.

The default Budget Overview shows imported cash flow, all imported spending
categories, searchable/paginated source transactions, dated statement balances
and the separate history forecast. Saved income/bill plans have their own tab.
Legacy saved entries have not been deleted or reclassified as genuine spending.
Unverified saved bill plans do not produce default Home assistant figures, and
the forecast's saved-bill comparison requires explicit selection.

## Source Rules

- Only active GBP bank accounts contribute to cash-flow totals.
- Identified transfers remain visible in the source ledger but do not count as
  incoming or spending. Unknown transfers may remain; net flow is not earnings.
- Import date ranges determine whether the selected month's coverage is complete,
  partial or missing. This is not independent proof of monthly bank statements.
- Missing activity and missing coverage show Unavailable rather than zero.
  A covered month with genuinely no activity may show zero.
- Monthly opening/closing reconciliation cannot use a multi-month export's
  boundary balances. Latest statement balances remain separately dated.
- Response validation, request cancellation and family/month scoping prevent
  stale late responses from supplying another month's or household's figures.
- Failed bank or saved-plan requests show errors; neither falls back to saved
  device data or examples. Failure to load saved plans does not block the UI
  from loading its independent bank Overview.
- Overview amounts use two decimal places consistently. Privacy mode hides
  values and charts. Household source records are not modified by browsing.

## Verification

- 1,414 unit tests across 167 suites passed.
- Three controlled Playwright journeys passed: statement review/commit; Home to
  Budget reconciliation with deliberately different plan totals, ledger search
  and pagination, month changes, unavailable states, API failures, reload and
  phone layout; planned income and 24-month forecast scenarios.
- Pure-data and hook tests cover transfer exclusion, empty covered months,
  incomplete responses, family/month races, privacy and no-stale-fallback.
- Browser fixtures do not prove production financial writes. Live release
  rehearsal is read-only and reconciles against the original Virgin CSV.
- No bank records, saved plans, recipients or product selections are deleted or
  changed for this release. No new worktree or duplicate project copy is needed.
