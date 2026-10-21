import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { sendMemberPushNotification } from '@/lib/webPush';
import type { CalendarEvent } from '@/types/calendar.types';
import { getCalendarEventIcon, getEventNotificationMetadata } from '@/utils/eventSemantics';
import { toCalendarEventResponse } from '@/lib/calendarEventMapping';
import { travelContext, type ReminderEvent } from '@/lib/familyReminderPlanner';
import { isActionableNotification, londonNotificationDay } from '@/lib/notificationDelivery';
import { enrichSavedSchoolEventResponses } from '@/lib/schoolIntakeServer';

const receiptId = (familyId: string, personId: string, key: string) =>
  `sweep-${createHash('sha256').update(JSON.stringify([familyId, personId, key])).digest('hex')}`;

const eventDateTime = (event: { eventDate: Date; eventTime: Date }) => {
  const date = event.eventDate.toISOString().split('T')[0];
  const time = event.eventTime.toISOString().split('T')[1]?.slice(0, 5) ?? '09:00';
  return new Date(`${date}T${time}:00Z`);
};

const describeWindow = (minutesUntil: number) => {
  if (minutesUntil <= 90) return { key: '1h', label: 'in about an hour', priority: 'urgent' as const };
  if (minutesUntil <= 24 * 60) return { key: '24h', label: 'within 24 hours', priority: 'high' as const };
  return { key: '7d', label: 'this week', priority: 'medium' as const };
};

const compactMetadata = (metadata: Record<string, unknown>): Prisma.InputJsonObject =>
  Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined)) as Prisma.InputJsonObject;

export const POST = requireFamilyAccess(async (_request, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const personId = authUser.familyMemberId;
    if (!personId) return NextResponse.json({ created: 0, pushSent: 0 });
    const now = new Date();
    const day = londonNotificationDay(now);
    const today = new Date(`${day.key}T00:00:00Z`);
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await prisma.calendarEvent.findMany({
        where: {
          familyId,
          personId,
          eventDate: {
            gte: today,
            lte: sevenDays,
          },
        },
        include: {
          person: {
            select: { name: true },
          },
        },
        orderBy: { eventDate: 'asc' },
        take: 50,
      });

    let created = 0;
    let pushSent = 0;

    for (const event of await enrichSavedSchoolEventResponses(familyId, events)) {
      // Travel has member-specific server intents; the old household sweep must not duplicate them.
      const mappedEvent = toCalendarEventResponse(event);
      if (travelContext(mappedEvent as ReminderEvent) || mappedEvent.status === 'cancelled' || mappedEvent.metadata?.schoolImportReview) continue;
      const start = eventDateTime(event);
      const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60_000);
      if (minutesUntil < 0) continue;

      const shouldSend =
        minutesUntil <= 90 ||
        minutesUntil <= 24 * 60 ||
        (event.eventType === 'education' && minutesUntil <= 7 * 24 * 60);

      if (!shouldSend) continue;

      const window = describeWindow(minutesUntil);
      const dedupeKey = `event-reminder:${event.id}:${start.toISOString()}:${window.key}`;
      const id = receiptId(familyId, personId, dedupeKey);
      const existing = await prisma.notification.findFirst({ where: { familyId,
        OR: [{ id }, { AND: [
          { OR: [{ recipientPersonId: personId }, { recipientPersonId: null }] },
          { metadata: { path: ['dedupeKey'], equals: `event-reminder:${event.id}:${window.key}` } },
        ] }],
      } });
      if (existing) continue;

      const title = `Upcoming: ${event.title}`;
      const message = `${event.title} is ${window.label}${event.person?.name ? ` for ${event.person.name}` : ''}.`;
      const eventDate = event.eventDate.toISOString().split('T')[0];
      const eventTime = event.eventTime.toISOString().split('T')[1]?.slice(0, 5) ?? '09:00';
      const eventUrl = `/?view=calendar&event=${event.id}`;
      const semanticEvent = {
        title: event.title,
        type: event.eventType as CalendarEvent['type'],
        date: eventDate,
        time: eventTime,
        location: event.location || undefined,
        notes: event.notes || event.description || undefined,
      };
      const eventIcon = getCalendarEventIcon(semanticEvent);

      try {
        await prisma.notification.create({
        data: {
          id,
          familyId,
          recipientPersonId: personId,
          expiresAt: start,
          type: 'reminder',
          title,
          message,
          icon: eventIcon,
          priority: window.priority,
          category: 'event',
          read: false,
          actionRequired: true,
          relatedEventId: event.id,
          relatedPersonId: event.personId,
          actions: [
            { id: 'open', label: 'Open calendar', type: 'primary', action: 'view_calendar', data: { url: eventUrl, eventId: event.id } },
            { id: 'dismiss', label: 'Dismiss', type: 'secondary', action: 'dismiss' },
          ],
          metadata: compactMetadata({
            dedupeKey,
            source: 'notification-sweep',
            eventId: event.id,
            url: eventUrl,
            ...getEventNotificationMetadata(semanticEvent),
          }),
        },
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') continue;
        throw error;
      }
      created += 1;
    }

    // Launch sweeps fill the inbox silently. At most one daily catch-up may alert this recipient.
    const unread = await prisma.notification.findMany({ where: { familyId, read: false, actionRequired: true,
      type: { notIn: ['family_reminder_state', 'system'] },
      OR: [{ recipientPersonId: null }, { recipientPersonId: personId }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] }],
    }, orderBy: { timestamp: 'desc' }, take: 200 });
    if (unread.some(item => isActionableNotification(item, now.getTime()))) {
      const summaryId = receiptId(familyId, personId, `catchup:${day.key}`);
      const title = 'Your family catch-up';
      const message = 'You have updates to review in Family Hub.';
      let claimed = false;
      try {
        await prisma.notification.create({ data: { id: summaryId, familyId, recipientPersonId: personId,
          type: 'system', title, message, priority: 'low', category: 'event', read: false, actionRequired: false,
          expiresAt: day.endsAt,
          metadata: { source: 'notification-catchup', dedupeKey: summaryId, url: '/?view=calendar' },
        } });
        claimed = true;
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
      if (claimed) {
        const push = await sendMemberPushNotification(familyId, personId, { title, body: message, tag: summaryId,
          data: { familyId, personId, notificationId: summaryId, url: '/?view=calendar',
            expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString() },
          actions: [{ action: 'view', title: 'Open calendar' }],
        });
        pushSent = push.sent;
      }
    }

    return NextResponse.json({ created, pushSent });
  } catch (error) {
    console.error('Notification sweep error:', error);
    return NextResponse.json({ error: 'Failed to run notification sweep' }, { status: 500 });
  }
});
