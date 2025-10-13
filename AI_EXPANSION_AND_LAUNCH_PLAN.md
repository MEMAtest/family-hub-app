Family Hub AI Expansion & Launch Readiness Plan
==============================================

Purpose
-------
- Deliver production-ready AI capabilities across Budget, Meals, Shopping, Goals, and Calendar without mock data.
- Identify the engineering, UX, and QA work required before launch.
- Ensure the web experience is installable and fully usable on Android/iOS as a saved web app.

Current AI Footprint (as of this audit)
--------------------------------------
- Budget (`src/components/budget`):
  - Smart Spending Insights card calling `/api/ai/budget/insights`.
  - Receipt scanner (`ReceiptScanner.tsx`) calling `/api/ai/receipt/scan`.
- Calendar (`src/services/aiService.ts`):
  - Helper methods exist (`detectEventConflicts`, `suggestEvents`, `analyzeCalendarBalance`) but are not wired into UI or APIs.
- Meals, Shopping, Goals:
  - No active AI integrations; only static or manual workflows.
- Infrastructure:
  - Anthropic Claude client configured in `src/services/aiService.ts`.
  - Prisma/Next API routes provide real data for families, meals, shopping, goals, budgets.

Cross-Cutting Foundations (Do First)
------------------------------------
1. **AI Infrastructure Hardening**
   - Verify `ANTHROPIC_API_KEY` provisioning for all deployment environments.
   - Add rate limiting and retry logic to `aiService.chat` (exponential backoff, request timeouts).
   - Centralise prompt templates and versioning; log prompt/response metadata (strip PII).
   - Implement privacy guardrails (truncate long texts, redact sensitive info).
2. **Data Integrity**
   - Remove seeded fallback data in `useFamilyStore` budget slice once DB connectivity confirmed.
   - Validate Prisma schemas to ensure all AI consumers have required fields (e.g., meal nutrition, shopping price history) before calling models.
   - Add background sync jobs to keep local caches (`localStorage`) aligned with API responses.
3. **Observability & Feedback**
   - Capture AI events (request/response timings, errors) in analytics/logs (e.g., via a new `/api/ai/log` endpoint).
   - In UI, surface error states with retry guidance and discreet “Was this helpful?” feedback hooks.
4. **Mobile/PWA Baseline**
   - Audit all dashboards for responsive breakpoints; convert manual `window.innerWidth` checks to CSS-first solutions.
   - Configure PWA manifest/service worker (check `public/manifest.json` presence; add Icons, offline caching for shell).
   - Test “Add to Home Screen” flows on Android Chrome and iOS Safari; document required meta tags.

Module Roadmaps
---------------

Budget
------
Goals: deepen insights, provide forecasting, and automate recurring expense reviews.

1. **AI Spend Forecasting**
   - Backend: new API `POST /api/ai/budget/forecast` using `aiService.predictSpendingTrend`.
   - Data: aggregate last 3–6 months expenses in Prisma query; include upcoming events from calendar (requires join with `CalendarEvent` costs).
   - UI: extend `SimpleBudgetDashboard` with “Forecast” card (collapsible) and scenario toggles.
   - QA: regression tests for budget totals (`tests/test-budget-indicators.ts`) validating forecasts do not mutate data.

2. **Category Benchmarking**
   - Extend `aiService.compareToAverages`; introduce `/api/ai/budget/benchmark`.
   - Fetch UK average dataset (static JSON in repo or external service—confirm licensing).
   - UI: integrate into `AIInsightsCard` as optional tab showing “How you compare”.

3. **Alerting & Automation**
   - Add AI-driven alerts when expenses spike >X% MoM (scheduled cron job or on-demand check).
   - Hook into Notifications system (if not present, create `Alerts` store slice).

4. **Launch Checklist**
   - Confirm insights use real Prisma data only (no static fallbacks).
   - Load-test AI endpoints with realistic payloads.

Meals
-----
Goals: AI-assisted meal planning, nutrition balance, and grocery linkage.

1. **Meal Plan Generator**
   - API: `/api/families/:id/meals/ai-plan` consuming pantry items, dietary preferences, schedule constraints.
   - Data requirements: extend `Meals` schema with dietary tags, prep time, cost estimates.
   - UI: in `MealPlanner`, add “Generate Week Plan” button and editable result list.

2. **Nutrition Insights**
   - Capture macro data per meal (update Prisma `Meal` model).
   - AI call summarises nutrient coverage/gaps, suggests adjustments.
   - UX: integrate into `NutritionTracker` panel with traffic-light indicators.

3. **Calendar Sync**
   - Optional: push planned meals into calendar with prep reminders using AI to suggest optimal prep times.

4. **Testing & Mobile**
   - Ensure meal cards are responsive (stacked layout on <375px width).
   - Add tests covering AI plan endpoint with fixture meals (`tests/meals`).

