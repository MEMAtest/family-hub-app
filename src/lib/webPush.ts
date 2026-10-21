import webpush from 'web-push';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { isInboxOnlyNotificationSource, londonNotificationDay } from '@/lib/notificationDelivery';

type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
};

type PushSendResult = {
  sent: number;
  failed: number;
  inactive: number;
  configured?: boolean;
  subscriptions?: number;
  suppressed?: 'inbox_only';
};

const subject = process.env.VAPID_SUBJECT || 'mailto:admin@familyhub.app';
const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export const isWebPushConfigured = () => Boolean(publicKey && privateKey);

export const getVapidPublicKey = () => publicKey;

export const sendFamilyPushNotification = async (
  familyId: string,
  payload: PushPayload,
  personId?: string,
  subscriptionId?: string,
): Promise<PushSendResult> => {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0, inactive: 0, configured: false, subscriptions: 0 };
  }

  let recipientPersonId = personId;
  let expiresAt = payload.data?.expiresAt;
  let occurrence = payload.data?.occurrenceId || payload.data?.scheduledFor || payload.data?.startsAt;
  if (typeof payload.data?.notificationId === 'string') {
    const notification = await prisma.notification.findFirst({ where: { id: payload.data.notificationId, familyId } });
    const now = Date.now();
    if (!notification || notification.read ||
        (notification.expiresAt && notification.expiresAt.getTime() <= now) ||
        (notification.snoozedUntil && notification.snoozedUntil.getTime() > now) ||
        (notification.recipientPersonId && personId && notification.recipientPersonId !== personId)) {
      return { sent: 0, failed: 0, inactive: 0, configured: true, subscriptions: 0 };
    }
    recipientPersonId = notification.recipientPersonId ?? personId;
    expiresAt = notification.expiresAt?.toISOString() ?? expiresAt;
    occurrence = occurrence || notification.snoozedUntil?.toISOString();
    const metadata = notification.metadata as { source?: unknown } | null;
    if (metadata?.source === 'home-intelligence' && !notification.expiresAt) {
      const sourceTime = notification.timestamp || notification.createdAt;
      const timestamp = sourceTime ? new Date(sourceTime) : null;
      if (!timestamp || !Number.isFinite(timestamp.getTime())) {
        return { sent: 0, failed: 0, inactive: 0, configured: true, subscriptions: 0 };
      }
      expiresAt = londonNotificationDay(timestamp).endsAt.toISOString();
      if (Date.parse(String(expiresAt)) <= now) return { sent: 0, failed: 0, inactive: 0, configured: true, subscriptions: 0 };
    }
    if (isInboxOnlyNotificationSource(metadata?.source)) {
      return { sent: 0, failed: 0, inactive: 0, configured: true, subscriptions: 0, suppressed: 'inbox_only' };
    }
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      familyId,
      isActive: true,
      ...(recipientPersonId ? { personId: recipientPersonId } : {}),
      ...(subscriptionId ? { id: subscriptionId } : {}),
    },
  });

  const results: PushSendResult = { sent: 0, failed: 0, inactive: 0, configured: true, subscriptions: subscriptions.length };
  const deliveryId = payload.data?.deliveryId || (payload.data?.notificationId
    ? JSON.stringify([payload.data.notificationId, occurrence])
    : occurrence ? JSON.stringify([payload.tag, occurrence]) : randomUUID());
  const body = JSON.stringify({
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    requireInteraction: false,
    ...payload,
    data: { ...payload.data, familyId, ...(recipientPersonId ? { personId: recipientPersonId } : {}),
      expiresAt, deliveryId, pushedAt: new Date().toISOString() },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
          { TTL: 15 * 60, urgency: 'normal' }
        );
        results.sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          results.inactive += 1;
          await prisma.pushSubscription.update({
            where: { endpoint: subscription.endpoint },
            data: { isActive: false },
          });
          return;
        }

        results.failed += 1;
        console.warn('Failed to send web push notification', { statusCode: typeof statusCode === 'number' ? statusCode : undefined });
      }
    })
  );

  return results;
};

export const sendMemberPushNotification = (familyId: string, personId: string, payload: PushPayload, subscriptionId?: string) => {
  if (!personId) throw new Error('A recipient member is required for private push');
  return sendFamilyPushNotification(familyId, payload, personId, subscriptionId);
};
