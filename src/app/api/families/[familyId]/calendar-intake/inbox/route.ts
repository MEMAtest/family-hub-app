import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { gmailForwardingAddress } from '@/lib/gmailCalendarServer';
import { getWhatsAppConsentState, getWhatsAppConfig } from '@/lib/whatsappCalendarReminders';
import type { CalendarImportDraft } from '@/utils/calendarImport';
import type { SchoolDocumentSummary } from '@/utils/schoolDocumentSummary';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { schoolMetadata, type SchoolDraft } from '@/utils/schoolSources';
import { isAdultSchoolEvent, isChildProfile } from '@/utils/schoolEventPresentation';
import { schoolDraftKey } from '@/lib/schoolIntakeServer';

const reviewStatuses = ['review_required', 'partial_review', 'no_events', 'needs_ocr', 'content_required'];

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

    const gmailConnection = await prisma.gmailConnection.findUnique({
      where: { familyId },
      select: { enabled: true, googleUserEmail: true, lastSyncAt: true },
    });
    const domain = process.env.CALENDAR_INBOUND_DOMAIN?.trim().toLowerCase();
    const familyKey = family?.familyCode || family?.id || familyId;
    const forwardingAddress = gmailConnection?.enabled
      ? gmailForwardingAddress(gmailConnection.googleUserEmail)
      : domain
        ? `calendar+${familyKey}@${domain}`
        : null;

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
      include: {
        attachments: {
          select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const pending = await prisma.calendarEmailIntake.aggregate({
      where: { familyId, status: { in: ['review_required', 'partial_review', 'needs_ocr', 'content_required'] } },
      _sum: { needsReview: true },
      _count: { id: true },
    });

    return NextResponse.json({
      pendingReviewCount: pending._sum.needsReview ?? 0,
      pendingReviewEmailCount: pending._count.id ?? 0,
      forwardingAddress,
      gmail: {
        connected: Boolean(gmailConnection?.enabled),
        googleUserEmail: gmailConnection?.googleUserEmail || null,
        lastSyncAt: gmailConnection?.lastSyncAt || null,
      },
      whatsappConfigured: Boolean(getWhatsAppConfig()),
      whatsappConsent: await getWhatsAppConsentState(familyId),
      whatsappDeliveryTrackingConfigured: Boolean(
        process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      ),
      intakes: intakes.map((intake) => ({
        id: intake.id,
        sender: intake.sender,
        schoolSource: schoolMetadata(intake.metadata).schoolSource || null,
        sourceDate: schoolMetadata(intake.metadata).sourceDate || null,
        subject: intake.subject,
        recipient: intake.recipient,
        status: intake.status,
        receivedAt: intake.receivedAt,
        autoCreated: intake.autoCreated,
        needsReview: intake.needsReview,
        authenticatedSchoolSender: Boolean(
          intake.metadata && typeof intake.metadata === 'object' && !Array.isArray(intake.metadata) &&
          (intake.metadata as Record<string, unknown>).schoolSenderVerified === true
        ),
        duplicateCount: intake.duplicateCount,
        conflictCount: intake.conflictCount,
        createdEventIds: intake.createdEventIds,
        parsedDrafts: parsedDraftsFromJson(intake.parsedDrafts),
        documentSummary: summaryFromMetadata(intake.metadata),
        attachments: intake.attachments.map((attachment) => ({
          ...attachment,
          downloadUrl: `/api/families/${familyId}/calendar-intake/attachments/${attachment.id}`,
        })),
      })),
    });
  } catch (error) {
    console.error('Calendar intake inbox error:', error);
    return NextResponse.json({ error: 'Failed to load calendar inbox' }, { status: 500 });
  }
});

const reviewSchema = z.object({
  intakeId: z.string().min(1), createdEventIds: z.array(z.string().min(1)).max(200).default([]),
  needsReview: z.number().int().min(0).max(200).optional(), dismissed: z.boolean().optional(),
  assignments: z.array(z.object({ draftId: z.string().min(1), personId: z.string() })).max(200).default([]),
});

