import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { gmailForwardingAddress } from '@/lib/gmailCalendarServer';
import { getWhatsAppConsentState, getWhatsAppConfig } from '@/lib/whatsappCalendarReminders';
import type { SchoolDocumentSummary } from '@/utils/schoolDocumentSummary';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { assignSchoolDrafts, schoolMetadata, type SchoolDraft } from '@/utils/schoolSources';
import { isAdultSchoolEvent, isChildProfile } from '@/utils/schoolEventPresentation';
import { loadSchoolRules, resolveStoredSchoolDrafts, schoolDraftKey } from '@/lib/schoolIntakeServer';
import { calendarIntakeState } from '@/lib/calendarIntakeState';
import { autoProcessSavedCalendarIntake, isHighConfidenceAutoCreate, SavedIntakeProcessingError } from '@/lib/calendarEmailIngestion';
import { isStewartFlemingSender } from '@/utils/schoolEmail';
import { grandirPostUrl, grandirOriginalPostLink } from '@/lib/grandirClient';
import { summarizeNurseryNotice } from '@/utils/nurseryNoticeSummary';
import { nurseryPreparationTaskId, saveNurseryPreparation, NurseryPreparationError } from '@/lib/nurseryPreparation';

const reviewStatuses = ['processing', 'review_required', 'partial_review', 'no_events', 'needs_ocr', 'content_required'];

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
    const pending = await prisma.calendarEmailIntake.findMany({
      where: { familyId, status: { in: ['processing', 'review_required', 'partial_review', 'needs_ocr', 'content_required', 'auto_created', 'no_events'] } },
      include: {
        attachments: {
          select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const members = await prisma.familyMember.findMany({ where: { familyId } });
    const { rules } = await loadSchoolRules(familyId, members);
    const intakeIds = Array.from(new Set([...intakes, ...pending].map((intake) => intake.id)));
    const savedEvents = intakeIds.length ? await prisma.calendarEvent.findMany({
      where: { familyId, sourceId: { in: intakeIds } },
    }) : [];
    const nurseryIntakeIds = [...intakes, ...pending].filter(intake =>
      resolveStoredSchoolDrafts(intake, rules, members).source.institution === 'grandir').map(intake => intake.id);
    const nurseryTasks = nurseryIntakeIds.length ? await prisma.calendarTask.findMany({
      where: { familyId, id: { in: nurseryIntakeIds.map(id => nurseryPreparationTaskId(familyId, id)) } },
      select: { id: true, dueDate: true, completedAt: true },
    }) : [];
    const stateFor = (intake: typeof pending[number]) => {
      const resolved = resolveStoredSchoolDrafts(intake, rules, members);
      const trusted = schoolMetadata(intake.metadata).schoolSenderVerified === true && isStewartFlemingSender(intake.sender || '');
      const drafts = resolved.drafts;
      const metadata = schoolMetadata(intake.metadata);
      let nurserySummary = resolved.source.institution === 'grandir' ? summarizeNurseryNotice(
        (intake.text || intake.normalizedText || '').replace(/^Grandir nursery:[^\n]*\n/, ''),
        schoolMetadata(metadata.grandirPortal).hasAttachments === true || Boolean(intake.attachments?.length)) : null;
      const accountNotice = nurserySummary?.title === 'Parent account security notice';
      const nurseryEmailPreview = /\bposted on your Grandir UK wall\b/i.test(intake.text || intake.normalizedText || '');
      if (nurserySummary && !accountNotice && (resolved.source.contentRequired || nurseryEmailPreview)) {
        nurserySummary = { ...nurserySummary, kind: 'content_pending',
          title: 'Nursery notice preview',
          purpose: 'This notification contains a preview. The full nursery post has not been read.',
          actions: ['Open the original nursery post to check its dates and preparation.'], timing: null };
      }
      const preparationTask = nurseryTasks.find(task => task.id === nurseryPreparationTaskId(familyId, intake.id));
      const mappedNurseryChildId = rules.sources.find(source => source.key === 'grandir')?.memberIds.length === 1
        ? rules.sources.find(source => source.key === 'grandir')?.memberIds[0] : null;
      const verifiedChildId = schoolMetadata(metadata.grandirPortal).childMemberId;
      const nurseryChildId = typeof verifiedChildId === 'string' && verifiedChildId !== mappedNurseryChildId
        ? null : mappedNurseryChildId;
      const nurseryStatus = accountNotice && !drafts.length ? 'no_events' :
        nurserySummary?.kind === 'content_pending' ? 'content_required' : intake.status;
      const state = calendarIntakeState({ ...intake, status: ['reviewed', 'reviewed_imported'].includes(intake.status) ? intake.status : nurseryStatus,
        metadata: { ...metadata, nurserySummary,
        nurseryPreparationSaved: Boolean(preparationTask) } }, drafts, savedEvents, (draft) => trusted &&
        !resolved.source.contentRequired && members.some((member) => member.id === draft.person) &&
        isHighConfidenceAutoCreate(resolved.drafts.find((value) => value.importId === draft.importId) || draft,
          { eventSource: 'gmail-school-email', authenticatedSchoolSender: true }));
      return { state, resolved, nurserySummary, nurseryChildId, preparationTask };
    };
    const pendingEntries = pending.map((intake) => ({ intake, ...stateFor(intake) }))
      .filter(({ state }) => state.actionRequired);
    const recentIds = new Set(intakes.map((intake) => intake.id));
    // The reference window must never hide a decision included in the header count.
    const visibleIntakes = [...intakes, ...pendingEntries.filter(({ intake }) => !recentIds.has(intake.id))
      .map(({ intake }) => intake)].sort((a, b) =>
      new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime());

    return NextResponse.json({
      pendingReviewCount: pendingEntries.reduce((sum, { state }) => sum + state.needsReview, 0),
      pendingReviewEmailCount: pendingEntries.length,
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
      intakes: visibleIntakes.map((intake) => {
        const { state, resolved, nurserySummary, nurseryChildId, preparationTask } = stateFor(intake);
        return ({
        id: intake.id,
        sender: intake.sender,
        schoolSource: resolved.source,
        nurserySummary,
        nurseryChildId,
        nurseryAssignmentWarning: nurserySummary && !nurseryChildId ? 'Check the nursery rule and verified child before saving preparation.' : null,
        preparationTask: preparationTask ? { id: preparationTask.id,
          dueDate: preparationTask.dueDate.toISOString().slice(0, 10), completed: Boolean(preparationTask.completedAt) } : null,
        sourceDate: schoolMetadata(intake.metadata).sourceDate || null,
        originalPortalUrl: (() => {
          const portal = schoolMetadata(schoolMetadata(intake.metadata).grandirPortal);
          return typeof portal.postId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(portal.postId) ? grandirPostUrl(portal.postId) :
            resolved.source.institution === 'grandir' ? grandirOriginalPostLink(`${intake.text || ''}\n${intake.html || ''}`) : null;
        })(),
        subject: intake.subject,
        recipient: intake.recipient,
        ...state,
        parsedDrafts: state.outstandingDrafts,
        storedStatus: intake.status,
        receivedAt: intake.receivedAt,
        autoCreated: state.createdEventIds.length,
        authenticatedSchoolSender: Boolean(
          intake.metadata && typeof intake.metadata === 'object' && !Array.isArray(intake.metadata) &&
          (intake.metadata as Record<string, unknown>).schoolSenderVerified === true
        ),
        documentSummary: summaryFromMetadata(intake.metadata),
        attachments: (intake.attachments || []).map((attachment) => ({
          ...attachment,
          downloadUrl: `/api/families/${familyId}/calendar-intake/attachments/${attachment.id}`,
        })),
      }); }),
    });
  } catch (error) {
    console.error('Calendar intake inbox error:', error);
    return NextResponse.json({ error: 'Failed to load calendar inbox' }, { status: 500 });
  }
});

const autoProcessSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('auto-process'), intakeId: z.string().min(1) }).strict(),
  z.object({ action: z.literal('add-nursery-task'), intakeId: z.string().min(1), dueDate: z.string() }).strict(),
]);

