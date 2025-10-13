import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all calendar events for a family
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const events = await prisma.calendarEvent.findMany({
      where: {
        familyId: params.familyId,
      },
      include: {
        person: true,
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    // Transform Prisma fields to UI format
    const transformedEvents = events.map(event => ({
      id: event.id,
      familyId: event.familyId,
      person: event.personId, // Map personId → person
      personName: event.person.name,
      title: event.title,
      description: event.description || '',
      date: event.eventDate.toISOString().split('T')[0], // Map eventDate → date (YYYY-MM-DD)
      time: event.eventTime.toTimeString().slice(0, 5), // Map eventTime → time (HH:MM)
      duration: event.durationMinutes || 60, // Map durationMinutes → duration
      location: event.location || '',
      cost: Number(event.cost) || 0,
      type: event.eventType, // Map eventType → type
      recurring: event.recurringPattern || 'none', // Map recurringPattern → recurring
      isRecurring: event.isRecurring || false,
      notes: event.notes || '',
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      // Include any additional fields the UI might expect
      reminders: [],
      attendees: [],
      priority: 'medium' as const,
      status: 'confirmed' as const,
    }));

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST - Create new event
export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
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
        familyId: params.familyId,
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
}

// PUT - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const body = await request.json();
    const { id, date, time, person, type, duration, recurring, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
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

    // Transform response to UI format
    const transformedEvent = {
      id: event.id,
      familyId: event.familyId,
      person: event.personId,
      personName: event.person.name,
      title: event.title,
      description: event.description || '',
      date: event.eventDate.toISOString().split('T')[0],
      time: event.eventTime.toTimeString().slice(0, 5),
      duration: event.durationMinutes || 60,
      location: event.location || '',
      cost: Number(event.cost) || 0,
      type: event.eventType,
      recurring: event.recurringPattern || 'none',
      isRecurring: event.isRecurring || false,
      notes: event.notes || '',
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}