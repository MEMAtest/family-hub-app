# Virgin Money Local Assistant

## Scope

This is a local pilot for Virgin Money current and savings account **issued PDF statements**. It does not provide a live balance or transaction feed, support Virgin credit cards, or remove Virgin's authentication requirements. No Open Banking provider is involved.

The adapter uses Virgin's documented path: More > Secure messages > New statement > Retail Statements. Authenticated production labels still require a real-account calibration. Unknown or ambiguous screens stop retrieval; no payment controls are used.

Source: https://support.virginmoney.com/subtopic/pagecontent/article/KA-01602/

## Start

```sh
npm ci
npx playwright install chromium
npm run bank:virgin
```

Open http://127.0.0.1:3941/ on this Mac. Select **Open Virgin** and complete sign-in yourself in the assistant's Chromium window. The assistant does not fill or inspect security inputs. A signed-in tab in another browser is not reused.

Enable morning/evening checks for 07:00 and 19:00 Europe/London, including DST. The device must be awake and this process running. Missed slots are checked after the service resumes; it does not attempt automated authentication. Enable Mac alerts for a generic attention notification even without a dashboard tab open. OS notification delivery depends on macOS settings and Focus. Browser alerts are separate and require the tab to remain open.

**Start on Mac login** installs a user LaunchAgent for the next Mac login; it does not launch a duplicate server immediately. Keep this checkout, Node and dependencies installed at their current paths. Automatic startup is opt-in. The entry is `~/Library/LaunchAgents/com.familyhub.virgin-assistant.plist`.

Disconnect disables scheduled checks and clears the in-memory browser session. Local PDFs remain available. Restart also loses the bank session and may require authentication again. Schedules are opt-in, not enabled by installing or starting the pilot.

## Data Boundary

- Server binds only to 127.0.0.1, with an exact Host check, same-origin actions, a random HttpOnly session cookie, no CORS, and a restrictive CSP.
- Bank navigation/downloads are restricted to the two documented Virgin hosts. At most 12 statement messages are processed per check.
- PDFs are retained under `~/Library/Application Support/FamilyHubBankAssistant/virgin`, with directory mode 0700 and files 0600. This is private filesystem storage, **not application-level encryption**; use device encryption and a protected Mac account.
- Bank cookies stay in process memory, never in saved state. Credentials, source text and bank screenshots are not logged.
- Raw PDF bytes are SHA-256 deduplicated locally. The displayed date is the last extracted transaction date, not proof that the account is current to today.
- **View PDF** opens the locally retained source behind the assistant's session check, without transmitting it to Family Hub or an AI service.
- Uploading a selected PDF requires a named Family Hub account and explicit local consent. The destination is https://family-hub-app.vercel.app/. External AI is disabled for this handoff.
- The handoff refuses an older Family Hub deployment without the `review-v1` dialog contract. It waits for a usable preview and never presses **Save reviewed transactions**.

## Family Hub Review Contract

Parsing creates a short-lived, HMAC-signed preview scoped to the user, household, account and file. No database writes occur until a JSON commit containing approved rows. Cancellation writes nothing. Production signing requires `BANK_IMPORT_PREVIEW_SECRET` or an existing server-side auth/state secret; no secret values belong in source control.

Accepted rows go only into actual bank transactions, not planned budget entries. Re-uploading a file can add previously excluded rows without duplicating previously accepted rows. Stable per-file occurrence positions retain identical purchases within a statement. The cross-file fingerprint remains a heuristic: overlapping files and edited descriptions require human reconciliation, not a claim of an accounting-grade feed. Transfers are not guessed from equal/opposite amounts.

Balance reconciliation uses the source date interval and integer pence. Partial or edited rows lose their original running-balance evidence. Do not label these imports balanced merely because rows were extracted successfully.

## Verification

```sh
npm test -- --runInBand
npm run test:bank-assistant
TEST_DATABASE_URL=postgresql://playwright:playwright@127.0.0.1:5432/family_hub_test \
  PLAYWRIGHT_PORT=3039 npx playwright test --config playwright.user-journeys.config.ts statement-review.spec.ts budget.spec.ts
npx tsc --noEmit
```

Bank adapter browser tests use synthetic pages and a library-generated PDF. Database tests use an isolated disposable household/account. These prove navigation boundaries, previews, selected commits, replay, partial-file completion and identical rows; they do **not** prove real Virgin account retrieval.

Live acceptance still requires an authorised bank sign-in, one real statement retrieval, review against the PDF, deliberate destination selection, and confirmation of imported rows in the household. Never substitute fixture success for that evidence. No payments, cloud uploads, live statement imports, or persistent bank access are performed as part of automated tests.
