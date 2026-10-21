import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { notificationVisibility } from '@/lib/notificationRecipients';
import { FAMILY_REMINDER_SOURCE } from '@/lib/familyReminderContract';
import { enrichSavedSchoolEventResponses } from '@/lib/schoolIntakeServer';
import { presentSchoolNotification } from '@/lib/schoolNotificationPresentation';
import { isActionableNotification } from '@/lib/notificationDelivery';

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
    const where: Record<string, any> = { ...visibility.where, type: { not: 'family_reminder_state' }, AND: searchParams.get('includeHistory') === 'true' ? [] : [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] },
    ] };
    if (read === 'true') where.read = true;
    if (read === 'false') {
      where.read = false;
      where.AND.push({ OR: [{ recipientPersonId: null }, ...(authUser.familyMemberId ? [{ recipientPersonId: authUser.familyMemberId }] : [])] });
    }
    if (searchParams.get('actionable') === 'true') {
      where.read = false;
      where.actionRequired = true;
      where.AND.push({ OR: [{ recipientPersonId: null }, ...(authUser.familyMemberId ? [{ recipientPersonId: authUser.familyMemberId }] : [])] });
      where.AND.push({ OR: [{ expiresAt: { not: null } }, { timestamp: { gt: new Date(now.getTime() - 7 * 86_400_000) } }] });
    }
    if (category) where.category = category;
    if (type) where.AND.push({ type });

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }],
      take: limit,
      skip: offset,
    });

    // Historical reminders keep their recipient/read state but display current source-backed event assignments.
    const schoolEventIds = [...new Set(notifications.filter((notification) =>
      (notification.metadata as any)?.source === 'notification-sweep' && notification.relatedEventId)
      .map((notification) => notification.relatedEventId!))];
    const schoolEvents = schoolEventIds.length ? await enrichSavedSchoolEventResponses(familyId,
      await prisma.calendarEvent.findMany({ where: { familyId, id: { in: schoolEventIds } } })) : [];
    const schoolMembers = schoolEvents.length ? await prisma.familyMember.findMany({ where: { familyId } }) : [];
    const schoolEventsById = new Map(schoolEvents.map((event) => [event.id, event]));

    return NextResponse.json(notifications.filter(notification => searchParams.get('actionable') !== 'true' ||
      isActionableNotification(notification, now.getTime())).map((notification) => {
      const unclaimed = visibility.unclaimed.find((member) => member.id === notification.recipientPersonId);
      const mapped = presentSchoolNotification(toClient(notification),
        schoolEventsById.get(notification.relatedEventId || ''), schoolMembers);
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
    if (!authUser.familyMemberId) return NextResponse.json({ error: 'A recipient member is required.' }, { status: 403 });
    if (body.id?.startsWith('family-reminder-') || body.type === 'family_reminder_state' ||
        [FAMILY_REMINDER_SOURCE, 'family-reminder-state'].includes(body.metadata?.source)) {
      return NextResponse.json({ error: 'Reminder records are managed by the server.' }, { status: 400 });
    }

    const dedupeKey = body.metadata?.dedupeKey ||
      (body.metadata?.type && body.metadata?.nodeId ? `${body.metadata.type}:${body.metadata.nodeId}` : undefined) ||
      (body.type === 'system' && body.title === 'Enable Notifications?' ? 'system-enable-browser-notifications' : undefined);
    const id = dedupeKey ? `notice-${createHash('sha256').update(JSON.stringify([familyId, authUser.familyMemberId, dedupeKey])).digest('hex')}` : body.id;
    // Keep legacy read/snoozed/dismissed records as receipts too. Never reactivate them on launch.
    const existing = await prisma.notification.findFirst({ where: { familyId, recipientPersonId: authUser.familyMemberId,
      OR: [...(id ? [{ id }] : []), ...(dedupeKey ? [{ metadata: { path: ['dedupeKey'], equals: dedupeKey } }] : [])],
    } });
    if (existing) return NextResponse.json(toClient(existing));

    let notification;
    try {
      notification = await prisma.notification.create({
      data: {
        ...(id ? { id } : {}),
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
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002' || !id) throw error;
      const winner = await prisma.notification.findFirst({ where: { id, familyId, recipientPersonId: authUser.familyMemberId } });
      if (!winner) throw error;
      return NextResponse.json(toClient(winner));
    }

    // Client hydration discovers history as well as live changes; it is inbox-only.
    return NextResponse.json(toClient(notification), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid notification payload' }, { status: 400 });
    }
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
});
