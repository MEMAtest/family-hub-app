import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { annotateCalendarImportDrafts, parseCalendarImportText, type CalendarImportDraft } from '@/utils/calendarImport';
import { summarizeSchoolDocument } from '@/utils/schoolDocumentSummary';
import { assignSchoolDrafts, initialSchoolRules, resolveSchoolSource, schoolMetadata, SCHOOL_RULES_KEY,
  validateSchoolRules, schoolSavedEventAttendance, type SchoolDraft, type SchoolMember, type SchoolRules } from '@/utils/schoolSources';
import { importDraftToCalendarEventDraft } from '@/utils/calendarImport';
import { isStewartFlemingSender } from '@/utils/schoolEmail';
import { isAdultSchoolEvent, schoolEventTitle } from '@/utils/schoolEventPresentation';

/** Main's events POST uses this for both trusted school mail and ordinary linked intake imports. */
export type SchoolEventImportInput = {
  title?: string; personId?: string; date?: string; time?: string; durationMinutes?: number;
  eventType?: string; location?: string; source?: string;
};
export const getSchoolEventImportMetadata = async (familyId: string, intakeId: string | undefined,
  event: SchoolEventImportInput): Promise<Record<string, unknown> | null> => {
  if (!intakeId || !event.personId) return null;
  const intake = await prisma.calendarEmailIntake.findFirst({ where: { id: intakeId, familyId } });
  if (!intake || intake.status === 'content_required') return null;
  const metadata = schoolMetadata(intake.metadata);
  if (event.source === 'gmail-school-email' &&
      (metadata.schoolSenderVerified !== true || !isStewartFlemingSender(intake.sender || ''))) return null;
  const members = await prisma.familyMember.findMany({ where: { familyId } });
  if (!members.some((member) => member.id === event.personId)) return null;
  const { rules } = await loadSchoolRules(familyId, members);
  const resolved = resolveStoredSchoolDrafts(intake, rules, members);
  if (resolved.source.contentRequired) return null;
  const matched = resolved.drafts.find((draft) => {
    if (isAdultSchoolEvent(draft.title) && draft.schoolAssignment?.attendeeStatus !== 'confirmed') return false;
    const candidate = importDraftToCalendarEventDraft(draft);
    return candidate.person === event.personId && schoolEventTitle(candidate.title) === schoolEventTitle(event.title || '') && candidate.date === event.date &&
      candidate.time === event.time && candidate.duration === Number(event.durationMinutes || 60) &&
      candidate.type === (event.eventType || 'other') && String(candidate.location || '') === String(event.location || '');
  });
  return matched ? schoolEventMetadata(matched, { ...intake, metadata: { ...metadata, schoolSource: resolved.source } }) : null;
};

export const validateSchoolEventImport = async (familyId: string, intakeId: string | undefined,
  event: SchoolEventImportInput) => Boolean(await getSchoolEventImportMetadata(familyId, intakeId, event));

export const loadSchoolRules = async (familyId: string, members: SchoolMember[], persist = false, db = prisma) => {
  let row = await db.familyDocument.findUnique({ where: { familyId_key: { familyId, key: SCHOOL_RULES_KEY } } });
  if (!row && persist) {
    try {
      row = await db.familyDocument.create({ data: {
        familyId, key: SCHOOL_RULES_KEY, data: initialSchoolRules(members) as unknown as Prisma.InputJsonValue,
      } });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      row = await db.familyDocument.findUnique({ where: { familyId_key: { familyId, key: SCHOOL_RULES_KEY } } });
    }
  }
  return { rules: row ? validateSchoolRules(row.data, members) : initialSchoolRules(members), version: row?.version || 0 };
};

export const schoolDraftKey = (draft: CalendarImportDraft) => createHash('sha256').update(JSON.stringify([
  draft.sourceLine, draft.source, draft.title, draft.date, draft.endDate || '',
])).digest('hex');

export const schoolImportedEventId = (familyId: string, intakeId: string, sourceEventKey: string, personId: string) =>
  `mail_event_${createHash('sha256').update(JSON.stringify([familyId, intakeId, sourceEventKey, personId])).digest('hex')}`;

