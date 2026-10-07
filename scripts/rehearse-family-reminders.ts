import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import prisma from '../src/lib/prisma';
import { runFamilyReminderSweep, applyFamilyReminderAction } from '../src/lib/familyReminders';

async function main() {
  const url = new URL(process.env.DATABASE_URL || 'http://invalid');
  assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/family_hub_test', 'This rehearsal requires the isolated local test database.');
  const family = await prisma.family.create({ data: { familyName: '[QA] Reminder rehearsal', familyCode: randomUUID() } });
  let checks = 0;
  try {
    const members = await Promise.all(['Angela', 'Ade'].map((name) => prisma.familyMember.create({ data: {
      familyId: family.id, name, role: 'Parent', ageGroup: 'Adult', color: '#147c72', icon: 'user',
    } })));
    const [angela, ade] = members;
    const event = await prisma.calendarEvent.create({ data: {
      familyId: family.id, personId: angela.id, title: '[QA] Travel', eventType: 'personal',
      eventDate: new Date('2026-10-08T06:00Z'), eventTime: new Date('2026-10-08T06:00Z'),
      metadata: { status: 'confirmed', travel: { departureDate: '2026-10-08', coordinatorPersonIds: [ade.id],
        preparation: [{ id: 'prep', title: 'Confirm preparation', status: 'unknown' }],
        coverage: [{ id: 'cover', title: 'Confirm pickup', status: 'unknown' }] } },
    } });
    const morning = new Date('2026-10-07T07:00Z');
    const first = await runFamilyReminderSweep(family.id, morning, false);
    assert.equal(first.created, 2); checks++;
    assert.equal((await runFamilyReminderSweep(family.id, morning, false)).created, 0); checks++;
    const records = await prisma.notification.findMany({ where: { familyId: family.id, actionRequired: true } });
    assert.equal(new Set(records.map((item) => item.recipientPersonId)).size, 2); checks++;
    const preparation = records.find((item) => item.recipientPersonId === angela.id)!;
    await assert.rejects(() => applyFamilyReminderAction(family.id, ade.id, preparation.id, 'done', undefined, morning), /named recipient/); checks++;
    await applyFamilyReminderAction(family.id, angela.id, preparation.id, 'snooze', new Date('2026-10-07T07:30Z'), morning);
    assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: preparation.id } })).snoozedUntil?.toISOString(), '2026-10-07T07:30:00.000Z'); checks++;
    await runFamilyReminderSweep(family.id, new Date('2026-10-07T07:31Z'), false);
    assert.equal((await prisma.notification.findUniqueOrThrow({ where: { id: preparation.id } })).snoozedUntil, null); checks++;
    await applyFamilyReminderAction(family.id, angela.id, preparation.id, 'done', undefined, new Date('2026-10-07T07:32Z'));
    assert.equal((await runFamilyReminderSweep(family.id, new Date('2026-10-07T19:00Z'), false)).created, 1); checks++;
    await prisma.calendarEvent.update({ where: { id: event.id }, data: { metadata: { ...event.metadata as object, status: 'cancelled' } } });
    await runFamilyReminderSweep(family.id, new Date('2026-10-07T19:01Z'), false);
    assert.equal(await prisma.notification.count({ where: { familyId: family.id, actionRequired: true } }), 0); checks++;
    console.log({ checks, passed: true, closedAppServerSweep: true, externalDeliveryAttempted: false });
  } finally {
    await prisma.family.delete({ where: { id: family.id } });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
