import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { parseCalendarImportText } from '@/utils/calendarImport';
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
    const text = typeof body.text === 'string' ? body.text : '';

    if (!text.trim()) {
      return NextResponse.json({ error: 'Calendar text is required' }, { status: 400 });
    }

    const [events, members] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { familyId },
        orderBy: { eventDate: 'asc' },
      }),
      prisma.familyMember.findMany({
        where: { familyId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const drafts = parseCalendarImportText({
      text,
      people: members.map(mapPerson),
      existingEvents: events.map(mapDbEvent),
      defaultPersonId: typeof body.defaultPersonId === 'string' ? body.defaultPersonId : undefined,
      today: body.today ? new Date(body.today) : new Date(),
    });

    return NextResponse.json({
      drafts,
      summary: {
        total: drafts.length,
        ready: drafts.filter((draft) => draft.importStatus === 'ready').length,
        needsReview: drafts.filter((draft) => draft.importStatus === 'needs_review').length,
        duplicates: drafts.filter((draft) => draft.importStatus === 'duplicate').length,
        conflicts: drafts.filter((draft) => draft.importStatus === 'conflict').length,
      },
    });
  } catch (error) {
    console.error('Calendar intake error:', error);
    return NextResponse.json({ error: 'Failed to parse calendar intake' }, { status: 500 });
  }
});
