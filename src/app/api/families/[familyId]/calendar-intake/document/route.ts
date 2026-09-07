import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import {
  attachmentMetadata,
  extensionForMimeType,
  validateCalendarAttachments,
} from '@/lib/calendarIntakeAttachments';
import { parseCalendarImportText } from '@/utils/calendarImport';
import { summarizeSchoolDocument } from '@/utils/schoolDocumentSummary';
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

const parsePdf = async (file: File) => {
  const parsed = await pdf(Buffer.from(await file.arrayBuffer()));
  return { text: parsed.text?.trim() || '', pages: parsed.numpages };
};

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll('file').filter((value): value is File => value instanceof File);
    const validationError = validateCalendarAttachments(files);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const fileKinds = files.map(extensionForMimeType);
    let text = typeof formData.get('extractedText') === 'string'
      ? String(formData.get('extractedText')).trim()
      : '';
    let pages = files.length;
    const sourceType = typeof formData.get('sourceType') === 'string'
      ? String(formData.get('sourceType'))
      : fileKinds[0] || 'document';
    const sourceName = typeof formData.get('sourceName') === 'string'
      ? String(formData.get('sourceName'))
      : files.length === 1 ? files[0].name : `${files.length} school pages`;

    if (fileKinds[0] === 'pdf') {
      const parsed = await parsePdf(files[0]);
      text = parsed.text;
      pages = parsed.pages;
    }

    if (!text) {
      const intake = await prisma.calendarEmailIntake.create({
        data: {
          familyId,
          subject: sourceName || 'School document upload',
          sender: 'School document upload',
          parsedDrafts: [],
          status: 'needs_ocr',
          needsReview: 1,
          metadata: {
            sourceType,
            fileName: sourceName,
            fileCount: files.length,
            pages,
            documentSummary: null,
          } as Prisma.InputJsonValue,
          attachments: {
            create: await Promise.all(files.map(async (file) => ({
              ...attachmentMetadata(file),
              data: Buffer.from(await file.arrayBuffer()),
            }))),
          },
        },
        include: { attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } },
      });
      return NextResponse.json({
        code: fileKinds[0] === 'pdf' ? 'PDF_TEXT_NOT_FOUND' : 'IMAGE_TEXT_NOT_FOUND',
        error: fileKinds[0] === 'pdf'
          ? 'This PDF is image-based, so no selectable text was found. Upload its pages as photos or paste the text instead.'
          : 'No readable text was found in those pages. Try clearer photos or paste the newsletter text.',
        intakeId: intake.id,
        attachments: intake.attachments,
      }, { status: 422 });
    }

    const [events, members] = await Promise.all([
      prisma.calendarEvent.findMany({ where: { familyId }, orderBy: { eventDate: 'asc' } }),
      prisma.familyMember.findMany({ where: { familyId }, orderBy: { createdAt: 'asc' } }),
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
    const documentSummary = summarizeSchoolDocument(text);
    const intake = await prisma.calendarEmailIntake.create({
      data: {
        familyId,
        subject: sourceName || 'School document upload',
        sender: 'School document upload',
        text,
        normalizedText: text,
        parsedDrafts: drafts as unknown as Prisma.InputJsonValue,
        status: drafts.length > 0 ? 'review_required' : 'no_events',
        needsReview: drafts.length,
        duplicateCount: drafts.filter((draft) => draft.importStatus === 'duplicate').length,
        conflictCount: drafts.filter((draft) => draft.importStatus === 'conflict').length,
        metadata: {
          sourceType,
          fileName: sourceName,
          fileCount: files.length,
          pages,
          documentSummary,
        } as Prisma.InputJsonValue,
        attachments: {
          create: await Promise.all(files.map(async (file) => ({
            ...attachmentMetadata(file),
            data: Buffer.from(await file.arrayBuffer()),
          }))),
        },
      },
      include: { attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } },
    });

    return NextResponse.json({
      text,
      pages,
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
    console.error('Calendar document intake error:', error);
    return NextResponse.json({ error: 'Failed to save and extract the school document' }, { status: 500 });
  }
});
