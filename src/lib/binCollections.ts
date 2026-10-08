import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { schoolMetadata } from '@/utils/schoolSources';
import { BIN_SOURCE, BROMLEY_ORIGIN, binPropertyId, parseBinCalendar, type BinCollection } from './binCalendar';
import { londonDate } from './familyReminderPlanner';

const KEY = 'integrations.bins.snapshot';
const CACHE_MS = 6 * 60 * 60_000;
const RETRY_MS = 15 * 60_000;
export type BinSnapshot = { status: 'connected' | 'unavailable' | 'not_configured'; collections: BinCollection[];
  checkedAt?: string; sourceUrl?: string; providerName?: string; error?: string };

export async function syncBinCollections(familyId: string, now = new Date()): Promise<BinSnapshot> {
  const profile = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: 'property.profile' } } });
  const propertyId = binPropertyId(schoolMetadata(profile?.data).address);
  if (!propertyId) return { status: 'not_configured', collections: [], error: 'No verified council calendar is connected for this property.' };
  const row = await prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: KEY } } });
  const cached = schoolMetadata(row?.data);
  const age = now.getTime() - Date.parse(cached.attemptedAt);
  if (cached.propertyId === propertyId && age >= 0 && age < (cached.status === 'connected' ? CACHE_MS : RETRY_MS)) {
    return { ...cached, collections: cached.status === 'connected' && Array.isArray(cached.collections)
      ? cached.collections.filter((item: BinCollection) => item.date >= londonDate(now)) : [] } as BinSnapshot;
  }
  const sourceUrl = `${BROMLEY_ORIGIN}/waste/${propertyId}`;
  let collections: BinCollection[];
  try {
    const response = await fetch(`${sourceUrl}/calendar.ics`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000) });
    if (!response.ok || !response.body) throw new Error('Calendar unavailable');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 1_000_000) { await reader.cancel(); throw new Error('Calendar too large'); }
      chunks.push(part.value);
    }
    collections = parseBinCalendar(Buffer.concat(chunks).toString('utf8'), londonDate(now));
  } catch {
    const failed = { status: 'unavailable' as const, collections: [], sourceUrl,
      error: 'Council collection dates could not be checked. No guessed reminders will be sent.' };
    await prisma.familyDocument.upsert({ where: { familyId_key: { familyId, key: KEY } },
      create: { familyId, key: KEY, data: { ...failed, propertyId, attemptedAt: now.toISOString() } },
      update: { data: { ...failed, propertyId, attemptedAt: now.toISOString() }, version: { increment: 1 } } });
    // Hold previously imported bin reminders when the current schedule cannot be verified.
    const previous = await prisma.calendarEvent.findMany({ where: { familyId, source: BIN_SOURCE } });
    for (const event of previous) await prisma.calendarEvent.updateMany({ where: { id: event.id, familyId, metadata: { equals: event.metadata as Prisma.InputJsonValue } },
      data: { metadata: { ...schoolMetadata(event.metadata), binCollection: { ...schoolMetadata(schoolMetadata(event.metadata).binCollection), verified: false } } } });
    return failed;
  }
  const parents = await prisma.familyMember.findMany({ where: { familyId }, orderBy: { id: 'asc' } });
  const adults = parents.filter(member => /parent|adult/i.test(member.role || '') || /adult/i.test(member.ageGroup || ''));
  if (!adults.length) return { status: 'not_configured', collections: [], error: 'A parent profile is needed for household reminders.' };
  const snapshot = { status: 'connected' as const, collections, sourceUrl,
    providerName: 'Bromley Council', checkedAt: now.toISOString() };
  await prisma.$transaction(async db => {
    for (const collection of collections) {
      const id = `council-bins-${createHash('sha256').update(JSON.stringify([familyId, propertyId, collection.date])).digest('hex')}`;
      const previous = await db.calendarEvent.findUnique({ where: { id } });
      const metadata = { ...schoolMetadata(previous?.metadata), calendarTiming: { status: 'unknown' },
        binCollection: { ...collection, sourceUrl, propertyId, verified: true },
        attendees: adults.map(member => member.id), status: schoolMetadata(previous?.metadata).status || 'confirmed' };
      const data = { title: `Bins: ${collection.services.join(' + ')}`, eventDate: new Date(`${collection.date}T00:00:00Z`),
        eventTime: new Date(`${collection.date}T00:00:00Z`), metadata,
        description: 'Council collection day. Put these bins out the evening before. Collection time is not published in the calendar.' };
      await db.calendarEvent.upsert({ where: { id }, create: { id, familyId, personId: adults[0].id,
        ...data, eventType: 'other', source: BIN_SOURCE, sourceId: propertyId, durationMinutes: 0 }, update: data });
    }
    const removed = await db.calendarEvent.findMany({ where: { familyId, source: BIN_SOURCE,
      eventDate: { gte: new Date(`${londonDate(now)}T00:00:00Z`) } } });
    for (const event of removed) if (!collections.some(item => item.date === event.eventDate.toISOString().slice(0, 10))) {
      await db.calendarEvent.update({ where: { id: event.id }, data: { metadata: { ...schoolMetadata(event.metadata),
        binCollection: { ...schoolMetadata(schoolMetadata(event.metadata).binCollection), verified: false } } } });
    }
    await db.familyDocument.upsert({ where: { familyId_key: { familyId, key: KEY } },
      create: { familyId, key: KEY, data: { ...snapshot, propertyId, attemptedAt: now.toISOString() } },
      update: { data: { ...snapshot, propertyId, attemptedAt: now.toISOString() }, version: { increment: 1 } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 });
  return snapshot;
}
