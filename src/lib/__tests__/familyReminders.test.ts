jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  notification: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  calendarEvent: { findMany: jest.fn(), findFirst: jest.fn() }, familyMember: { findMany: jest.fn() }, $transaction: jest.fn(),
} }));
jest.mock('@/lib/webPush', () => ({ sendMemberPushNotification: jest.fn() }));
import prisma from '@/lib/prisma';
import { sendMemberPushNotification } from '@/lib/webPush';
import { reserveReminderIntent, runFamilyReminderSweep, applyFamilyReminderAction } from '@/lib/familyReminders';
import { planFamilyReminders, type ReminderEvent } from '@/lib/familyReminderPlanner';

const now = new Date('2026-10-07T07:00:00Z');
const members = [{ id: 'angela', name: 'Angela', role: 'Parent', user: { neonAuthId: 'angela-auth' } },
  { id: 'ade', name: 'Ade', role: 'Parent', user: { neonAuthId: 'ade-auth' } }];
const dbEvent = { id: 'trip', familyId: 'family', personId: 'angela', title: 'Travel',
  eventDate: new Date('2026-10-08T09:00:00Z'), eventTime: new Date('2026-10-08T09:00:00Z'),
  durationMinutes: 60, eventType: 'work', recurringPattern: 'none', isRecurring: false,
  metadata: { travel: {} }, createdAt: now, updatedAt: now };
const uiEvent = { ...dbEvent, person: 'angela', date: '2026-10-08', time: '09:00', status: 'confirmed',
  type: 'work', recurring: 'none', cost: 0, priority: 'medium' } as unknown as ReminderEvent;
const intent = planFamilyReminders('family', [uiEvent], members, now)[0];
let records: Map<string, any>;
const snapshot = (record: any) => record ? { ...record,
  metadata: record.metadata ? JSON.parse(JSON.stringify(record.metadata)) : record.metadata } : null;
