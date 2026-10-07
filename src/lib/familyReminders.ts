import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { toCalendarEventResponse } from '@/lib/calendarEventMapping';
import { sendMemberPushNotification } from '@/lib/webPush';
import { FAMILY_REMINDER_SOURCE, type FamilyReminderAction } from './familyReminderContract';
import { londonDate, londonParts, planFamilyReminders, reminderFingerprint, reminderOccurrenceEvent, travelReminderPurposes, type ReminderEvent, type ReminderIntent } from './familyReminderPlanner';
import { expandEvents, type RecurrenceException } from '@/utils/recurrence';

export const reminderObject = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const json = (value: Record<string, any>) => value as Prisma.InputJsonObject;
const unresolved = (state: Record<string, any>) => !['done', 'not_needed', 'cover'].includes(state.resolution);
const metadataMatch = (metadata: unknown) => ({ equals: metadata as Prisma.InputJsonValue });

const actionsFor = (intent: ReminderIntent) => [
  { id: 'details', label: 'Complete details', type: 'primary', action: 'reminder_details' },
  ...(intent.purpose === 'coverage' ? [{ id: 'cover', label: 'Confirm cover', type: 'primary', action: 'reminder_cover' }] : []),
  { id: 'done', label: 'Done', type: 'secondary', action: 'reminder_done' },
  { id: 'not_needed', label: 'Not needed', type: 'secondary', action: 'reminder_not_needed' },
  { id: 'snooze', label: 'Snooze', type: 'secondary', action: 'reminder_snooze' },
];

export const reserveReminderIntent = async (familyId: string, intent: ReminderIntent, now: Date) => {
  // Avoid expected unique-constraint errors on every cron tick; the create still arbitrates races.
  if (await prisma.notification.findUnique({ where: { id: intent.id }, select: { id: true } })) return false;
  const state = await prisma.notification.findUnique({ where: { id: intent.stateId }, select: { metadata: true } });
  const stateMetadata = reminderObject(state?.metadata);
  if (!unresolved(stateMetadata)) return false;
  if (stateMetadata.snoozedUntil) {
    const wakeAt = new Date(stateMetadata.snoozedUntil);
    if (wakeAt > now || intent.phase === 'departure-60' && wakeAt >= intent.dueAt ||
        intent.phase === `${londonDate(wakeAt)}-${londonParts(wakeAt).hour}`) return false;
  }
  try {
    await prisma.notification.create({ data: {
      id: intent.id, familyId, recipientPersonId: intent.recipientPersonId,
      relatedEventId: intent.eventId, relatedPersonId: intent.recipientPersonId,
      type: 'reminder', category: 'event', title: intent.title, message: intent.message,
      priority: intent.phase === 'departure-60' ? 'high' : 'medium', read: false, actionRequired: true,
      timestamp: now, expiresAt: intent.expiresAt,
      ...(stateMetadata.snoozedUntil ? { snoozedUntil: new Date(stateMetadata.snoozedUntil) } : {}),
      actions: actionsFor(intent), metadata: json({
        source: FAMILY_REMINDER_SOURCE, stateId: intent.stateId,
        occurrence: intent.occurrence, purpose: intent.purpose, phase: intent.phase,
        fingerprint: intent.fingerprint,
        recipientName: intent.recipientName, dueAt: intent.dueAt.toISOString(),
        pushEnabled: intent.push, pushStatus: intent.push ? 'pending' : 'disabled', whatsappStatus: 'unavailable',
        url: `/?view=calendar&event=${encodeURIComponent(intent.eventId)}`,
      }),
    } });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return false;
    throw error;
  }
};

