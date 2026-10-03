import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { aiService } from '@/services/aiService';
import { toCalendarEventResponse, toDateKey } from '@/lib/calendarEventMapping';
import { expandEvents, parseDateKey, type RecurrenceException } from '@/utils/recurrence';

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    if (typeof body.eventId !== 'string' || !body.eventId.trim()) {
      return NextResponse.json({ error: 'An event id is required' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Calendar summaries are temporarily unavailable.' }, { status: 503 });
    }

    const event = await prisma.calendarEvent.findFirst({
      where: { id: body.eventId, familyId },
      include: { person: { select: { name: true } }, exceptions: true },
    });
    if (!event) return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });

    const requestedDate = body.occurrenceDate ?? toDateKey(event.eventDate);
    if (typeof requestedDate !== 'string' || !parseDateKey(requestedDate)) {
      return NextResponse.json({ error: 'A valid event date is required' }, { status: 400 });
    }
    const occurrence = expandEvents(
      [toCalendarEventResponse(event)],
      requestedDate,
      requestedDate,
      event.exceptions as unknown as RecurrenceException[],
    ).find((candidate) => candidate.date === requestedDate);
    if (!occurrence) {
      return NextResponse.json({ error: 'That date is not part of this event series' }, { status: 400 });
    }

    const summary = await aiService.summarizeCalendarEvent({
      title: event.title,
      date: occurrence.date,
      personName: event.person?.name ?? 'Family',
      location: event.location ?? undefined,
      notes: event.notes ?? undefined,
    });
    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error('Calendar AI summary failed:', error);
    return NextResponse.json({ error: 'Could not generate the event summary. Try again.' }, { status: 503 });
  }
});