const matches = (record: any, where: any): boolean => {
  if (where.id && record.id !== where.id || where.familyId && record.familyId !== where.familyId ||
      where.recipientPersonId && record.recipientPersonId !== where.recipientPersonId ||
      where.relatedEventId && record.relatedEventId !== where.relatedEventId ||
      where.actionRequired !== undefined && record.actionRequired !== where.actionRequired) return false;
  if (where.metadata?.path && record.metadata[where.metadata.path[0]] !== where.metadata.equals) return false;
  if (where.metadata?.equals && !where.metadata.path && JSON.stringify(record.metadata) !== JSON.stringify(where.metadata.equals)) return false;
  return true;
};
beforeEach(() => {
  jest.resetAllMocks(); records = new Map();
  (prisma.notification.findUnique as jest.Mock).mockImplementation(async ({ where }) => snapshot(records.get(where.id)));
  (prisma.notification.findFirst as jest.Mock).mockImplementation(async ({ where }) => snapshot([...records.values()].find((record) => matches(record, where))));
  (prisma.notification.findMany as jest.Mock).mockImplementation(async ({ where }) => [...records.values()].filter((record) => matches(record, where)).map(snapshot));
  (prisma.notification.create as jest.Mock).mockImplementation(async ({ data }) => {
    if (records.has(data.id)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
    records.set(data.id, { ...data }); return data;
  });
  (prisma.notification.updateMany as jest.Mock).mockImplementation(async ({ where, data }) => {
    let count = 0;
    for (const record of records.values()) if (matches(record, where)) { Object.assign(record, data); count += 1; }
    return { count };
  });
  (prisma.notification.update as jest.Mock).mockImplementation(async ({ where, data }) => {
    const record = records.get(where.id); Object.assign(record, data); return record;
  });
  (prisma.notification.upsert as jest.Mock).mockImplementation(async ({ where, create, update }) => {
    const value = records.has(where.id) ? { ...records.get(where.id), ...update } : create;
    records.set(where.id, value); return value;
  });
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([dbEvent]);
  (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(dbEvent);
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members);
  (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(prisma));
  (sendMemberPushNotification as jest.Mock).mockResolvedValue({ sent: 1, failed: 0, inactive: 0, configured: true, subscriptions: 1 });
});

it('reserves a deterministic outbox record only once under concurrent creation', async () => {
  const results = await Promise.all([reserveReminderIntent('family', intent, now), reserveReminderIntent('family', intent, now)]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(records.size).toBe(1);
});
it('does not recreate reminders after purpose completion', async () => {
  records.set(intent.stateId, { metadata: { resolution: 'done' } });
  expect(await reserveReminderIntent('family', intent, now)).toBe(false);
});
it('persists separate bin completion, deduplicates repeated ticks and suppresses only the completing parent', async () => {
  const binTime = new Date('2026-10-08T19:00:00Z');
  const binDb = { ...dbEvent, id: 'bins', eventDate: new Date('2026-10-09'), eventTime: new Date('2026-10-09'),
    metadata: { binCollection: { date: '2026-10-09', services: ['Food waste'], sourceUrl: 'https://council.example/calendar', verified: true } } };
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([binDb]);
  (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(binDb);
  expect((await runFamilyReminderSweep('family', binTime, false)).created).toBe(2);
  expect((await runFamilyReminderSweep('family', binTime, false)).created).toBe(0);
  const angela = [...records.values()].find(record => record.recipientPersonId === 'angela');
  expect(angela.actions[0].label).toBe('View collection');
  expect(angela.actions.map((action: any) => action.label)).toEqual([
    'View collection', 'Bins are out', 'Skip this collection', 'Snooze',
  ]);
  await applyFamilyReminderAction('family', 'angela', angela.id, 'done', undefined, binTime);
  expect((await runFamilyReminderSweep('family', binTime, false)).created).toBe(0);
  expect([...records.values()].find(record => record.recipientPersonId === 'ade').actionRequired).toBe(true);
});
it('holds unverified bin sends and resumes after a successful council check', async () => {
  const binTime = new Date('2026-10-08T19:00:00Z');
  const binDb = { ...dbEvent, id: 'bins', eventDate: new Date('2026-10-09'), eventTime: new Date('2026-10-09'),
    metadata: { binCollection: { date: '2026-10-09', services: ['Food waste'], sourceUrl: 'https://council.example/calendar', verified: true } } };
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([binDb]);
  await runFamilyReminderSweep('family', binTime, false);
  binDb.metadata.binCollection.verified = false;
  await runFamilyReminderSweep('family', binTime);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
  binDb.metadata.binCollection.verified = true;
  expect((await runFamilyReminderSweep('family', binTime)).pushAccepted).toBe(2);
  expect((await runFamilyReminderSweep('family', binTime)).pushAccepted).toBe(0);
});
it('short-circuits normal duplicate ticks before attempting an insert', async () => {
  await reserveReminderIntent('family', intent, now);
  await reserveReminderIntent('family', intent, now);
  expect(prisma.notification.create).toHaveBeenCalledTimes(1);
});
it('sends at most once per recipient across repeated sweeps and does not claim delivery', async () => {
  const first = await runFamilyReminderSweep('family', now);
  const second = await runFamilyReminderSweep('family', now);
  expect(first.created).toBe(2); expect(first.pushAccepted).toBe(2); expect(first.deliveryConfirmed).toBe(false);
  expect(second.created).toBe(0); expect(second.pushAccepted).toBe(0);
  expect((sendMemberPushNotification as jest.Mock).mock.calls.map((call) => call[1])).toEqual(['angela', 'ade']);
});
it('concurrent dispatcher claims permit only one sender per intent', async () => {
  await Promise.all([runFamilyReminderSweep('family', now), runFamilyReminderSweep('family', now)]);
  expect(records.size).toBe(2);
  expect((sendMemberPushNotification as jest.Mock).mock.calls.map((call) => call[1]).sort()).toEqual(['ade', 'angela']);
});
it('keeps in-app intents without sending to an unclaimed recipient', async () => {
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members.map((member) => ({ ...member, user: null })));
  const result = await runFamilyReminderSweep('family', now);
  expect(result.created).toBe(2); expect(result.unavailable).toBe(2);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});
it('can dispatch an unavailable push later without losing the in-app reminder', async () => {
  (sendMemberPushNotification as jest.Mock).mockResolvedValueOnce({ sent: 0, failed: 0, inactive: 0, configured: false });
  await runFamilyReminderSweep('family', now);
  await runFamilyReminderSweep('family', new Date('2026-10-07T08:00:00Z'));
  expect(records.get(intent.id).metadata.pushStatus).toBe('accepted');
});
it('holds ambiguous sends rather than repeating them', async () => {
  (sendMemberPushNotification as jest.Mock).mockRejectedValue(new Error('outcome unknown'));
  await runFamilyReminderSweep('family', now);
  await runFamilyReminderSweep('family', now);
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(2);
  expect(records.get(intent.id).metadata.pushStatus).toBe('unknown');
});
it('expires outstanding reminders and never pushes after departure/date expiry', async () => {
  await runFamilyReminderSweep('family', now, false);
  await runFamilyReminderSweep('family', new Date('2026-10-09T08:00:00Z'));
  expect(records.get(intent.id).metadata.intentStatus).toBe('expired');
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});
it('cancels outstanding reminders when the trip is cancelled or materially changed', async () => {
  await runFamilyReminderSweep('family', now, false);
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ ...dbEvent, metadata: { ...dbEvent.metadata, status: 'cancelled' } }]);
  await runFamilyReminderSweep('family', now);
  expect(records.get(intent.id).metadata.intentStatus).toBe('cancelled');
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});
it('refuses another member or an unclaimed account acting on the reminder', async () => {
  await reserveReminderIntent('family', intent, now);
  await expect(applyFamilyReminderAction('family', 'ade', intent.id, 'done', undefined, now)).rejects.toMatchObject({ status: 403 });
  await expect(applyFamilyReminderAction('family', '', intent.id, 'done', undefined, now)).rejects.toMatchObject({ status: 403 });
});
it('stores completion independently of read and suppresses later phases for that recipient', async () => {
  await reserveReminderIntent('family', intent, now);
  await applyFamilyReminderAction('family', 'angela', intent.id, 'done', undefined, now);
  expect(records.get(intent.stateId).metadata.resolution).toBe('done');
  expect(records.get(intent.id).actionRequired).toBe(false);
  const result = await runFamilyReminderSweep('family', new Date('2026-10-07T19:00:00Z'), false);
  expect(result.created).toBe(1);
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
});
it('persists snooze across scheduler runs and wakes once without reviving completed work', async () => {
  await reserveReminderIntent('family', intent, now);
  const until = new Date('2026-10-07T09:00:00Z');
  await applyFamilyReminderAction('family', 'angela', intent.id, 'snooze', until, now);
  await runFamilyReminderSweep('family', new Date('2026-10-07T08:00:00Z'));
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
  await runFamilyReminderSweep('family', until);
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(1);
  expect(records.get(intent.id).snoozedUntil).toBeNull();
});
it('rejects snooze beyond expiry and cover actions on preparation', async () => {
  await reserveReminderIntent('family', intent, now);
  await expect(applyFamilyReminderAction('family', 'angela', intent.id, 'snooze', new Date('2026-10-10'), now)).rejects.toMatchObject({ status: 400 });
  await expect(applyFamilyReminderAction('family', 'angela', intent.id, 'cover', undefined, now)).rejects.toMatchObject({ status: 400 });
});
it('snoozes only the selected phase and does not add another phase at the wake tick', async () => {
  await runFamilyReminderSweep('family', now, false);
  const evening = new Date('2026-10-07T19:00:00Z');
  await runFamilyReminderSweep('family', evening, false);
  const selected = [...records.values()].find((record) => record.recipientPersonId === 'angela' && record.metadata.phase === '2026-10-07-20');
  const until = new Date('2026-10-08T07:10:00Z');
  await applyFamilyReminderAction('family', 'angela', selected.id, 'snooze', until, evening);
  const activeAngela = [...records.values()].filter((record) => record.recipientPersonId === 'angela' && record.actionRequired);
  expect(activeAngela).toHaveLength(1);
  (sendMemberPushNotification as jest.Mock).mockClear();
  await runFamilyReminderSweep('family', until);
  expect((sendMemberPushNotification as jest.Mock).mock.calls.filter((call) => call[1] === 'angela')).toHaveLength(1);
  await runFamilyReminderSweep('family', new Date('2026-10-08T07:11:00Z'));
  expect((sendMemberPushNotification as jest.Mock).mock.calls.filter((call) => call[1] === 'angela')).toHaveLength(1);
});
it('details is a checked navigation action, not preparation completion', async () => {
  await reserveReminderIntent('family', intent, now);
  const result = await applyFamilyReminderAction('family', 'angela', intent.id, 'details', undefined, now);
  expect(result).toMatchObject({ url: '/?view=calendar&event=trip', resolution: null });
  expect(records.has(intent.stateId)).toBe(false);
});
it('cancels queued recurring instances when an exception skips them', async () => {
  const recurring = { ...dbEvent, eventDate: new Date('2026-10-01T09:00:00Z'), eventTime: new Date('2026-10-01T09:00:00Z'), recurringPattern: 'weekly', isRecurring: true, exceptions: [] };
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([recurring]);
  await runFamilyReminderSweep('family', now, false);
  const ids = [...records.keys()];
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ ...recurring, exceptions: [{ id: 'skip', eventId: 'trip', seriesDate: '2026-10-08', type: 'skip', overrides: null }] }]);
  await runFamilyReminderSweep('family', now);
  for (const id of ids) expect(records.get(id).metadata.intentStatus).toBe('cancelled');
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
  expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({ where: { familyId: 'family' }, include: { exceptions: true } });
});
it('a pending reminder honors an event-level push opt-out before sending', async () => {
  await runFamilyReminderSweep('family', now, false);
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ ...dbEvent, metadata: { ...dbEvent.metadata, reminderPreferences: { push: false } } }]);
  await runFamilyReminderSweep('family', now);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});
it('validates and acts on explicit travel departure dates different from the calendar anchor', async () => {
  const event = { ...dbEvent, eventDate: new Date('2026-10-01T09:00:00Z'),
    metadata: { travel: { departureDate: '2026-10-08' } } };
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([event]);
  (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(event);
  const result = await runFamilyReminderSweep('family', now, false);
  expect(result.created).toBe(2); expect(result.expired).toBe(0);
  const record = [...records.values()].find((record) => record.recipientPersonId === 'angela');
  await expect(applyFamilyReminderAction('family', 'angela', record.id, 'details', undefined, now))
    .resolves.toMatchObject({ resolution: null });
});