export const runFamilyReminderSweep = async (familyId: string, now = new Date(), deliverPush = true) => {
  const [storedEvents, members] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { familyId }, include: { exceptions: true } }),
    prisma.familyMember.findMany({ where: { familyId }, include: { user: { select: { neonAuthId: true } } } }),
  ]);
  const events = storedEvents.map(toCalendarEventResponse) as ReminderEvent[];
  const exceptions = storedEvents.flatMap((event) => event.exceptions ?? []).map((exception) => ({
    ...exception, type: exception.type as RecurrenceException['type'],
    overrides: exception.overrides as RecurrenceException['overrides'],
  }));
  const planned = planFamilyReminders(familyId, events, members, now, exceptions);
  let created = 0;
  for (const intent of planned) if (await reserveReminderIntent(familyId, intent, now)) created += 1;
  const existing = await prisma.notification.findMany({ where: {
    familyId, actionRequired: true, metadata: { path: ['source'], equals: FAMILY_REMINDER_SOURCE },
  } });
  let expired = 0;
  let pushAccepted = 0;
  let unavailable = 0;
  for (const record of existing) {
    const metadata = reminderObject(record.metadata);
    if (['resolved', 'expired', 'cancelled'].includes(metadata.intentStatus)) continue;
    const state = await prisma.notification.findUnique({ where: { id: metadata.stateId }, select: { metadata: true } });
    const stateMetadata = reminderObject(state?.metadata);
    const event = events.find((item) => item.id === record.relatedEventId);
    const occurrence = event && expandEvents([reminderOccurrenceEvent(event)], metadata.occurrence, metadata.occurrence, exceptions)
      .find((item) => item.date === metadata.occurrence);
    const currentEvent = event && occurrence ? { ...event, ...occurrence.overrides } as ReminderEvent : undefined;
    const relevant = currentEvent && reminderFingerprint(event!) === metadata.fingerprint && travelReminderPurposes(currentEvent, members).some((request) =>
      request.purpose === metadata.purpose && request.recipient.id === record.recipientPersonId);
    if (!record.expiresAt || record.expiresAt <= now || !relevant || !unresolved(stateMetadata)) {
      await prisma.notification.updateMany({ where: { id: record.id, metadata: metadataMatch(record.metadata) },
        data: { read: true, actionRequired: false, expiresAt: now,
          metadata: json({ ...metadata, intentStatus: !unresolved(stateMetadata) ? 'resolved' : !relevant ? 'cancelled' : 'expired' }) } });
      expired += 1;
      continue;
    }
    if (metadata.pushStatus === 'sending') {
      if (Date.parse(metadata.pushAttemptAt) + 10 * 60_000 < now.getTime()) {
        await prisma.notification.updateMany({ where: { id: record.id, metadata: metadataMatch(record.metadata) },
          data: { metadata: json({ ...metadata, pushStatus: 'unknown', manualReviewRequired: true }) } });
      }
      continue;
    }
    const wakeAt = stateMetadata.snoozedUntil ? new Date(stateMetadata.snoozedUntil) : record.snoozedUntil;
    if (wakeAt && wakeAt > now || Date.parse(metadata.dueAt) > now.getTime()) continue;
    if (record.snoozedUntil && record.snoozedUntil <= now) {
      await prisma.notification.updateMany({ where: { id: record.id }, data: { snoozedUntil: null, read: false } });
    }
    if (!deliverPush || metadata.pushEnabled === false || event?.metadata?.reminderPreferences?.push === false || !['pending', 'unavailable'].includes(metadata.pushStatus)) continue;
    const member = members.find((item) => item.id === record.recipientPersonId);
    if (!member?.user?.neonAuthId) {
      unavailable += 1;
      if (metadata.pushStatus !== 'unavailable') await prisma.notification.updateMany({
        where: { id: record.id, metadata: metadataMatch(record.metadata) },
        data: { metadata: json({ ...metadata, pushStatus: 'unavailable', pushReason: 'recipient_account_unclaimed' }) },
      });
      continue;
    }
    // CAS gives concurrent cron invocations one sender; a stale claim is never blindly resent.
    const claimed = await prisma.notification.updateMany({ where: {
      id: record.id, metadata: metadataMatch(record.metadata), actionRequired: true,
    }, data: { metadata: json({ ...metadata, pushStatus: 'sending', pushAttemptAt: now.toISOString() }) } });
    if (!claimed.count) continue;
    let result: Record<string, any>;
    try {
      const push = await sendMemberPushNotification(familyId, member.id, {
        title: record.title, body: record.message, tag: record.id,
        data: { familyId, notificationId: record.id, eventId: record.relatedEventId, url: metadata.url },
        actions: [{ action: 'view', title: 'Open reminder' }],
      });
      pushAccepted += push.sent;
      const status = push.sent ? 'accepted' : push.failed ? 'unknown' : 'unavailable';
      if (status === 'unavailable') unavailable += 1;
      result = { pushStatus: status, pushAttempt: push,
        ...(status === 'unknown' ? { manualReviewRequired: true } : {}) };
    } catch { result = { pushStatus: 'unknown', manualReviewRequired: true }; }
    await prisma.notification.updateMany({ where: {
      id: record.id, metadata: metadataMatch(json({ ...metadata, pushStatus: 'sending', pushAttemptAt: now.toISOString() })),
    }, data: { metadata: json({ ...metadata, ...result, pushAttemptAt: now.toISOString() }) } });
  }
  return { planned: planned.length, created, expired, pushAccepted, unavailable,
    whatsapp: 'unavailable_for_travel', deliveryConfirmed: false };
};