Shopping
--------
Goals: optimise lists, recommend savings, connect with receipts.

1. **AI Shopping List Optimiser**
   - API: `/api/families/:id/shopping/ai-optimize` using pantry, price history, loyalty info.
   - Data: ensure `ShoppingList` entries capture unit price, store, preferred brands.
   - UI: integrate into `ShoppingDashboard` quick actions with diff view (before vs after).

2. **Price Trend Insights**
   - Leverage receipt scans and historical prices to generate “buy now / wait” advice.
   - Add chart module in `reports/` to visualise AI commentary.

3. **Cross-Feature Integration**
   - When meals generate plans, auto-propose shopping list additions via AI summariser.

4. **QA**
   - Tests ensuring AI suggestions respect stock levels and do not duplicate items.

Goals & Rewards
---------------
Goals: personalised coaching, milestone generation, and accountability.

1. **Progress Summaries**
   - API: `/api/families/:id/goals/ai-summary` analysing goal history, upcoming milestones.
   - UI: embed AI write-up in `GoalsDashboard` “Insights” tab; allow user feedback.

2. **Motivational Nudges**
   - Weekly AI-generated encouragement or suggestions, delivered via notifications/email.
   - Respect quiet hours; require user opt-in.

3. **Risk Alerts**
   - Detect stagnating goals (no progress in N days) and propose actionable steps.

Calendar
--------
Goals: leverage existing AI helpers for conflict detection and proactive planning.

1. **Conflict Detection Flow**
   - API: `/api/families/:id/calendar/ai-conflicts` wrapping `aiService.detectEventConflicts`.
   - UI: call in `CalendarMain` when adding/editing events; show inline suggestions.
   - Include travel time metrics (need location + commute assumptions).

2. **Smart Scheduling**
   - Feature: “Suggest ideal time” for new events; gather availability from existing events + user constraints.
   - Extend store to track preferences (working hours, bedtime, etc.).

3. **Activity Recommendations**
   - Surface `aiService.suggestEvents` in dashboard “Ideas” card, linked to Goals/Meals context.

4. **Launch QA**
   - Regression test event CRUD and ensure AI errors degrade gracefully.
   - Manual validation on mobile calendar view (touch interactions, overflow menus).

Mobile & PWA Enhancements
-------------------------
1. **Responsive Sweep**
   - Budget, Meals, Shopping, Goals, Calendar: verify breakpoints at 320px, 375px, 414px, 768px.
   - Replace hard-coded pixel widths with Tailwind responsive classes.
   - Ensure modals (e.g., `AddExpenseModal`, `ReceiptScanner`) are full-height sheets on mobile.
2. **PWA Essentials**
   - Create/update `public/manifest.json` with icons, `display: standalone`, `scope`, `start_url`.
   - Add service worker (Next.js `app` router custom worker) caching shell assets, handling offline fallback.
   - Test saved-web-app behaviour: splash screen, status bar, orientation lock.
3. **Performance**
   - Measure Lighthouse mobile performance; target LCP <2.5s, CLS <0.1.
   - Lazy-load heavy charts/components (code-splitting).

Quality, Testing, and Launch Gates
----------------------------------
- Unit tests: cover new API routes, AI prompt builders, receipt flow, budget filters.
- Integration/E2E: expand `tests/` suite to exercise AI features with mock Anthropic responses (use dependency injection to avoid live calls).
- Security: review API routes for auth/authorization (ensure family scoping, no open endpoints).
- Accessibility: run automated checks (axe) and manual screen reader passes for new AI UI.
- Documentation: update README, in-app help, and create quick-start guides for AI features.
- Staging dress rehearsal: populate staging DB with anonymised real data; run exploratory testing on desktop + mobile saved app.

Implementation Phasing (Suggested)
----------------------------------
1. **Phase 0 (Infrastructure)**: AI service hardening, data cleanup, PWA baseline.
2. **Phase 1 (Budget & Calendar)**: deepen existing AI features, launch conflict detection.
3. **Phase 2 (Meals & Shopping)**: introduce AI planning/optimisation with tight Meal ↔ Shopping linkage.
4. **Phase 3 (Goals & Cross-cutting)**: coaching insights, motivational nudges, analytics.
5. **Phase 4 (Polish & Launch)**: mobile refinements, QA sign-off, documentation.

Dependencies & Risks
--------------------
- Accurate cost/nutrition data: ensure consistent units before leveraging AI.
- API rate limits & cost: monitor usage; consider caching or summarising data before AI calls.
- Regulatory considerations: document AI usage, provide opt-out, comply with UK privacy laws.
- Change management: train end users; include in onboarding.

Next Steps
----------
- Review and prioritise items with product stakeholders.
- Create Jira/Linear tickets aligned to roadmap phases.
- Begin Phase 0 tasks (infrastructure & mobile readiness) immediately to unblock feature work.
