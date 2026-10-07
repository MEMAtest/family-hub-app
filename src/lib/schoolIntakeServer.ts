import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { annotateCalendarImportDrafts, parseCalendarImportText, type CalendarImportDraft } from '@/utils/calendarImport';
import { summarizeSchoolDocument } from '@/utils/schoolDocumentSummary';
import { assignSchoolDrafts, initialSchoolRules, resolveSchoolSource, schoolMetadata, SCHOOL_RULES_KEY,
  validateSchoolRules, type SchoolDraft, type SchoolMember, type SchoolRules } from '@/utils/schoolSources';
import { importDraftToCalendarEventDraft } from '@/utils/calendarImport';
import { isStewartFlemingSender } from '@/utils/schoolEmail';
import { schoolEventTitle } from '@/utils/schoolEventPresentation';

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
    },
    schoolAssignment: { ...draft.schoolAssignment, sourceEventKey: draft.sourceEventKey || schoolDraftKey(draft) },
  };
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
