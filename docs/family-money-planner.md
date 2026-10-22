# Family Money Planner

The Money screen opens on recorded spending in the last 30 calendar days,
including today in Europe/London. The period selector supports 7, 14, 30 and 90
days, or a custom integer from 1 to 365. Exact dates and imported coverage stay
visible. The selection is retained in the moneyDays URL parameter.

Monthly review is collapsed below the recent view and defaults to the last
finished calendar month. Its selected month and tab are retained in moneyMonth
and moneyView URL parameters. Existing budget URLs remain compatible. Saved
income/bill plans, optional savings scenarios and the raw bank source stay
separate from recorded spending. Savings tools are collapsed by default.

## Recent Spending

The read-only recent-spending endpoint loads only the requested window and its
immediately preceding equal-length comparison window, scoped to the current
household's active GBP accounts. It returns current-window payment rows only.
It shares category classification and household corrections with monthly review.

Recorded money out is the headline, with identified spending, payments whose
purpose needs checking and transfers shown separately. Integer-pence totals
avoid rounding drift. Calendar-day arithmetic is independent of daylight saving.
Coverage must include every active account for every requested day. Partial
totals remain visible with warnings, unavailable totals are null, and a covered
day without activity is zero. Prior-period comparisons are suppressed unless
both complete windows are covered. Monthly corrections refresh both views.

## What Is Calculated

- Three chronological months of category spending, including absolute and
  percentage changes only where both comparison months are fully covered.
- Gross outgoing money, suggested/confirmed consumption, unresolved outgoing
  payments, and identified transfers are separate quantities.
- Cumulative recorded outflow and the busiest fully covered seven-day window.
  Unknown days are not zero and break the chart. Timing is not avoidable waste.
- Grocery patterns count payments and distinct dates in a complete week, not
  inferred store visits. Multiple retailers do not prove overspending.
- Possible recurring payments require similar amounts/days in three earlier
  complete months. They are estimates, not confirmed future bills.
- A household's saved category target gives a potential monthly reduction.
  Lower spending in a later complete month is an observed difference, not
  verified or causal savings. Changing baseline classifications suppresses that
  comparison until the baseline is reset. No verified savings are invented.

## Evidence and Persistence

The authenticated API reads only active GBP accounts in the current household.
Six months are loaded for recurrence; only selected-month transactions are sent
as the interactive ledger. Raw imported amounts/directions are never rewritten.
Legacy category strings are not accepted as proof of household purpose.

Recorded transfers are authoritative. Narrow merchant suggestions are labelled
as suggestions. A transaction-specific household correction wins over a saved
account-scoped rule, which wins over a suggestion. Generic bank payments and
personal incoming credits are not guessed to be housing or salary.

Category overrides/rules, targets and dismissed insights are stored in the
familyDocument record money.planner.preferences, with optimistic version checks.
The API scopes transaction lookup to the authenticated household and validates
category, direction, target month and server-derived baseline. Malformed stored
preferences fail closed instead of being silently overwritten. No schema
migration or bank credential change is required.

The interface supports source-ledger search, category filtering, payment review,
exact-narrative rules, target creation/removal, insight dismissal/restoration,
and a link to the existing shopping list. It does not cancel subscriptions,
move money, invent grocery prices, or automatically buy anything.

## Verification

Focused engine, persistence-loader and API tests cover integer-pence totals,
coverage/partial months, transfer/refund handling, manual precedence, two-account
daily totals, source isolation, version conflicts, failed saves and unchanged
bank rows. Browser journeys cover desktop/phone, target and category save/reload,
hidden insights, missing months, failed requests, navigation and ledger review.
Fixture journeys are not authenticated production write or cross-device proof.
The local acceptance note records original CSV reconciliation separately.
