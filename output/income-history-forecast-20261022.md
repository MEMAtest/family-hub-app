# Income Planning and History Forecast

## Behaviour

- Budget now has a Plan income action and a 3/6/12-month forecast based on up to
  24 earlier complete calendar months of imported transactions, not planned bills.
- Historical incoming money and saved income plans are separate selectable bases.
  The latter replaces incoming estimates rather than being added to them.
- Spending estimates use the latest six observed months' median, blended equally
  with the same calendar month's median only when two earlier examples exist.
  The displayed variation range uses historical 10th/90th percentile deviations;
  it is not a calibrated confidence interval or a bank-balance prediction.
- Current/incomplete imported date ranges are excluded. Missing months are null,
  not zero. At least six covered months including the latest three are required.
  Coverage is inferred from import date ranges, not independently verified monthly
  statements. Only active imported GBP accounts are included and named.
- Identified transfers are excluded. Unidentified transfers, refunds and one-offs
  can remain in incoming money; it is not presented as verified salary.
- Rolling errors use only observations before the held-out month. Planned bills
  are displayed separately, never silently added to historical spending.
- Weekly/monthly/yearly and one-off income saves validate dates and amounts.
  Month-end paydays clamp to the month's last day, and recurrence end dates are
  respected. Failed server saves retain the form rather than pretending a local
  fallback is a saved household plan.
- Advanced Reports uses the same history-backed forecast component. No external
  AI service receives financial data for this forecast.

## Verification

- 1,401 unit tests / 164 suites passed; production build, lint and typecheck passed.
- Two controlled browser journeys passed: statement preview/commit separation,
  then plan save/failure/retry/reload, scenario replacement, horizon selection,
  four rendered chart curves and desktop/390px phone layout.
- The browser fixture persists across reload within the test; this does not prove
  production income writes. No synthetic income/payment was added to the live
  household. Production checks are read-only unless separately recorded.
- Representative synthetic renders: output/playwright/income-forecast-desktop.png
  and output/playwright/income-forecast-phone.png (not real household amounts).
- Initial fixture failure came from an omitted cash-flow response. Subsequent
  visual checking found blank animated chart capture and sidebar occlusion after
  the income form; deterministic curves, wrapped actions and a body portal fixed
  these, with explicit browser assertions added.

## Storage

- Reused the canonical checkout; no new worktrees or duplicate project copies.
- Temporary dependency/build budget: about 3 GiB. Original bank exports, Keychain
  entries and the standalone daily-download runtime are not cleanup targets.
- Release and final cleanup details are recorded after alias verification.
