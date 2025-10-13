import { NextRequest, NextResponse } from 'next/server';
import { forwardTelemetryEnvelope } from '@/utils/telemetryForwarder';

const MAX_EVENTS_PER_REQUEST = 25;

const isTelemetryEnabled = () => (process.env.AI_TELEMETRY_ENABLED || '').toLowerCase() === 'true';

const validateSecret = (request: NextRequest) => {
  const secret = process.env.AI_TELEMETRY_SECRET;
  if (!secret) return true;

  const headerSecret = request.headers.get('x-telemetry-secret');
  return headerSecret === secret;
};

export async function POST(request: NextRequest) {
  if (!isTelemetryEnabled()) {
    return NextResponse.json({ success: false, disabled: true }, { status: 204 });
  }

  if (!validateSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload || !Array.isArray(payload.events) || payload.events.length === 0) {
    return NextResponse.json({ success: false, error: 'No events provided' }, { status: 400 });
  }

  if (payload.events.length > MAX_EVENTS_PER_REQUEST) {
    payload.events = payload.events.slice(0, MAX_EVENTS_PER_REQUEST);
  }

  const normalizedEvents = payload.events.map((event: any) => ({
    feature: typeof event.feature === 'string' ? event.feature : 'unknown',
    tokensRequested: Number.isFinite(Number(event.tokensRequested)) ? Number(event.tokensRequested) : 0,
    tokensGenerated: Number.isFinite(Number(event.tokensGenerated)) ? Number(event.tokensGenerated) : undefined,
    durationMs: Number.isFinite(Number(event.durationMs)) ? Number(event.durationMs) : 0,
    success: Boolean(event.success),
    errorMessage: typeof event.errorMessage === 'string' ? event.errorMessage.slice(0, 180) : undefined,
    timestamp: typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString(),
  }));

  const envelope = {
    source: (payload.source === 'client' ? 'client' : 'server') as 'client' | 'server',
    receivedAt: new Date().toISOString(),
    count: normalizedEvents.length,
    events: normalizedEvents,
  };

  // For now, pipe to server logs. Ops can route these into their logging stack.
  // eslint-disable-next-line no-console
  console.info('[AI_TELEMETRY]', envelope);

  // Forward to external webhook, if configured
  await forwardTelemetryEnvelope(envelope);

  return NextResponse.json({ success: true });
}
