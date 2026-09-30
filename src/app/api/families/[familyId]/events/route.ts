import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { buildUtcDateTime, toCalendarEventResponse, toDateKey, toTimeKey } from '@/lib/calendarEventMapping';
import { isStewartFlemingSender } from '@/utils/schoolEmail';
import { parseDateKey } from '@/utils/recurrence';

const matchesSchoolIntakeDraft = async (
  familyId: string,
  intakeId: string | undefined,
  event: { title?: string; personId?: string; date?: string; time?: string; durationMinutes?: number; eventType?: string; location?: string },
) => {
  if (!intakeId) return false;
  const intake = await prisma.calendarEmailIntake.findFirst({
    where: { id: intakeId, familyId },
    select: { sender: true, metadata: true, parsedDrafts: true },
  });
  const metadata = intake?.metadata;
  if (!intake || !isStewartFlemingSender(intake.sender || '') || !metadata ||
      typeof metadata !== 'object' || Array.isArray(metadata) ||
      (metadata as Record<string, unknown>).schoolSenderVerified !== true || !Array.isArray(intake.parsedDrafts)) {
    return false;
  }
  const draft = intake.parsedDrafts.find((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    return candidate.title === event.title && candidate.date === event.date &&
      (candidate.type || 'other') === (event.eventType || 'other') &&
      String(candidate.location || '') === String(event.location || '');
  });
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return false;
  const candidate = draft as Record<string, unknown>;
  if (candidate.person && candidate.person !== event.personId) return false;
  if (!candidate.person && event.personId) {
    const cohortSpecific = /\b(?:Reception|Year\s+[1-6]|Key\s+Stage\s+[12])\b/i.test(String(candidate.source || ''));
    const member = await prisma.familyMember.findFirst({
      where: {
        id: event.personId,
        familyId,
        ...(cohortSpecific ? {
          AND: [
            { OR: [{ role: { contains: 'student', mode: 'insensitive' } }, { role: { contains: 'child', mode: 'insensitive' } }] },
            { OR: [{ ageGroup: { contains: 'child', mode: 'insensitive' } }, { ageGroup: { contains: 'primary', mode: 'insensitive' } }] },
          ],
        } : {}),
      },
      select: { id: true },
    });
    if (!member) return false;
  }
  const source = String(candidate.source || '');
  const timeSpecified = typeof candidate.timeSpecified === 'boolean'
    ? candidate.timeSpecified
    : /\b\d{1,2}(?::|\.)(\d{2})\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(source);
  const expectedTime = timeSpecified ? candidate.time : '00:00';
  const expectedDuration = timeSpecified
    ? Number(candidate.duration || 60)
    : (() => {
        if (typeof candidate.endDate !== 'string') return 1439;
        const start = new Date(`${String(candidate.date)}T00:00:00Z`).getTime();
        const end = new Date(`${candidate.endDate}T00:00:00Z`).getTime();
        return Math.max(1, Math.floor((end - start) / 86_400_000) + 1) * 1440 - 1;
      })();
  return expectedTime === event.time &&
    expectedDuration === Number(event.durationMinutes || 60);
};

// GET all calendar events for a family
export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const events = await prisma.calendarEvent.findMany({
      where: {
        familyId,
      },
      include: {
        person: true,
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    // Return DB-shape events; clients already normalize into CalendarEvent UI format.
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
});

// POST - Create new event
export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const {
      personId,
      title,
      description,
      eventDateTime,
      durationMinutes,
      location,
      cost,
      eventType,
      recurringPattern,
      isRecurring,
      notes,
      date,
      time,
      source,
      sourceId,
      googleCalendarId,
      googleEventId,
    } = body;

    if (date && !parseDateKey(date)) {
      return NextResponse.json({ error: 'Event date is invalid' }, { status: 400 });
    }

    if (source === 'gmail-school-email' && !(await matchesSchoolIntakeDraft(familyId, sourceId, {
      title,
      personId,
      date,
      time,
      durationMinutes,
      eventType,
      location,
    }))) {
      return NextResponse.json({ error: 'School reminder provenance could not be verified' }, { status: 400 });
    }

    const dateTime = buildUtcDateTime(date, time, eventDateTime);

    if (source === 'gmail-school-email') {
      const existing = await prisma.calendarEvent.findFirst({
        where: { familyId, source, sourceId, personId, title, eventDate: dateTime, eventTime: dateTime, eventType },
        include: { person: true },
      });
      if (existing) return NextResponse.json(toCalendarEventResponse(existing));
    }

    const event = await prisma.calendarEvent.create({
      data: {
        familyId,
        personId,
        title,
        description,
        eventDate: dateTime,
        eventTime: dateTime,
        durationMinutes: durationMinutes || 60,
        location,
        cost: cost || 0,
        eventType,
        recurringPattern: recurringPattern || 'none',
        isRecurring: isRecurring || false,
        notes,
        source,
        sourceId,
        googleCalendarId,
        googleEventId,
      },
      include: {
        person: true,
      },
    });

    return NextResponse.json(toCalendarEventResponse(event));
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
});

// PUT - Update event
export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const { id, date, time, person, type, duration, recurring, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, familyId },
      select: { id: true, eventDate: true, eventTime: true, source: true, sourceId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (rest.source === 'gmail-school-email' && existing.source !== 'gmail-school-email') {
      return NextResponse.json({ error: 'School reminder provenance could not be verified' }, { status: 400 });
    }
    if (existing.source === 'gmail-school-email' && rest.sourceId !== undefined && rest.sourceId !== existing.sourceId) {
      return NextResponse.json({ error: 'School reminder provenance could not be verified' }, { status: 400 });
    }

    // Map UI fields to Prisma columns
    const updateData: any = {};

    // Map date/time fields
    if (date || time) {
      const existingDate = toDateKey(existing.eventDate);
      const existingTime = toTimeKey(existing.eventTime);
      const eventDate = buildUtcDateTime(date || existingDate, time || existingTime);
      updateData.eventDate = eventDate;
      updateData.eventTime = eventDate;
    }

    // Map person to personId
    if (person !== undefined) {
      updateData.personId = person;
    }

    // Map type to eventType
    if (type !== undefined) {
      updateData.eventType = type;
    }

    // Map duration to durationMinutes
    if (duration !== undefined) {
      updateData.durationMinutes = duration;
    }

    // Map recurring to recurringPattern
    if (recurring !== undefined) {
      updateData.recurringPattern = recurring;
      updateData.isRecurring = recurring !== 'none';
    }

    // Include other fields
    if (rest.title) updateData.title = rest.title;
    if (rest.description !== undefined) updateData.description = rest.description;
    if (rest.location !== undefined) updateData.location = rest.location;
    if (rest.cost !== undefined) updateData.cost = rest.cost;
    if (rest.notes !== undefined) updateData.notes = rest.notes;
    if (rest.source !== undefined) updateData.source = rest.source;
    if (rest.sourceId !== undefined) updateData.sourceId = rest.sourceId;
    if (rest.googleCalendarId !== undefined) updateData.googleCalendarId = rest.googleCalendarId;
    if (rest.googleEventId !== undefined) updateData.googleEventId = rest.googleEventId;

    updateData.updatedAt = new Date();

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        person: true,
      },
    });

    return NextResponse.json(toCalendarEventResponse(event));
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
});

// DELETE - Delete event
export const DELETE = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: eventId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
});
