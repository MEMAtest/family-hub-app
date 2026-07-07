import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { parseCalendarImportText } from '@/utils/calendarImport';
import type { CalendarEvent, Person } from '@/types/calendar.types';

export const runtime = 'nodejs';

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

const isKnownPdfParserWarning = (value: unknown) => {
  const message = value instanceof Error ? value.message : String(value);
  return (
    message.startsWith('Warning: TT:') ||
    message.includes('TT: undefined function') ||
    message.includes('TT: invalid function id') ||
    message.includes('Buffer() is deprecated')
  );
};

const parsePdfQuietly = async (buffer: Buffer) => {
  const originalWarn = console.warn;
  const originalEmitWarning = process.emitWarning;

  console.warn = (...args: unknown[]) => {
    if (args.some(isKnownPdfParserWarning)) return;
    originalWarn(...args);
  };

  process.emitWarning = ((warning: string | Error, ...args: any[]) => {
    if (isKnownPdfParserWarning(warning)) return;
    return originalEmitWarning.call(process, warning as any, ...args);
  }) as typeof process.emitWarning;

  try {
    return await pdf(buffer);
  } finally {
    console.warn = originalWarn;
    process.emitWarning = originalEmitWarning;
  }
};

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
    }

    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parsePdfQuietly(buffer);
    const text = parsed.text?.trim() || '';

    if (!text) {
      return NextResponse.json({ error: 'No selectable text was found in this PDF' }, { status: 422 });
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
      defaultPersonId: typeof formData.get('defaultPersonId') === 'string'
        ? String(formData.get('defaultPersonId'))
        : undefined,
      today: typeof formData.get('today') === 'string'
        ? new Date(String(formData.get('today')))
        : new Date(),
    });

    return NextResponse.json({
      text,
      pages: parsed.numpages,
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
    console.error('Calendar PDF intake error:', error);
    return NextResponse.json({ error: 'Failed to extract calendar events from PDF' }, { status: 500 });
  }
});
