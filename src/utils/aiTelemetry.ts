import { redactSensitiveData } from '@/utils/privacy';

type Nullable<T> = T | null | undefined;

export interface AIUsagePayload {
  feature: string;
  tokensRequested: number;
  tokensGenerated?: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

interface TelemetryEnvelope {
  events: AIUsagePayload[];
  source: 'client' | 'server';
}

const MAX_ERROR_LENGTH = 180;
const FLUSH_INTERVAL_MS = 2500;
const MAX_BATCH_SIZE = 10;
const MAX_QUEUE_LENGTH = 100;

let queue: AIUsagePayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

const isServer = typeof window === 'undefined';

const env = {
  client: {
    enabled: (() => {
      if (!isServer) {
        return (process.env.NEXT_PUBLIC_AI_TELEMETRY_ENABLED || '').toLowerCase() === 'true';
      }
      return false;
    })(),
    endpoint: () => process.env.NEXT_PUBLIC_AI_TELEMETRY_ENDPOINT || '/api/telemetry/ai',
  },
  server: {
    enabled: (() => (process.env.AI_TELEMETRY_ENABLED || '').toLowerCase() === 'true')(),
    endpoint: () => {
      const explicit = process.env.AI_TELEMETRY_ENDPOINT;
      if (explicit) return explicit;

      const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
      return `${base.replace(/\/$/, '')}/api/telemetry/ai`;
    },
    secret: process.env.AI_TELEMETRY_SECRET,
  },
};

export const logAIUsage = (payload: AIUsagePayload) => {
  const safePayload: AIUsagePayload = {
    ...payload,
    errorMessage: payload.errorMessage
      ? redactSensitiveData(payload.errorMessage).slice(0, MAX_ERROR_LENGTH)
      : undefined,
  };

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[AI]', safePayload);
  }

  if (!isTelemetryEnabled()) {
    return;
  }

  queue.push(safePayload);

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushQueue();
    return;
  }

  scheduleFlush();
};

const isTelemetryEnabled = () => (isServer ? env.server.enabled : env.client.enabled);

const getEndpoint = () => (isServer ? env.server.endpoint() : env.client.endpoint());

const scheduleFlush = () => {
  if (flushTimer || isFlushing) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_INTERVAL_MS);
};

const flushQueue = async () => {
  if (isFlushing || queue.length === 0) {
    return;
  }

  if (!isTelemetryEnabled()) {
    queue = [];
    return;
  }

  isFlushing = true;
  const batch = queue.splice(0, MAX_BATCH_SIZE);

  try {
    const envelope: TelemetryEnvelope = {
      events: batch,
      source: isServer ? 'server' : 'client',
    };

    const response = await safeFetch(getEndpoint(), envelope);

    if (!response?.ok) {
      throw new Error(`Telemetry endpoint responded with ${response?.status}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[AI] Failed to flush telemetry', error);
    }

    queue = [...batch, ...queue].slice(0, MAX_QUEUE_LENGTH);
  } finally {
    isFlushing = false;

    if (queue.length > 0) {
      scheduleFlush();
    }
  }
};

const safeFetch = async (endpoint: string, data: TelemetryEnvelope): Promise<Response | null> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isServer && env.server.secret) {
      headers['x-telemetry-secret'] = env.server.secret;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 4000) : null;

    try {
      return await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller?.signal as Nullable<AbortSignal>,
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[AI] Telemetry fetch error', error);
    }
    return null;
  }
};
