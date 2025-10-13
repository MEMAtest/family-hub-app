# Family Hub – Release QA Smoke Checklist

Use this quick sweep before cutting a build to confirm the new PWA and responsive UX changes behave on target devices.

## Progressive Web App

- [ ] **Install banner (Chrome/Android or desktop Chromium):** open the app, dismiss and re-open to verify the bottom install prompt appears only until accepted/dismissed; tapping *Install app* completes without errors.
- [ ] **iOS home screen flow:** in Safari, tap share → *Add to Home Screen*; confirm the generated icon and the matching splash artwork on first launch.
- [ ] **Offline shell:** while installed, switch the device/browser to offline mode and refresh; the offline status page renders and previously visited content remains accessible.
- [ ] **Service worker update:** trigger a new build (or bump `CACHE_NAME`) and reload. The worker upgrades in-place (no hard refresh), and navigation keeps working during activation.
- [ ] **Share target deep link:** from another app/browser tab share a URL to Family Hub; the installed app opens with the shared data passed via query parameters.

## Responsive UX

- [ ] **Bottom navigation:** on phones (<1024px), the fixed bottom nav renders, highlights the active module, and the content above has enough bottom padding.
- [ ] **Mobile quick actions:** the Budget/Shopping/Calendar views expose their key actions via mobile headers or sheets without horizontal scroll.
- [ ] **Dashboard snapshot carousel:** swipe the top stat cards on mobile and ensure each navigates to the targeted view.
- [ ] **Calendar headers:** on phones the Templates and Conflict buttons stack neatly and remain tappable.
- [ ] **General layout:** rotate between portrait/landscape to confirm headers, breadcrumbs and modals respect safe-area insets and avoid the system navigation bars.

## Regression spot-checks

- [ ] Run `npm run test:smoke` (AI budget smoke suite) – expect a clean pass.
- [ ] Run `npm run test` locally (unit tests) – ensure they pass before tagging.
- [ ] Visit Budget → toggle between months and load Advanced Reports; API calls resolve and charts resize on mobile.
- [ ] Visit Shopping → create a new list item and verify the bottom nav does not obstruct the "Add" controls.
- [ ] Confirm push notifications (using the debug tools or notification centre) still appear with the updated service worker.

Document the run in `RELEASE_NOTES.md` with tester initials/date when completed.
