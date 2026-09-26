import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { attachmentMetadata, validateCalendarAttachments } from '@/lib/calendarIntakeAttachments';
import { parseCalendarImportText } from '@/utils/calendarImport';
import { summarizeSchoolDocument } from '@/utils/schoolDocumentSummary';
import { Prisma } from '@prisma/client';
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

    const validationError = validateCalendarAttachments([file]);
    if (validationError) {
      const status = file.size > 10 * 1024 * 1024 ? 413 : 400;
      return NextResponse.json({ error: validationError }, { status });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parsePdfQuietly(buffer);
    const text = parsed.text?.trim() || '';
    const documentSummary = summarizeSchoolDocument(text);

    if (!text) {
      const intake = await prisma.calendarEmailIntake.create({
        data: {
          familyId,
          subject: file.name || 'School PDF upload',
          sender: 'School document upload',
          parsedDrafts: [],
          status: 'needs_ocr',
          needsReview: 1,
          metadata: {
            sourceType: 'pdf',
            fileName: file.name || null,
            mimeType: file.type || 'application/pdf',
            sizeBytes: file.size,
            pages: parsed.numpages,
            documentSummary: null,
          } as Prisma.InputJsonValue,
          attachments: {
            create: {
              ...attachmentMetadata(file),
              data: buffer,
            },
          },
        },
        include: { attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } },
      });
      return NextResponse.json({
        code: 'PDF_TEXT_NOT_FOUND',
        error: 'This PDF is image-based, so no selectable text was found. Upload its pages as photos or paste the text instead.',
        intakeId: intake.id,
        attachments: intake.attachments,
      }, { status: 422 });
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

    const intake = await prisma.calendarEmailIntake.create({
      data: {
        familyId,
        subject: file.name || 'School PDF upload',
        sender: 'School document upload',
        text,
        normalizedText: text,
        parsedDrafts: drafts as unknown as Prisma.InputJsonValue,
        status: drafts.length > 0 ? 'review_required' : 'no_events',
        needsReview: drafts.length,
        duplicateCount: drafts.filter((draft) => draft.importStatus === 'duplicate').length,
        conflictCount: drafts.filter((draft) => draft.importStatus === 'conflict').length,
        metadata: {
          sourceType: 'pdf',
          fileName: file.name || null,
          mimeType: file.type || 'application/pdf',
          sizeBytes: file.size,
          pages: parsed.numpages,
          documentSummary,
        } as Prisma.InputJsonValue,
        attachments: {
          create: {
            ...attachmentMetadata(file),
            data: buffer,
          },
        },
      },
      include: { attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } },
    });

    return NextResponse.json({
      text,
      pages: parsed.numpages,
      drafts,
      intakeId: intake.id,
      documentSummary,
      attachments: intake.attachments,
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
