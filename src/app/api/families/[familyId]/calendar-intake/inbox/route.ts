import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import type { CalendarImportDraft } from '@/utils/calendarImport';
import type { SchoolDocumentSummary } from '@/utils/schoolDocumentSummary';

const reviewStatuses = ['review_required', 'partial_review', 'no_events'];

const parsedDraftsFromJson = (value: unknown): CalendarImportDraft[] =>
  Array.isArray(value) ? (value as CalendarImportDraft[]) : [];

const summaryFromMetadata = (value: unknown): SchoolDocumentSummary | null => {
  if (!value || typeof value !== 'object') return null;
  const summary = (value as { documentSummary?: unknown }).documentSummary;
  return summary && typeof summary === 'object' ? summary as SchoolDocumentSummary : null;
};

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { id: true, familyCode: true },
    });

    const domain = process.env.CALENDAR_INBOUND_DOMAIN?.trim().toLowerCase();
    const familyKey = family?.familyCode || family?.id || familyId;
    const forwardingAddress = domain ? `calendar+${familyKey}@${domain}` : null;

    const intakes = await prisma.calendarEmailIntake.findMany({
      where: {
        familyId,
        OR: [
          { status: { in: reviewStatuses } },
          { receivedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: { receivedAt: 'desc' },
      take: 12,
    });

    return NextResponse.json({
      forwardingAddress,
      intakes: intakes.map((intake) => ({
        id: intake.id,
        sender: intake.sender,
        subject: intake.subject,
        recipient: intake.recipient,
        status: intake.status,
        receivedAt: intake.receivedAt,
        autoCreated: intake.autoCreated,
        needsReview: intake.needsReview,
        duplicateCount: intake.duplicateCount,
        conflictCount: intake.conflictCount,
        createdEventIds: intake.createdEventIds,
        parsedDrafts: parsedDraftsFromJson(intake.parsedDrafts),
        documentSummary: summaryFromMetadata(intake.metadata),
      })),
    });
  } catch (error) {
    console.error('Calendar intake inbox error:', error);
    return NextResponse.json({ error: 'Failed to load calendar inbox' }, { status: 500 });
  }
});

export const PATCH = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const intakeId = typeof body.intakeId === 'string' ? body.intakeId : '';
    const createdEventIds = Array.isArray(body.createdEventIds)
      ? body.createdEventIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    if (!intakeId) {
      return NextResponse.json({ error: 'intakeId is required' }, { status: 400 });
    }

    const intake = await prisma.calendarEmailIntake.findFirst({
      where: { id: intakeId, familyId },
      select: { id: true, createdEventIds: true },
    });
    if (!intake) {
      return NextResponse.json({ error: 'Calendar inbox item was not found' }, { status: 404 });
    }

    const existingCreatedIds = Array.isArray(intake.createdEventIds)
      ? intake.createdEventIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    const updated = await prisma.calendarEmailIntake.update({
      where: { id: intake.id },
      data: {
        status: createdEventIds.length > 0 ? 'reviewed_imported' : 'reviewed',
        createdEventIds: Array.from(new Set([...existingCreatedIds, ...createdEventIds])),
        needsReview: 0,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      createdEventIds: updated.createdEventIds,
    });
  } catch (error) {
    console.error('Calendar intake review update error:', error);
    return NextResponse.json({ error: 'Failed to update calendar inbox item' }, { status: 500 });
  }
});
