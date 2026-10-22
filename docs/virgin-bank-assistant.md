# Virgin Money Local Browser Connector

## Live Follow-Up: 22 October 2026

- Later successful phone approval completed sign-in inside the dedicated worker.
  The worker retrieved a real five-row incremental export, reached `ready` and
  saved an encrypted browser session (0600). These rows overlap the initial
  history; no transactions were committed to a cloud ledger. Session restoration
  after restart is still unverified, and daily/startup remain disabled.

- Dedicated worker sign-in reached Virgin's mobile approval screen after adding
  the observed official `verification.ib.apps.virginmoney.com` authentication
  origin to the exact HTTPS allowlist. Lookalike domains, non-HTTPS, alternate
  ports and URL credentials remain rejected. Thirteen controlled tests passed.
  Reaching approval is not proof of a completed login or restored session.

- Read-only rehearsal downloaded M Plus Current Basic CSV: 1,764 rows dated
  21 April 2023 through 20 October 2026. Requested dates were 1 January 2000
  through 22 October 2026. This is the returned range, not independent proof
  that every historical statement is available.
- Original stored once by SHA-256 in the private assistant directory. Local
  parsing and byte-identical download verified. No financial rows, account
  identifiers or authentication tokens belong in repository evidence.
- Basic CSV is headerless: date, signed amount, balance, GBP, description.
  Parser preserves the first row, quoted commas and UTC calendar dates. Headed
  CSV imports remain supported. Invalid rows fail closed.
- Worker now tries the current-account export before the old PDF route. First
  export requests available history; subsequent exports use a seven-day overlap.
  Files are hash-deduplicated, not silently committed to Family Hub. Overlapping
  rows still need account-specific import reconciliation.
- Successful live login was in existing Chrome, not the separate Chromium
  worker. No Chrome cookies were copied. Live worker session restoration,
  Android relay and MCP registration remain unproved or unimplemented.
  Daily checks and startup remain disabled.
- PDF frames failed to render reliably; no PDF was saved. Do not navigate to
  standalone iframe URLs: doing so lost parent context and required sign-in.
- Local CSV receipt endpoint is cookie- and same-origin protected. Registering
  a downloaded original does not mark the bank connected or enable scheduling.
- Twelve controlled tests passed: parsing, date selection, no payment actions,
  concurrent receipt deduplication, restart, request guards, byte equality and
  responsive UI. These are not unattended live-authentication proof.

## What Exists

Local Chromium worker for Virgin Money UK M Plus Current transaction exports
and a legacy statement-PDF retrieval path. No Open Banking provider or bank API
is used. This is not a live transaction feed.
The October 3 local pilot was recovered from commit 4665cf9 and upgraded here;
unrelated unfinished work in that other checkout has not been changed.

For the small standalone runtime, use `npm ci` inside
`scripts/bank-assistant/runtime`, then run `node scripts/bank-assistant/build.mjs`
and `node scripts/bank-assistant/runtime/server.cjs` from the checkout root. Visit
http://127.0.0.1:3941/ on this Mac. Existing compatible Chromium is reused;
install a Playwright browser only if the local runtime reports it missing.

For the small installed runtime, run `npm run bank:virgin:build` once, then
`npm ci --prefix scripts/bank-assistant/runtime --ignore-scripts`. Start with
`node scripts/bank-assistant/runtime/server.cjs`. The generated bundle and its
private dependencies are reproducible; no full Next.js installation is required
to keep the worker running. Rebuild after changing source. The source checkout
still supplies the static dashboard assets and must remain in place.

1. Open Virgin in the dedicated browser and complete the bank's normal login.
2. Check now starts statement collection. Saved files survive a restart.
3. Large collections run in batches of at most 20 new statement messages and
   90 seconds each. Successful files are checkpointed before continuing.
4. Daily checks run after 07:00 Europe/London, including DST; waking later
   catches up once that day. Enable the checkbox to start scheduling.
5. If Virgin asks for credentials or phone approval, collection pauses. It
   resumes when the verified bank page becomes available. The connector never
   fills passwords, PINs, OTPs or submits authentication forms.

The Mac must be awake, online and the worker running. Start on Mac login installs
the existing user LaunchAgent only when selected; no launch agent is installed
just by opening the dashboard. Retain this checkout and its dependencies while
using that startup entry. No keep-alive requests defeat bank session expiry.

## Data And Security

- Loopback-only server, strict Host and Origin checks, HttpOnly SameSite session,
  restrictive CSP, no CORS and no externally reachable browser/debugging port.
- Bank navigation is restricted to the two reviewed Virgin banking hosts. Only
  known statement, attachment, back and pagination labels are clicked. Unknown,
  duplicate or ambiguous controls stop the scan. Actual account-specific labels
  still need calibration after the first real sign-in.
- Cookies, local storage, IndexedDB and the bank page's session storage are
  saved as authenticated AES-256-GCM ciphertext. The random key is in macOS
  Keychain. Keychain denial or corrupted ciphertext fails closed. No passwords,
  bank screenshots, message bodies or authentication tokens are logged.
- The Family Hub browser uses a separate context and is not included in the
  saved bank session. Neither the phone number nor fingerprint is stored.
- Files live once under
  `~/Library/Application Support/FamilyHubBankAssistant/virgin`, directory 0700,
  files 0600. PDFs themselves are private filesystem files, not application-
  encrypted; device encryption and a protected Mac login remain important.
- SHA-256 file identities and hashed bank-message receipts prevent repeat
  downloads. Parsing failure retains the original PDF and flags review.
- Bounds: 20 MiB per PDF, 2 GiB total local PDF storage, 50 list pages per pass.
  Reaching an unfamiliar page or page limit is not a claim that history is
  complete. The scan only covers statement messages exposed by known navigation,
  not unseen year/account selectors. No deletion makes space automatically.
- Disconnect stops scheduling and removes the encrypted session, retaining PDFs.
  Stopping the process normally preserves the encrypted session for the next run.

## Family Hub And Phone Boundaries

View PDF is local only. Sending a selected PDF to Family Hub requires an explicit
destination account and consent. The older pilot handoff refuses any deployment
without the `review-v1` preview-before-save contract and never presses Save.
The current production deployment has not been verified against that handoff;
do not present downloaded files as imported transactions.

Mac alerts are optional. Android reconnect push, remote phone-to-Mac handoff and
the chat MCP registration are not connected in this build. Virgin itself controls
whether authentication can be approved in its Android app; a phone number cannot
create that bank challenge. Do not describe these missing pieces as working.

## Evidence And Remaining Acceptance

`npm run test:bank-assistant` runs isolated browser journeys: a 31-file history,
batch recovery, repeat deduplication, encrypted restart/tamper checks, London/DST
scheduling, unknown-screen and payment avoidance, storage failure and responsive
loopback UI. These use synthetic pages and PDFs, not the household's bank account.

The live local dashboard and dedicated Virgin sign-in window were opened on
22 October. The Mac was locked and bank authentication has not been completed.
Zero real statements have been retrieved or sent to Family Hub in this pass.
Do not enable unattended use as production-accepted until actual statement
retrieval, session restore, reauthentication and the full account/year range have
been rehearsed against the account holder's authorised session.

Official sources checked by the independent Luna research:
- https://uk.virginmoney.com/current-accounts/questions-and-answers/app-and-internet-banking/
- https://uk.virginmoney.com/service/sca/
- https://uk.virginmoney.com/service/technical-help/
- https://developer.virginmoney.com/merged/

These establish customer statement access and restricted bank APIs, not a
guaranteed fingerprint-only login or a permanent bank session.
