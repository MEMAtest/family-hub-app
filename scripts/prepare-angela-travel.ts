import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.env.FAMILY_ENV_DIRECTORY || process.cwd());
import { Prisma } from '@prisma/client';
import prisma from '../src/lib/prisma';

const familyId = 'cmg741w2h0000ljcb3f6fo19g';
const eventId = 'cmuem1r120001jw046l3q6dft';
const angelaId = 'cmgcwlx8f0003ljffu9mgmix3';
const adeId = 'cmgcwlx6n0001ljff052249ai';
const object = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

async function main() {
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, familyId, personId: angelaId } });
  const members = await prisma.familyMember.findMany({ where: { familyId, id: { in: [angelaId, adeId] } } });
  if (!event || event.eventDate.toISOString().slice(0, 10) !== '2026-10-08' ||
      !/wedding/i.test(event.title) || !/d.ssel?/i.test(event.location ?? '') ||
      members.find((member) => member.id === angelaId)?.name !== 'Angela' ||
      members.find((member) => member.id === adeId)?.name !== 'Ade') {
    throw new Error('The verified household or trip has changed; no update applied.');
  }
  const previous = object(event.metadata);
  if (previous.travel) {
    console.log('Travel details already exist; preserving them without replacement.');
    return;
  }
  const metadata = {
    ...previous,
    workStatus: { ...object(previous.workStatus), type: 'travel', affectsPickup: true },
    travel: {
      destination: event.location?.trim(), departureDate: '2026-10-08',
      coordinatorPersonIds: [adeId],
      preparation: [{ id: 'trip-preparation', title: 'Confirm travel details and preparation', status: 'unknown' }],
      coverage: [{ id: 'pickup-cover', title: 'Confirm childcare and school or nursery pickup cover', status: 'unknown' }],
    },
    reminderPreferences: { enabled: true, push: true, ...object(previous.reminderPreferences) },
    travelSetupAudit: { actor: 'approved-family-planning-release', at: new Date().toISOString(),
      reason: 'User confirmed Angela travels on 8 October. Event time is not a confirmed departure.' },
  };
  console.log({ eventId, titlePreserved: event.title, datePreserved: event.eventDate,
    timePreserved: event.eventTime, departureTime: 'unknown', returnDate: 'unknown',
    traveller: 'Angela', coverageRecipient: 'Ade', assumedAcceptance: false,
    apply: process.argv.includes('--apply') });
  if (!process.argv.includes('--apply')) return;
  const result = await prisma.calendarEvent.updateMany({
    where: { id: eventId, familyId, personId: angelaId, updatedAt: event.updatedAt },
    data: { metadata: metadata as Prisma.InputJsonObject },
  });
  if (result.count !== 1) throw new Error('Trip changed during preparation; refresh and retry.');
  const saved = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (object(saved?.metadata).travel?.departureTime || saved?.title !== event.title ||
      saved?.eventTime.toISOString() !== event.eventTime.toISOString()) throw new Error('Travel verification failed.');
  console.log('Saved and reloaded. Original event identity, title and times retained; no notification sent by this script.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
