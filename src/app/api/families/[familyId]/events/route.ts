import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { buildUtcDateTime, encodeStoredRecurringPattern, mergeCalendarEventMetadata, toCalendarEventResponse, toDateKey, toTimeKey } from '@/lib/calendarEventMapping';
import { getSchoolEventImportMetadata, schoolImportedEventId } from '@/lib/schoolIntakeServer';
import { parseDateKey } from '@/utils/recurrence';

const validEventTime = (time: unknown) => time === undefined ||
  (typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time));

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
      recurring,
      isRecurring,
      notes,
      date,
      time,
      source,
      sourceId,
      googleCalendarId,
      googleEventId,
    } = body;

    if (!validEventTime(time)) return NextResponse.json({ error: 'Event time must be HH:MM' }, { status: 400 });

    if (!await prisma.familyMember.findFirst({ where: { id: personId, familyId }, select: { id: true } })) {
      return NextResponse.json({ error: 'Choose a member of this household' }, { status: 400 });
    }
    let metadata = mergeCalendarEventMetadata(body);
    if (JSON.stringify(metadata).length > 64000) {
      return NextResponse.json({ error: 'Event details are too large' }, { status: 400 });
    }

    if (date && !parseDateKey(date)) {
      return NextResponse.json({ error: 'Event date is invalid' }, { status: 400 });
    }

    const intakeImport = source === 'gmail-school-email' || source === 'calendar-intake';
    if (intakeImport) {
      const trustedMetadata = await getSchoolEventImportMetadata(familyId, sourceId, {
        source, title, personId, date, time, durationMinutes, eventType, location,
      });
      if (!trustedMetadata) return NextResponse.json({ error: 'Calendar intake provenance could not be verified' }, { status: 400 });
      metadata = { ...metadata, ...trustedMetadata };
      if (JSON.stringify(metadata).length > 64000) return NextResponse.json({ error: 'Event details are too large' }, { status: 400 });
    }

    const dateTime = buildUtcDateTime(date, time, eventDateTime);

    if (intakeImport) {
      const existing = await prisma.calendarEvent.findFirst({
        where: { familyId, sourceId, title, eventDate: dateTime, eventTime: dateTime, eventType },
        include: { person: true },
      });
      if (existing && existing.personId !== personId) return NextResponse.json({ error: 'An existing imported event needs assignment repair before another import' }, { status: 409 });
      if (existing) return NextResponse.json(toCalendarEventResponse(existing));
    }

    const importedId = intakeImport ? schoolImportedEventId(familyId, sourceId,
      String((metadata.schoolAssignment as Record<string, unknown>).sourceEventKey), personId) : undefined;
    let event;
    try {
      event = await prisma.calendarEvent.create({
      data: {
        ...(importedId ? { id: importedId } : {}),
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
        recurringPattern: encodeStoredRecurringPattern(recurringPattern ?? recurring, recurringPattern),
        isRecurring: isRecurring || false,
        notes,
        source,
        sourceId,
        googleCalendarId,
        googleEventId,
        metadata,
      },
      include: {
        person: true,
      },
    });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002' || !importedId) throw error;
      event = await prisma.calendarEvent.findFirst({ where: { id: importedId, familyId, sourceId }, include: { person: true } });
      if (!event) throw error;
    }

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
    const { id, date, time, person, type, duration, recurring, recurringPattern, ...rest } = body;

    if (!validEventTime(time)) return NextResponse.json({ error: 'Event time must be HH:MM' }, { status: 400 });

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, familyId },
      select: { id: true, personId: true, eventDate: true, eventTime: true, source: true, sourceId: true, metadata: true },
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
    updateData.metadata = mergeCalendarEventMetadata(body, existing.metadata);
    if (JSON.stringify(updateData.metadata).length > 64000) {
      return NextResponse.json({ error: 'Event details are too large' }, { status: 400 });
    }
    if (date && !parseDateKey(date)) {
      return NextResponse.json({ error: 'Event date is invalid' }, { status: 400 });
    }

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
      if (!await prisma.familyMember.findFirst({ where: { id: person, familyId }, select: { id: true } })) {
        return NextResponse.json({ error: 'Choose a member of this household' }, { status: 400 });
      }
      updateData.personId = person;
      if (existing.sourceId && person !== existing.personId) {
        updateData.metadata.assignmentOverride = { personId: person, changedAt: new Date().toISOString(), changedBy: _authUser.familyMemberId };
      }
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
    if (recurring !== undefined || recurringPattern !== undefined) {
      updateData.recurringPattern = encodeStoredRecurringPattern(recurringPattern ?? recurring, recurringPattern);
      updateData.isRecurring = updateData.recurringPattern !== 'none';
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