export const schoolEventMetadata = (draft: SchoolDraft, intake: {
  id: string; sender?: string | null; receivedAt?: Date | string; metadata?: unknown;
}) => {
  const metadata = schoolMetadata(intake.metadata);
  const source = schoolMetadata(metadata.schoolSource);
  return {
    schoolProvenance: {
      intakeId: intake.id, institutionKey: source.institution || null, institutionName: source.institutionName || null,
      sender: intake.sender || source.transportSender || null, originalSenderClaim: source.originalSenderClaim || null,
      sourceDate: metadata.sourceDate || null, receivedAt: intake.receivedAt ? new Date(intake.receivedAt).toISOString() : null,
      links: Array.isArray(source.links) ? source.links : [], senderVerified: metadata.schoolSenderVerified === true,
      concernedMemberIds: draft.schoolAssignment?.concernedMemberIds || [],
    },
    schoolAssignment: { ...draft.schoolAssignment, sourceEventKey: draft.sourceEventKey || schoolDraftKey(draft) },
  };
};

type SavedSchoolEvent = {
  id: string; sourceId: string | null; title: string; personId: string; eventDate: Date; metadata?: unknown; familyId?: string;
};
type SavedSchoolIntake = Parameters<typeof resolveStoredSchoolDrafts>[0] & {
  id: string; familyId: string; receivedAt?: Date | string;
};

const hasUsableSchoolDrafts = (intake: SavedSchoolIntake) => !Array.isArray(intake.parsedDrafts) ||
  intake.parsedDrafts.every((value) => {
    const draft = schoolMetadata(value);
    return ['importId', 'title', 'person', 'date', 'source'].every((key) => typeof draft[key] === 'string') &&
      (!draft.warnings || Array.isArray(draft.warnings));
  });

const deriveSavedSchoolEventMetadata = (familyId: string, event: SavedSchoolEvent, intake: SavedSchoolIntake,
  members: SchoolMember[], rules: SchoolRules, resolved = resolveStoredSchoolDrafts(intake, rules, members)) => {
  if (intake.familyId !== familyId || event.sourceId !== intake.id) return null;
  if (typeof event.title !== 'string' || !(event.eventDate instanceof Date) || !Number.isFinite(event.eventDate.getTime())) return null;
  if (!resolved.source.institution) return null;
  const date = event.eventDate.toISOString().slice(0, 10);
  const candidates = resolved.drafts.filter((draft) => draft.date === date &&
    schoolEventTitle(draft.title).toLowerCase() === schoolEventTitle(event.title).toLowerCase());
  let draft: SchoolDraft;
  if (candidates.length === 1) draft = candidates[0];
  else if (isAdultSchoolEvent(event.title)) {
    draft = assignSchoolDrafts([{ importId: event.id, title: event.title, person: event.personId, date,
      time: '00:00', duration: 60, recurring: 'none', cost: 0, type: 'education', isRecurring: false,
      priority: 'medium', status: 'confirmed', confidence: 0, source: event.title, sourceLine: 0,
      importStatus: 'needs_review', warnings: [] }], resolved.source, rules, members)[0];
  } else return null;
  const trusted = schoolEventMetadata(draft, { ...intake, metadata: { ...schoolMetadata(intake.metadata), schoolSource: resolved.source } });
  const saved = schoolMetadata(event.metadata);
  const existingAssignment = schoolMetadata(saved.schoolAssignment);
  const explicit = saved.assignmentOverride || saved.manualAssignmentOverride || existingAssignment.manualOverride ||
    (existingAssignment.basis === 'manual' ? existingAssignment : null);
  const display = schoolSavedEventAttendance({ ...event, metadata: {
    ...saved, ...(explicit ? { manualAssignmentOverride: explicit } : {}),
    schoolAssignment: { ...existingAssignment, ...trusted.schoolAssignment },
  } }, members);
  // A named source attendee must agree with the stored member; a legacy child/default is not attendance evidence.
  const attendance = explicit ? display : trusted.schoolAssignment.attendeePersonId === event.personId
    ? display : { attendeePersonId: null, attendeeStatus: 'needs_confirmation' as const };
  return { ...trusted, schoolAssignment: { ...trusted.schoolAssignment,
    ...(explicit ? { basis: 'manual', manualOverride: existingAssignment.manualOverride,
      assignmentOverride: saved.assignmentOverride } : {}), ...attendance } };
};

