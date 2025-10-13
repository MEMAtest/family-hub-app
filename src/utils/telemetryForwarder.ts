type Envelope = {
  source: 'client' | 'server';
  receivedAt: string;
  count: number;
  events: Array<{
    feature: string;
    tokensRequested: number;
    tokensGenerated?: number;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
    timestamp: string;
  }>;
};

const FORWARD_URL = process.env.AI_TELEMETRY_WEBHOOK_URL?.trim();
const FORWARD_SECRET = process.env.AI_TELEMETRY_WEBHOOK_SECRET?.trim();
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 500;

const shouldForward = () => Boolean(FORWARD_URL);

export const forwardTelemetryEnvelope = async (envelope: Envelope) => {
  if (!shouldForward()) {
    return;
  }

  let attempt = 0;
  let delay = INITIAL_DELAY_MS;

  while (attempt < MAX_RETRIES) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), 5000) : null;

      try {
        const response = await fetch(FORWARD_URL as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(FORWARD_SECRET ? { Authorization: `Bearer ${FORWARD_SECRET}` } : {}),
          },
          body: JSON.stringify(envelope),
          signal: controller?.signal,
        });

        if (!response.ok) {
          throw new Error(`Webhook responded with status ${response.status}`);
        }

        return;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    } catch (error) {
      attempt += 1;
      if (attempt >= MAX_RETRIES) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[AI_TELEMETRY] Failed to forward envelope', error);
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};
