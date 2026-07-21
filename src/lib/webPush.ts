import webpush from 'web-push';
import prisma from '@/lib/prisma';

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
  payload: PushPayload
): Promise<PushSendResult> => {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0, inactive: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      familyId,
      isActive: true,
    },
  });

  const results: PushSendResult = { sent: 0, failed: 0, inactive: 0 };
  const body = JSON.stringify({
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    requireInteraction: true,
    ...payload,
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
          body
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
        console.warn('Failed to send web push notification:', error);
      }
    })
  );

  return results;
};