/** Read-only, family-scoped enrichment for historical imports. Stored ownership and manual decisions are untouched. */
export const getSavedSchoolEventMetadata = async (familyId: string, event: SavedSchoolEvent, intake: SavedSchoolIntake) => {
  if (intake.familyId !== familyId || event.sourceId !== intake.id || !hasUsableSchoolDrafts(intake)) return null;
  const members = await prisma.familyMember.findMany({ where: { familyId } });
  const { rules } = await loadSchoolRules(familyId, members);
  return deriveSavedSchoolEventMetadata(familyId, event, intake, members, rules);
};

/** Three family-scoped reads for the whole batch, never a member/rules/intake query per event. */
export const enrichSavedSchoolEventResponses = async <T extends SavedSchoolEvent>(familyId: string, events: T[], db = prisma): Promise<T[]> => {
  const candidates = events.filter((event) => typeof event.sourceId === 'string' && event.sourceId &&
    typeof event.title === 'string' && event.eventDate instanceof Date && Number.isFinite(event.eventDate.getTime()) &&
    (event.familyId === undefined || event.familyId === familyId));
  if (!candidates.length) return events;
  const intakeIds = Array.from(new Set(candidates.map((event) => event.sourceId!)));
  const members = await db.familyMember.findMany({ where: { familyId } });
  const { rules } = await loadSchoolRules(familyId, members, false, db);
  const intakes = await db.calendarEmailIntake.findMany({ where: { familyId, id: { in: intakeIds } }, select: {
    id: true, familyId: true, subject: true, sender: true, receivedAt: true, metadata: true,
    text: true, html: true, normalizedText: true, parsedDrafts: true,
  } });
  const resolvedById = new Map(intakes.filter((intake) => intake.familyId === familyId && hasUsableSchoolDrafts(intake)).map((intake) => [intake.id, {
    intake, resolved: resolveStoredSchoolDrafts(intake, rules, members),
  }]));
  const candidateIds = new Set(candidates.map((event) => event.id));
  return events.map((event) => {
    if (!candidateIds.has(event.id)) return event;
    const entry = resolvedById.get(event.sourceId!);
    if (!entry) return event;
    const trusted = deriveSavedSchoolEventMetadata(familyId, event, entry.intake, members, rules, entry.resolved);
    if (!trusted) return event;
    const metadata = schoolMetadata(event.metadata);
    return { ...event, metadata: { ...metadata, ...trusted,
      schoolAssignment: { ...schoolMetadata(metadata.schoolAssignment), ...trusted.schoolAssignment },
    } };
  });
};

export const prepareSchoolIntake = async (input: {
  familyId: string; members: SchoolMember[]; text: string; rawText?: string; html?: string; sender?: string;
  subject?: string; existingEvents?: any[]; today?: Date; defaultPersonId?: string;
}) => {
  const { rules, version } = await loadSchoolRules(input.familyId, input.members, true);
  const source = resolveSchoolSource({ sender: input.sender, subject: input.subject,
    text: input.rawText ?? input.text, html: input.html }, rules);
  const parsed = source.contentRequired ? [] : parseCalendarImportText({ text: input.text, people: input.members as any,
    existingEvents: [], today: input.today,
    defaultPersonId: source.isSchool ? '' : input.defaultPersonId });
  const assigned = assignSchoolDrafts(parsed.map((draft) => ({ ...draft, sourceEventKey: schoolDraftKey(draft) })), source, rules, input.members);
  const drafts = annotateCalendarImportDrafts(assigned, input.existingEvents || []) as SchoolDraft[];
  return { drafts, source, metadata: { schoolSource: source, schoolRulesVersion: version,
    schoolParserVersion: 1, documentSummary: summarizeSchoolDocument(input.rawText ?? input.text) },
    status: source.contentRequired ? 'content_required' : drafts.length ? 'review_required' : 'no_events' };
};

export const resolveStoredSchoolDrafts = (intake: { parsedDrafts: unknown; metadata: unknown; sender?: string | null;
  subject?: string | null; text?: string | null; normalizedText?: string | null; html?: string | null },
rules: SchoolRules, members: SchoolMember[]) => {
  const metadata = schoolMetadata(intake.metadata);
  const source = resolveSchoolSource({ ...intake, text: intake.text || intake.normalizedText }, rules);
  const drafts = (Array.isArray(intake.parsedDrafts) ? intake.parsedDrafts : []) as SchoolDraft[];
  return { source, drafts: assignSchoolDrafts(drafts.map((draft) => ({ ...draft,
    sourceEventKey: draft.sourceEventKey || schoolDraftKey(draft) })), source, rules, members, schoolMetadata(metadata.schoolOverrides)) };
};