export class ReminderActionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export const applyFamilyReminderAction = async (
  familyId: string, personId: string, notificationId: string, action: FamilyReminderAction,
  until?: Date, now = new Date(),
) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const record = await tx.notification.findFirst({ where: { id: notificationId, familyId } });
        if (!record || reminderObject(record.metadata).source !== FAMILY_REMINDER_SOURCE) throw new ReminderActionError('Reminder not found', 404);
        if (!personId || personId !== record.recipientPersonId) throw new ReminderActionError('Sign in as the named recipient to act on this reminder.', 403);
        if (!record.expiresAt || record.expiresAt <= now || !record.actionRequired) throw new ReminderActionError('This reminder is no longer active.', 409);
        const metadata = reminderObject(record.metadata);
        const event = record.relatedEventId && await tx.calendarEvent.findFirst({ where: { id: record.relatedEventId, familyId }, include: { exceptions: true } });
        if (!event || reminderObject(event.metadata).status === 'cancelled' || reminderObject(event.metadata).reminderPreferences?.enabled === false) {
          throw new ReminderActionError('The trip is cancelled or reminders are disabled.', 409);
        }
        const members = await tx.familyMember.findMany({ where: { familyId } });
        const mappedEvent = toCalendarEventResponse(event) as ReminderEvent;
        const exceptions = (event.exceptions ?? []).map((exception) => ({ ...exception,
          type: exception.type as RecurrenceException['type'], overrides: exception.overrides as RecurrenceException['overrides'] }));
        const occurrence = expandEvents([reminderOccurrenceEvent(mappedEvent)], metadata.occurrence, metadata.occurrence, exceptions)
          .find((item) => item.date === metadata.occurrence);
        if (!occurrence || reminderFingerprint(mappedEvent) !== metadata.fingerprint || !travelReminderPurposes({ ...mappedEvent, ...occurrence.overrides } as ReminderEvent, members)
          .some((request) => request.recipient.id === personId && request.purpose === metadata.purpose)) {
          throw new ReminderActionError('The trip or preparation has changed. Refresh your reminders.', 409);
        }
        if (action === 'cover' && metadata.purpose !== 'coverage') throw new ReminderActionError('This is not a coverage reminder.', 400);
        if (action === 'details') return { url: metadata.url, resolution: null };
        if (action === 'snooze' && (!until || !Number.isFinite(until.getTime()) || until <= now || until >= record.expiresAt)) {
          throw new ReminderActionError('Choose a snooze time before departure or reminder expiry.', 400);
        }
        const current = await tx.notification.findUnique({ where: { id: metadata.stateId } });
        const previous = reminderObject(current?.metadata);
        if (!unresolved(previous)) throw new ReminderActionError('This reminder has already been completed.', 409);
        const stateMetadata = json({ ...previous, source: 'family-reminder-state',
          resolution: action === 'snooze' ? null : action, actionBy: personId, actionAt: now.toISOString(),
          snoozedUntil: action === 'snooze' ? until!.toISOString() : null });
        await tx.notification.upsert({ where: { id: metadata.stateId },
          create: { id: metadata.stateId, familyId, recipientPersonId: personId, relatedEventId: record.relatedEventId,
            type: 'family_reminder_state', category: 'settings', title: 'Reminder action state', message: action,
            priority: 'low', read: true, actionRequired: false, metadata: stateMetadata },
          update: { metadata: stateMetadata },
        });
        const siblings = await tx.notification.findMany({ where: { familyId, recipientPersonId: personId,
          relatedEventId: record.relatedEventId, metadata: { path: ['stateId'], equals: metadata.stateId } } });
        for (const sibling of siblings) {
          const wakeSelected = action === 'snooze' && sibling.id === notificationId;
          await tx.notification.update({ where: { id: sibling.id }, data: {
            ...(wakeSelected ? { snoozedUntil: until, read: false } : { read: true, actionRequired: false, expiresAt: now }),
            metadata: json({ ...reminderObject(sibling.metadata),
              ...(wakeSelected ? { pushStatus: 'pending' } : action === 'snooze'
                ? { intentStatus: 'superseded' } : { intentStatus: 'resolved', resolution: action }),
            }),
          } });
        }
        return { resolution: action === 'snooze' ? null : action, snoozedUntil: until?.toISOString() };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw new ReminderActionError('Reminder changed. Try again.', 409);
};
