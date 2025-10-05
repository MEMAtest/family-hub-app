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

    return NextResponse.json(events);
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
    const { id, date, time, person, ...rest } = body;

    //  Map UI fields to Prisma columns
    const updateData: any = { ...rest };

    // Map date/time fields
    if (date) {
      const eventDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes));
      }
      updateData.eventDate = eventDate;
      updateData.eventTime = eventDate;
    } else if (body.eventDate) {
      updateData.eventDate = new Date(body.eventDate);
    }

    if (body.eventTime) {
      updateData.eventTime = new Date(body.eventTime);
    }

    // Map person to personId
    if (person) {
      updateData.personId = person;
    } else if (body.personId) {
      updateData.personId = body.personId;
    }

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