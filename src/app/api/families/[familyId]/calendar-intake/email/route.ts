import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import {
  normalizeCalendarEmailText,
  parseCalendarImportText,
} from '@/utils/calendarImport';
import type { CalendarEvent, Person } from '@/types/calendar.types';

const emailIntakeSchema = z.object({
  subject: z.string().optional().nullable(),
  from: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  html: z.string().optional().nullable(),
  defaultPersonId: z.string().optional().nullable(),
  today: z.string().optional().nullable(),
});

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
  source: event.source ?? undefined,
  sourceId: event.sourceId ?? undefined,
  googleCalendarId: event.googleCalendarId ?? undefined,
  googleEventId: event.googleEventId ?? undefined,
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
    const body = emailIntakeSchema.parse(await request.json());

    if (!body.text?.trim() && !body.html?.trim() && !body.subject?.trim()) {
      return NextResponse.json({ error: 'Email subject, text, or html is required' }, { status: 400 });
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

    const normalizedText = normalizeCalendarEmailText({
      subject: body.subject,
      from: body.from,
      text: body.text,
      html: body.html,
    });

    const drafts = parseCalendarImportText({
      text: normalizedText,
      people: members.map(mapPerson),
      existingEvents: events.map(mapDbEvent),
      defaultPersonId: body.defaultPersonId || undefined,
      today: body.today ? new Date(body.today) : new Date(),
    });

    return NextResponse.json({
      normalizedText,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email intake payload' }, { status: 400 });
    }
    console.error('Calendar email intake error:', error);
    return NextResponse.json({ error: 'Failed to extract calendar events from email' }, { status: 500 });
  }
});
