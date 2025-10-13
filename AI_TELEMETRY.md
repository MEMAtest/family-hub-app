AI Telemetry Pipeline Guide
===========================

Overview
--------
The AI telemetry system records high-level metadata about Anthropic (and future) AI interactions so the team can monitor reliability, performance, and usage trends without exposing prompt content.

What is captured
----------------
Each event contains:
- `feature`: Originating feature label (first line of the system prompt).
- `tokensRequested` / `tokensGenerated`: Token budgets and actual usage (if supplied by the API).
- `durationMs`: Time from request to response.
- `success`: Boolean outcome (failures log the error message).
- `errorMessage`: Truncated (180 chars) error string on failure.
- `timestamp`: ISO8601 timestamp generated at the call site.

Configuration
-------------
Telemetry is disabled by default. Enable it per environment via env vars:

Server-side (Next API routes, AI service):
- `AI_TELEMETRY_ENABLED=true`
- `AI_TELEMETRY_ENDPOINT=<absolute URL>` *(optional; defaults to `${NEXT_PUBLIC_APP_URL}/api/telemetry/ai`)*
- `AI_TELEMETRY_SECRET=<shared token>` *(optional but recommended; validates requests)*
- `AI_TELEMETRY_WEBHOOK_URL=<https intake endpoint>` *(optional; forwards envelopes to your monitoring stack)*
- `AI_TELEMETRY_WEBHOOK_SECRET=<token>` *(optional; sent as `Authorization: Bearer <token>` when forwarding)*

Client-side (future UI emitters):
- `NEXT_PUBLIC_AI_TELEMETRY_ENABLED=true`
- `NEXT_PUBLIC_AI_TELEMETRY_ENDPOINT=/api/telemetry/ai` *(optional; defaults to this value)*

How it works
------------
1. `logAIUsage` batches events in `src/utils/aiTelemetry.ts`.  
2. When enabled, batches flush (size ≥10 or 2.5s) via `fetch` to the configured endpoint.  
3. `/api/telemetry/ai` validates the secret (if provided), sanitises the payload, and logs a structured record:
   ```
   [AI_TELEMETRY] {
     source: 'server' | 'client',
     receivedAt: '2025-10-12T12:30:00.000Z',
     count: 3,
     events: [...]
   }
   ```
4. Ops tooling can ingest these server logs (Datadog/Splunk/etc.) to trigger alerts or dashboards.

Routing telemetry to your monitoring stack
------------------------------------------
1. Ensure the deployment environment sets the server env vars listed above.  
2. Update your logging/observability pipeline to capture `[AI_TELEMETRY]` log lines (JSON format).  
3. Optionally, extend `src/app/api/telemetry/ai/route.ts` to forward events to a webhook or vendor SDK (Datadog, Sentry, Honeycomb).  
4. Configure alerts on:
   - Success rate dips (e.g., >5% failures in 10 minutes).
   - Latency spikes (duration > desired thresholds).
   - Token usage anomalies (e.g., >X tokens/minute).

Alert & dashboard examples
--------------------------
### Datadog log monitors
- **Error spike:**  
  ```
  service:family-hub status:error @log.logger:"AI_TELEMETRY" @json.success:false
  ```
  Trigger if `count >= 5` with `aggregation: count` over `last 5m`.

- **Latency p95:**  
  ```
  service:family-hub @log.logger:"AI_TELEMETRY" @json.events.durationMs
  ```
  Visualise p95 on a timeseries dashboard; alert if `p95 > 4000` for `last 10m`.

### Splunk search
```
index=family_hub source="AI_TELEMETRY"
| stats count(eval(events{}.success="false")) AS failures count AS total by span=5m
| eval failure_rate = failures / total
| where failure_rate > 0.05
```

### Grafana Loki
- Use labels: `{logger="AI_TELEMETRY"}`
- Panel expression (failure rate):
  ```
  sum(rate({logger="AI_TELEMETRY"} | json | success="false" [5m])) 
  / sum(rate({logger="AI_TELEMETRY"} | json [5m]))
  ```
  Alert when the value exceeds `0.05`.

Local testing
-------------
1. Add to `.env.local`:
   ```
   AI_TELEMETRY_ENABLED=true
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   AI_TELEMETRY_SECRET=dev-secret
   ```
2. Start the dev server and trigger AI actions (e.g., budget insights).  
3. Inspect the server console for `[AI_TELEMETRY]` log output.

Next steps
----------
- Integrate the telemetry endpoint with your production logging provider.  
- Add Grafana/Splunk dashboards for AI success rate, latency, and token consumption.  
- Expand telemetry coverage as new AI features roll out (Meals, Shopping, Goals, Calendar).  
- Consider adding per-family or per-feature identifiers (non-PII) if deeper analytics are required.