export const PATCH = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const body = reviewSchema.parse(await request.json());
    const { intakeId, createdEventIds } = body;

    const intake = await prisma.calendarEmailIntake.findFirst({
      where: { id: intakeId, familyId },
    });
    if (!intake) {
      return NextResponse.json({ error: 'Calendar inbox item was not found' }, { status: 404 });
    }

    const existingCreatedIds = Array.isArray(intake.createdEventIds)
      ? intake.createdEventIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    const drafts = (Array.isArray(intake.parsedDrafts) ? intake.parsedDrafts : []) as unknown as SchoolDraft[];
    const originalDrafts = JSON.parse(JSON.stringify(drafts));
    const metadata = schoolMetadata(intake.metadata);
    const overrides = { ...schoolMetadata(metadata.schoolOverrides) };
    if (body.assignments.length) {
      const members = await prisma.familyMember.findMany({ where: { familyId } });
      for (const assignment of body.assignments) {
        const draft = drafts.find((value) => value.importId === assignment.draftId);
        const person = members.find((member) => member.id === assignment.personId);
        if (!draft || (assignment.personId && !person) ||
            (person && isAdultSchoolEvent(draft.title) && isChildProfile(person))) {
          return NextResponse.json({ error: 'Choose an eligible attendee in this family' }, { status: 400 });
        }
        const key = draft.sourceEventKey || schoolDraftKey(draft);
        const choice = { personId: assignment.personId, actorId: authUser.familyMemberId, at: new Date().toISOString() };
        overrides[key] = choice;
        draft.schoolAssignment = { basis: 'manual', originalPersonId: draft.schoolAssignment?.originalPersonId ?? draft.person,
          sourceKey: draft.schoolAssignment?.sourceKey || metadata.schoolSource?.institution || null, manualOverride: choice };
        draft.person = assignment.personId;
        draft.sourceEventKey = key;
      }
    }
    const eventAssignments = { ...schoolMetadata(metadata.schoolEventAssignments) };
    if (createdEventIds.length) {
      const savedEvents = await prisma.calendarEvent.findMany({ where: { familyId, id: { in: createdEventIds }, sourceId: intake.id } });
      if (savedEvents.length !== new Set(createdEventIds).size) return NextResponse.json({ error: 'Imported events must belong to this intake and family' }, { status: 400 });
      for (const event of savedEvents) {
        const candidates = drafts.filter((draft) => draft.person === event.personId && draft.title === event.title && draft.date === event.eventDate.toISOString().slice(0, 10));
        if (candidates.length === 1) eventAssignments[event.id] = { sourceEventKey: candidates[0].sourceEventKey || schoolDraftKey(candidates[0]),
          personId: event.personId, manualOverride: candidates[0].schoolAssignment?.manualOverride || {
            personId: event.personId, actorId: authUser.familyMemberId, at: new Date().toISOString(),
          } };
      }
    }
    const allCreatedIds = Array.from(new Set([...existingCreatedIds, ...createdEventIds]));
    const needsReview = intake.status === 'content_required' && !body.dismissed
      ? Math.max(1, body.needsReview ?? intake.needsReview) : body.needsReview ?? intake.needsReview;
    const status = body.assignments.length && body.needsReview === undefined && !body.dismissed ? intake.status :
      intake.status === 'content_required' && !body.dismissed ? 'content_required' : needsReview > 0 ? 'partial_review' :
        allCreatedIds.length > 0 ? 'reviewed_imported' : 'reviewed';
    const updated = await prisma.calendarEmailIntake.updateMany({
      where: { id: intake.id, familyId, updatedAt: intake.updatedAt },
      data: { status, createdEventIds: allCreatedIds, needsReview,
        parsedDrafts: drafts as unknown as Prisma.InputJsonValue,
        metadata: { ...metadata, schoolOverrides: overrides, schoolEventAssignments: eventAssignments,
          ...(body.assignments.length ? { schoolOriginalParsedDrafts: metadata.schoolOriginalParsedDrafts || originalDrafts } : {}),
          ...(body.dismissed ? { schoolDismissed: { actorId: authUser.familyMemberId, at: new Date().toISOString() } } : {}),
        } as unknown as Prisma.InputJsonValue },
    });
    if (updated.count !== 1) return NextResponse.json({ error: 'This intake changed. Reload before reviewing.' }, { status: 409 });

    return NextResponse.json({
      id: intake.id, status, createdEventIds: allCreatedIds, parsedDrafts: drafts,
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid intake review request' }, { status: 400 });
    console.error('Calendar intake review update error:', error);
    return NextResponse.json({ error: 'Failed to update calendar inbox item' }, { status: 500 });
  }
});
