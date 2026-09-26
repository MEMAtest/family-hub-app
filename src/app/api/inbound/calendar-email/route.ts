import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ingestCalendarEmailPayload } from '@/lib/calendarEmailIngestion';

export const runtime = 'nodejs';

const webhookSecret = () =>
  process.env.CALENDAR_INBOUND_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET || '';

const compare = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

const verifySimpleSignature = (rawBody: string, signature: string, secret: string) => {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return compare(signature.replace(/^sha256=/, ''), expected);
};

const verifySvixSignature = (rawBody: string, request: NextRequest, secret: string) => {
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return false;

  const secretValue = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret);
  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secretValue).update(signedPayload).digest('base64');
  return signature.split(' ').some((part) => compare(part.replace(/^v\d+,/, ''), expected));
};

const verifyWebhook = (rawBody: string, request: NextRequest) => {
  const secret = webhookSecret();
  if (!secret) return process.env.NODE_ENV !== 'production';

  const simpleSignature =
    request.headers.get('x-family-hub-signature') ||
    request.headers.get('x-resend-signature') ||
    request.headers.get('resend-signature');

  if (simpleSignature && verifySimpleSignature(rawBody, simpleSignature, secret)) return true;
  return verifySvixSignature(rawBody, request, secret);
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWebhook(rawBody, request)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const result = await ingestCalendarEmailPayload(payload);
  return NextResponse.json(result.body, { status: result.statusCode });
}
