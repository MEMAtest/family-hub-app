import { NextRequest, NextResponse } from 'next/server';
import {
  getWhatsAppConfig,
  isValidWhatsAppSignature,
  recordWhatsAppDeliveryStatus,
  setWhatsAppConsentState,
} from '@/lib/whatsappCalendarReminders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (
    !verifyToken ||
    searchParams.get('hub.mode') !== 'subscribe' ||
    searchParams.get('hub.verify_token') !== verifyToken
  ) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return new NextResponse(searchParams.get('hub.challenge') || '', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return NextResponse.json({ error: 'Webhook signature verification is not configured' }, { status: 503 });

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!isValidWhatsAppSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      entry?: Array<{ changes?: Array<{ value?: {
        metadata?: { phone_number_id?: string };
        messages?: Array<{ from?: string; type?: string; text?: { body?: string }; timestamp?: string }>;
        statuses?: Array<{ id?: string; status?: string; timestamp?: string }>;
      } }> }>;
    };
    const config = getWhatsAppConfig();
    const familyId = process.env.CALENDAR_INBOUND_FAMILY_ID;
    let updated = 0;
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!config || !familyId || value?.metadata?.phone_number_id !== config.phoneNumberId) continue;
        for (const status of value.statuses || []) {
          if (!status.id || !status.status) continue;
          updated += await recordWhatsAppDeliveryStatus(status.id, status.status, status.timestamp);
        }
        for (const message of value.messages || []) {
          if (!message.from || message.type !== 'text') continue;
          const from = message.from.replace(/\D/g, '');
          const command = message.text?.body?.trim().toLowerCase();
          if (from !== config.recipient || !command) continue;
          const consentAt = message.timestamp && /^\d+$/.test(message.timestamp)
            ? new Date(Number(message.timestamp) * 1000)
            : new Date();
          if (['start', 'unstop'].includes(command)) {
            updated += Number(await setWhatsAppConsentState(familyId, from, 'opted_in', consentAt));
          } else if (['stop', 'unsubscribe', 'end', 'quit', 'cancel'].includes(command)) {
            updated += Number(await setWhatsAppConsentState(familyId, from, 'opted_out', consentAt));
          }
        }
      }
    }
    return NextResponse.json({ received: true, updated });
  } catch {
    return NextResponse.json({ error: 'Invalid WhatsApp webhook payload' }, { status: 400 });
  }
}
