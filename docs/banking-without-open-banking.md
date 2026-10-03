# Household Banking Without An Aggregator

Researched 3 October 2026. Virgin is treated as Virgin Money here, not Virgin Media.

## Recommendation

Use one Family Hub account register and transaction ledger, with two intake paths:

1. Starling: an optional owner-operated local connector, using Starling's direct personal API. Keep a read-only token in the owner's device credential store, never a browser field or the shared app's customer database. Request only account, balance and transaction read scopes. This is for the owner's own account, not an integration that collects other customers' tokens.
2. Virgin Money, Nationwide and Halifax: sign in on their official sites/apps, download a statement or transaction file, then import it into the matching Family Hub account. A local Bank Inbox folder or phone Share workflow can remove repeated file-selection work. Bank login and MFA remain with the bank. These balances are statement snapshots, not live feeds.

The useful automation is after the download: recognise the bank/account, parse rows, preview corrections, deduplicate overlapping exports, reconcile statement balances and merge the ledger. A weekly refresh checklist shows precisely which accounts need an update. Do not make a password-storing bot the default or describe notification-email amounts as authoritative balances.

## Bank Evidence

- Starling supports personal access to one's own account through its Developer Portal, including read scopes. Its FAQ prohibits asking customers for their personal access tokens. The local-owner boundary is therefore essential. [API documentation](https://developer-sandbox.starlingbank.com/docs), [FAQ](https://developer.starlingbank.com/faq).
- Starling also supports CSV statements and custom ranges. [Statements](https://www.starlingbank.com/features/statements/).
- Nationwide supports viewing/downloading account statements in its app and internet bank, with transaction filtering and download-format selection. Exact CSV availability needs a check against the user's account interface. [Nationwide statement help](https://www.nationwide.co.uk/help/online-banking-help/account-balance-statement-online).
- Halifax supports downloading statements. Its current support page also describes the transition to the Lloyds app for existing Halifax accounts; do not hard-code obsolete Halifax-only navigation. CSV export was not confirmed by the official page inspected. [Halifax statement help](https://www.halifax.co.uk/helpcentre/everyday-banking/statements/download-statements.html).
- Virgin Money supports current/savings statement downloads in its mobile app and internet banking. Account/card-specific exports need confirmation in the user's actual interface. [Virgin Money statement help](https://support.virginmoney.com/subtopic/pagecontent/article/KA-01602/).

## Required Dashboard

- Each actual account: institution, nickname, type, masked last four, currency, latest verified balance and as-of date. Credit-card liabilities separate from cash; no mixed-currency totals without an explicit conversion basis.
- Status: live direct feed, imported through a stated date, stale, incomplete or error. Never label a statement snapshot live.
- Consolidated income/spend, bills due, subscriptions and account-to-account transfers. Transfers need matching evidence and confirmation; equal amounts alone are insufficient.
- A reviewed, auditable import with selected rows, exact pence, repeated-file idempotency and duplicate-count warnings. Cancelling a preview must not write any transactions.
- Separate planned bills from actual transactions; reconcile matched planned/actual items before calculating any forecast.
- Raw financial text stays out of AI by default. An optional external-AI route needs a clear opt-in and destination disclosure, not automatic uploading of every statement.

## Current Code Gaps To Repair Before Real Imports

The app already has BudgetAccount, StatementImport and BudgetTransaction storage, CSV/PDF/Excel parsing, cash-flow endpoints and account selection. It is not yet a verified four-bank connection.

- Statement POST currently writes ledger rows when the file is parsed, before the review screen is accepted. Cancel is not a no-write operation.
- The review screen separately creates planned income/expense records, which can duplicate the imported actual activity in forecasts.
- Transfer matching pairs opposite equal amounts within three days without verifying the destination account. Ordinary transactions can be misclassified as transfers.
- Monthly balance reconciliation applies all month transactions to a selected statement instead of the exact statement coverage.
- Financial amounts use floating-point fields; require a pence-safe reconciliation contract before claiming accounting-grade totals.
- PDF AI is selected by default and its categorisation prompt forces uncertain transfers into Investment and uncertain Amazon purchases into Clothing. Both need conservative review, not invented categories.

These are engineering findings from source inspection, not proof that any of the user's bank accounts has been connected. No bank login, token creation, financial upload or transaction was performed in this research.

## Delivery Order

1. Repair preview/commit separation, transfer confirmation and reconciliation; add bank-specific fixtures and isolated persistence tests.
2. Build the account register, freshness/coverage display and unified transaction list around that ledger.
3. Rehearse one actual download/import per bank using the owner's authenticated session, then verify balance/coverage and reimport idempotency.
4. Add the optional Starling local connector and device Share/Bank Inbox convenience. Token creation and new financial-data access require explicit at-action approval; payments are not part of this design.