export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const body = autoProcessSchema.parse(await request.json());
    if (body.action === 'add-nursery-task') {
      if (request.headers.get('origin') !== request.nextUrl.origin || !request.headers.get('content-type')?.startsWith('application/json')) {
        return NextResponse.json({ error: 'Use the Family Hub nursery preparation controls.' }, { status: 403 });
      }
      return NextResponse.json(await saveNurseryPreparation(familyId, body.intakeId, body.dueDate));
    }
    return NextResponse.json(await autoProcessSavedCalendarIntake(familyId, body.intakeId));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid automatic processing request' }, { status: 400 });
    if (error instanceof SavedIntakeProcessingError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof NurseryPreparationError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (['P2034', 'P2002'].includes((error as { code?: string }).code || '')) {
      return NextResponse.json({ error: 'This intake changed. Reload before processing.' }, { status: 409 });
    }
    console.error('Saved calendar intake processing failed:', error);
    return NextResponse.json({ error: 'Failed to process saved calendar intake' }, { status: 500 });
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
      const { rules } = await loadSchoolRules(familyId, members);
      const resolved = resolveStoredSchoolDrafts(intake, rules, members);
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
        draft.schoolAssignment = assignSchoolDrafts([{ ...draft, sourceEventKey: key }],
          resolved.source, rules, members, overrides)[0].schoolAssignment;
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
    const updatedMetadata = { ...metadata, schoolOverrides: overrides, schoolEventAssignments: eventAssignments,
      ...(body.assignments.length ? { schoolOriginalParsedDrafts: metadata.schoolOriginalParsedDrafts || originalDrafts } : {}),
      ...(body.dismissed ? { schoolDismissed: { actorId: authUser.familyMemberId, at: new Date().toISOString() } } : {}),
    };
    const updated = await prisma.calendarEmailIntake.updateMany({
      where: { id: intake.id, familyId, updatedAt: intake.updatedAt },
      data: { status, createdEventIds: allCreatedIds, needsReview,
        parsedDrafts: drafts as unknown as Prisma.InputJsonValue,
        metadata: updatedMetadata as unknown as Prisma.InputJsonValue },
    });
    if (updated.count !== 1) return NextResponse.json({ error: 'This intake changed. Reload before reviewing.' }, { status: 409 });

    const [savedEvents, members] = await Promise.all([
      prisma.calendarEvent.findMany({ where: { familyId, sourceId: intake.id } }),
      prisma.familyMember.findMany({ where: { familyId } }),
    ]);
    const { rules } = await loadSchoolRules(familyId, members);
    const updatedIntake = { ...intake, status, parsedDrafts: drafts, metadata: updatedMetadata };
    const resolved = resolveStoredSchoolDrafts(updatedIntake, rules, members);
    const trusted = metadata.schoolSenderVerified === true && isStewartFlemingSender(intake.sender || '');
    const state = calendarIntakeState(updatedIntake, resolved.drafts, savedEvents, (draft) => trusted &&
      !resolved.source.contentRequired && members.some((member) => member.id === draft.person) &&
      isHighConfidenceAutoCreate(draft, { eventSource: 'gmail-school-email', authenticatedSchoolSender: true }));
    return NextResponse.json({
      id: intake.id, ...state, storedStatus: status, autoCreated: state.importedEventCount,
      parsedDrafts: state.outstandingDrafts,
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid intake review request' }, { status: 400 });
    console.error('Calendar intake review update error:', error);
    return NextResponse.json({ error: 'Failed to update calendar inbox item' }, { status: 500 });
  }
});
