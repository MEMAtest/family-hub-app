import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { sendMemberPushNotification } from '@/lib/webPush';
import { notificationVisibility } from '@/lib/notificationRecipients';
import { FAMILY_REMINDER_SOURCE } from '@/lib/familyReminderContract';

const dateString = z.string().datetime();

const createNotificationSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  icon: z.string().optional().nullable(),
  priority: z.string().min(1),
  category: z.string().min(1),
  timestamp: dateString.optional(),
  read: z.boolean().optional(),
  actionRequired: z.boolean().optional(),
  actions: z.any().optional().nullable(),
  relatedEventId: z.string().optional().nullable(),
  relatedPersonId: z.string().optional().nullable(),
  expiresAt: dateString.optional().nullable(),
  snoozedUntil: dateString.optional().nullable(),
  metadata: z.any().optional().nullable(),
});

const toClient = (n: any) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  message: n.message,
  icon: n.icon,
  priority: n.priority,
  category: n.category,
  timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp,
  read: n.read,
  actionRequired: n.actionRequired,
  actions: n.actions,
  relatedEventId: n.relatedEventId,
  relatedPersonId: n.relatedPersonId,
  recipientPersonId: n.recipientPersonId,
  expiresAt: n.expiresAt ? (n.expiresAt instanceof Date ? n.expiresAt.toISOString() : n.expiresAt) : undefined,
  snoozedUntil: n.snoozedUntil ? (n.snoozedUntil instanceof Date ? n.snoozedUntil.toISOString() : n.snoozedUntil) : undefined,
  metadata: n.metadata,
});

export const GET = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const read = searchParams.get('read');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)));
    const offset = Math.max(0, Number(searchParams.get('offset') || 0));

    const visibility = await notificationVisibility(familyId, authUser);
    const now = new Date();
    const where: Record<string, any> = { ...visibility.where, type: { not: 'family_reminder_state' }, AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] },
    ] };
    if (read === 'true') where.read = true;
    if (read === 'false') where.read = false;
    if (category) where.category = category;
    if (type) where.AND.push({ type });

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }],
      take: limit,
      skip: offset,
    });

    return NextResponse.json(notifications.map((notification) => {
      const unclaimed = visibility.unclaimed.find((member) => member.id === notification.recipientPersonId);
      const mapped = toClient(notification);
      return { ...mapped, metadata: { ...(mapped.metadata || {}),
        recipientName: unclaimed?.name ?? mapped.metadata?.recipientName,
        recipientClaimed: !unclaimed,
        canAct: !notification.recipientPersonId || notification.recipientPersonId === authUser.familyMemberId,
      } };
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const raw = await request.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 });
    }

    const body = createNotificationSchema.parse(raw);
    if (body.id?.startsWith('family-reminder-') || body.type === 'family_reminder_state' ||
        [FAMILY_REMINDER_SOURCE, 'family-reminder-state'].includes(body.metadata?.source)) {
      return NextResponse.json({ error: 'Reminder records are managed by the server.' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        familyId,
        recipientPersonId: authUser.familyMemberId,
        type: body.type,
        title: body.title,
        message: body.message,
        icon: body.icon ?? undefined,
        priority: body.priority,
        category: body.category,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        read: body.read ?? false,
        actionRequired: body.actionRequired ?? false,
        actions: body.actions ?? undefined,
        relatedEventId: body.relatedEventId ?? undefined,
        relatedPersonId: body.relatedPersonId ?? undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        snoozedUntil: body.snoozedUntil ? new Date(body.snoozedUntil) : undefined,
        metadata: body.metadata ?? undefined,
      },
    });

    const pushResult = await sendMemberPushNotification(familyId, authUser.familyMemberId, {
      title: notification.title,
      body: notification.message,
      tag: `notification-${notification.id}`,
      data: {
        familyId,
        notificationId: notification.id,
        type: notification.type,
        relatedEventId: notification.relatedEventId,
        url: '/',
      },
      actions: [
        { action: 'view', title: 'Open' },
      ],
    });

    return NextResponse.json({ ...toClient(notification), push: pushResult }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 });
    }
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
});
