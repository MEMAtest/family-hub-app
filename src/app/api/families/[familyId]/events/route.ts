import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

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
    } = body;

    // Parse the combined eventDateTime ISO string
    const dateTime = new Date(eventDateTime);

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
      },
      include: {
        person: true,
      },
    });

    return NextResponse.json(event);
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
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Map UI fields to Prisma columns
    const updateData: any = {};

    // Map date/time fields
    if (date) {
      const eventDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      updateData.eventDate = eventDate;
      updateData.eventTime = eventDate;
    }

    // Map person to personId
    if (person) {
      updateData.personId = person;
    }

    // Map type to eventType
    if (type) {
      updateData.eventType = type;
    }

    // Map duration to durationMinutes
    if (duration !== undefined) {
      updateData.durationMinutes = duration;
    }

    // Map recurring to recurringPattern
    if (recurring) {
      updateData.recurringPattern = recurring;
      updateData.isRecurring = recurring !== 'none';
    }

    // Include other fields
    if (rest.title) updateData.title = rest.title;
    if (rest.description !== undefined) updateData.description = rest.description;
    if (rest.location !== undefined) updateData.location = rest.location;
    if (rest.cost !== undefined) updateData.cost = rest.cost;
    if (rest.notes !== undefined) updateData.notes = rest.notes;

    updateData.updatedAt = new Date();

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        person: true,
      },
    });

    return NextResponse.json(event);
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
