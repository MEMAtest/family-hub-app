import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { sendFamilyPushNotification } from '@/lib/webPush';
import type { CalendarEvent } from '@/types/calendar.types';
import { getCalendarEventIcon, getEventNotificationMetadata } from '@/utils/eventSemantics';

const hasDedupeKey = (metadata: unknown, dedupeKey: string) => {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as { dedupeKey?: string }).dedupeKey === dedupeKey;
};

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

export const POST = requireFamilyAccess(async (_request, context) => {
  try {
    const { familyId } = await context.params;
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [events, recentNotifications] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          familyId,
          eventDate: {
            gte: now,
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
      }),
      prisma.notification.findMany({
        where: {
          familyId,
          createdAt: {
            gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          },
        },
        select: { metadata: true },
        take: 200,
      }),
    ]);

    let created = 0;
    let pushSent = 0;
    const existingKeys = new Set<string>();
    recentNotifications.forEach((notification) => {
      const metadata = notification.metadata as { dedupeKey?: string } | null;
      if (metadata?.dedupeKey) existingKeys.add(metadata.dedupeKey);
    });

    for (const event of events) {
      const start = eventDateTime(event);
      const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60_000);
      if (minutesUntil < 0) continue;

      const shouldSend =
        minutesUntil <= 90 ||
        minutesUntil <= 24 * 60 ||
        (event.eventType === 'education' && minutesUntil <= 7 * 24 * 60);

      if (!shouldSend) continue;

      const window = describeWindow(minutesUntil);
      const dedupeKey = `event-reminder:${event.id}:${window.key}`;
      if (existingKeys.has(dedupeKey) || recentNotifications.some((notification) => hasDedupeKey(notification.metadata, dedupeKey))) {
        continue;
      }

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

      await prisma.notification.create({
        data: {
          familyId,
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
      created += 1;
      existingKeys.add(dedupeKey);

      const push = await sendFamilyPushNotification(familyId, {
        title,
        body: message,
        tag: dedupeKey,
        data: {
          familyId,
          eventId: event.id,
          type: 'event-reminder',
          url: eventUrl,
        },
        actions: [
          { action: 'view', title: 'Open calendar' },
          { action: 'snooze', title: 'Snooze 10m' },
        ],
      });
      pushSent += push.sent;
    }

    return NextResponse.json({ created, pushSent });
  } catch (error) {
    console.error('Notification sweep error:', error);
    return NextResponse.json({ error: 'Failed to run notification sweep' }, { status: 500 });
  }
});
