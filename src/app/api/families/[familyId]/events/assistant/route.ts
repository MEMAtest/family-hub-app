import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { runCalendarAssistant } from '@/utils/calendarAssistant';
import type { CalendarEvent, Person } from '@/types/calendar.types';

const toDateKey = (value: Date) => value.toISOString().split('T')[0];

const toTimeKey = (value: Date) => {
  const hours = value.getUTCHours().toString().padStart(2, '0');
  const minutes = value.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const mapDbEvent = (event: any): CalendarEvent => ({
  id: event.id,
  title: event.title,
  person: event.personId,
  date: toDateKey(event.eventDate),
  endDate: undefined,
  time: toTimeKey(event.eventTime),
  duration: event.durationMinutes,
  location: event.location ?? undefined,
  recurring: event.recurringPattern || 'none',
  cost: event.cost || 0,
  type: event.eventType || 'family',
  notes: event.notes ?? undefined,
  isRecurring: event.isRecurring || false,
  priority: 'medium',
  status: 'confirmed',
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
});

const mapPerson = (person: any): Person => ({
  id: person.id,
  name: person.name,
  color: person.color,
  icon: person.icon,
  role: person.role,
});

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const command = typeof body.command === 'string' ? body.command : '';

    if (!command.trim()) {
      return NextResponse.json({ error: 'Assistant command is required' }, { status: 400 });
    }

    const [events, members] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { familyId },
        orderBy: { eventDate: 'asc' },
        take: 500,
      }),
      prisma.familyMember.findMany({
        where: { familyId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const response = runCalendarAssistant({
      command,
      events: events.map(mapDbEvent),
      people: members.map(mapPerson),
      today: body.today ? new Date(body.today) : new Date(),
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Calendar assistant error:', error);
    return NextResponse.json({ error: 'Failed to process calendar assistant request' }, { status: 500 });
  }
});
