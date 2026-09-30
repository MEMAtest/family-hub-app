import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { aiService } from '@/services/aiService';
import { toDateKey } from '@/lib/calendarEventMapping';

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
      include: { person: { select: { name: true } } },
    });
    if (!event) return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });

    const summary = await aiService.summarizeCalendarEvent({
      title: event.title,
      date: toDateKey(event.eventDate),
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
