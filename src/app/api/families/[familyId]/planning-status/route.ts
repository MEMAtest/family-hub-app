import { NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const GET = requireFamilyAccess(async (_request, context, auth) => {
  const { familyId } = await context.params;
  const gmail = await prisma.gmailConnection.findUnique({ where: { familyId },
    select: { enabled: true, lastSyncAt: true } });
  const reminders = await prisma.notification.groupBy({ by: ['recipientPersonId'], where: {
    familyId, recipientPersonId: auth.familyMemberId, metadata: { path: ['source'], equals: 'family-reminder-planner' },
    actionRequired: true, expiresAt: { gt: new Date() },
  }, _count: true });
  const failureCount = await prisma.notification.count({ where: {
    familyId, metadata: { path: ['manualReviewRequired'], equals: true },
  } });
  return NextResponse.json({
    release: process.env.RELEASE_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
    timeZone: 'Europe/London', intakeTimes: ['08:00', '20:00'],
    gmail: { connected: Boolean(gmail?.enabled), lastSyncAt: gmail?.lastSyncAt || null },
    schedulingConfigured: Boolean(process.env.CRON_SECRET && process.env.CALENDAR_INBOUND_FAMILY_ID === familyId),
    phonePushConfigured: Boolean(process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PUBLIC_KEY),
    personalPhoneSubscriptions: await prisma.pushSubscription.count({ where: { familyId, personId: auth.familyMemberId, isActive: true } }),
    grandir: { portalAccess: 'unverified', backgroundPortalSync: false },
    activeReminders: reminders, deliveryNeedsReview: failureCount,
  });
});
