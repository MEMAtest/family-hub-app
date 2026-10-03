# School Email and WhatsApp Reminders

The secured `/api/cron/family-communications` job checks the configured family's connected Gmail account twice daily at 07:00 and 19:00 UTC. That is 08:00 and 20:00 in London during British Summer Time, and 07:00 and 19:00 during Greenwich Mean Time. A parent can still use **Sync Gmail** for an immediate check. The job searches the last 90 days for mail from `stewartfleming.bromley.sch.uk`, verifies Google's DMARC result for the sender, and reads matching message bodies and PDF attachments. It processes at most 20 messages per run and persists Gmail's page token so large backfills continue on later runs instead of loading every page into one serverless invocation. Clearly named future school dates are added automatically; untitled items, optional offers, conflicts, ambiguous dates, and items without an unambiguous pupil assignment remain in Calendar's review inbox. Events without a stated time are stored as all-day entries and displayed without an invented start time. Scanned/image-only PDFs are retained for review but are not OCR'd by this background job. Gmail message IDs prevent duplicate imports, and the connected address must match `GOOGLE_GMAIL_ACCOUNT`. The sender-authentication check relies on Gmail's receiving boundary to place its own `mx.google.com` Authentication-Results first and discard forged results for that authserv-id, as required by [RFC 8601](https://www.rfc-editor.org/rfc/rfc8601.html); messages are not auto-imported as trusted if that result is missing or fails DMARC.

The separate secured `/api/cron/whatsapp-reminders` job checks for upcoming reminders hourly; this does not increase Gmail polling. WhatsApp reminders are sent only for events created from authenticated school emails. The app uses a Meta WhatsApp Cloud API template and records provider message IDs. Education events with a confirmed time can be reminded at 7 days, 24 hours, and 1 hour; other school events with a confirmed time at 24 hours and 1 hour. Events whose time was not provided receive date-only reminders at 7 days and 24 hours. The webhook at `/api/webhooks/whatsapp` verifies Meta's request signature and stores delivery statuses; an API acceptance is not treated as delivery. No reminder is sent until the configured recipient explicitly opts in by messaging `START`; `STOP` opts out. If a send's outcome is ambiguous (for example, a network failure after submission), it is held for manual review rather than automatically retried, to avoid duplicate reminders.

## Production Setup

1. In Meta for Developers, create or select a business app, add WhatsApp, register a sender number, and create a system-user token with `whatsapp_business_messaging` permission.
2. Create a Utility template named `familyhub_calendar_reminder` in English (UK), with this body and two body parameters:

   `Family Hub reminder: {{1}} is upcoming {{2}}. Check your family calendar for details.`

   Wait until Meta marks the template approved. The code sends template parameter 1 as the event title (including the family member when assigned) and parameter 2 as the event date and time.
3. Add these values as **Production** environment variables in Vercel. Keep tokens and secrets server-side; never put them in a `NEXT_PUBLIC_` variable or commit them.

   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_RECIPIENT_E164` (recipient number with country code; punctuation is stripped)
   - `WHATSAPP_TEMPLATE_NAME` (`familyhub_calendar_reminder`)
   - `WHATSAPP_TEMPLATE_LANGUAGE` (`en_GB`)
   - `WHATSAPP_APP_SECRET`
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (a new random secret)
   - `WHATSAPP_GRAPH_API_VERSION` (optional; defaults to `v25.0`)

4. In Meta's WhatsApp webhook settings, set the callback URL to `https://family-hub-app.vercel.app/api/webhooks/whatsapp`, use the same verify token, and subscribe the WhatsApp Business Account to the `messages` field. Redeploy after adding or changing Vercel environment variables.
5. From the intended recipient number, send `START` to the registered Family Hub sender. This records opt-in; `STOP` pauses reminders and `START` opts back in. The app will not send any scheduled message until opt-in is confirmed.
6. Run `/api/cron/whatsapp-reminders` through Vercel Cron or call it with `Authorization: Bearer $CRON_SECRET`. Confirm a reminder appears on the opted-in WhatsApp recipient's device and its delivery webhook records `delivered` in the matching reminder notification metadata.

Meta's official Cloud API examples use the registered phone-number ID to send a template message and return a provider message ID; delivery status arrives separately through webhooks. See [Meta's WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api) and [message status documentation](https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object).
