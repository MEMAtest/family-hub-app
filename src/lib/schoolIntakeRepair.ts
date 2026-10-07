import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { loadSchoolRules, resolveStoredSchoolDrafts, schoolEventMetadata } from './schoolIntakeServer';
import { schoolMetadata, SCHOOL_RULES_KEY, type SchoolDraft } from '@/utils/schoolSources';
import { schoolEventTitle } from '@/utils/schoolEventPresentation';

export const hasManualSchoolAssignment = (metadata: unknown) => {
  const value = schoolMetadata(metadata);
  return Boolean(value.manualAssignmentOverride || value.assignmentOverride || value.schoolAssignment?.manualOverride ||
    value.schoolAssignment?.basis === 'manual' || value.assignment?.basis === 'manual');
};

export class SchoolRepairConflict extends Error {}

export const buildSchoolRepairPlan = async (familyId: string, intakeIds?: string[], afterId?: string, db = prisma) => {
  const members = await db.familyMember.findMany({ where: { familyId } });
  const { rules, version } = await loadSchoolRules(familyId, members, false, db);
  const rows = await db.calendarEmailIntake.findMany({ where: { familyId,
    ...(intakeIds ? { id: { in: intakeIds } } : afterId ? { id: { gt: afterId } } : {}) }, orderBy: { id: 'asc' }, take: 51 });
  const intakes = rows.slice(0, 50);
  const plans = [];
  for (const intake of intakes) {
    const metadata = schoolMetadata(intake.metadata);
    const resolved = resolveStoredSchoolDrafts(intake, rules, members);
    const original = (Array.isArray(intake.parsedDrafts) ? intake.parsedDrafts : []) as unknown as SchoolDraft[];
    const importedDrafts = Array.isArray(metadata.schoolOriginalParsedDrafts)
      ? metadata.schoolOriginalParsedDrafts as SchoolDraft[] : original;
    const createdIds = Array.isArray(intake.createdEventIds) ? intake.createdEventIds.filter((id): id is string => typeof id === 'string') : [];
    const events = await db.calendarEvent.findMany({ where: { familyId,
      OR: [{ sourceId: intake.id }, ...(createdIds.length ? [{ id: { in: createdIds } }] : [])] }, orderBy: { id: 'asc' } });
    const draftChanges = resolved.drafts.flatMap((draft, index) => draft.person !== original[index]?.person
      ? [{ draftId: draft.importId, sourceEventKey: draft.sourceEventKey!, title: draft.title,
        originalPersonId: draft.schoolAssignment?.originalPersonId || '', beforePersonId: original[index]?.person || '',
        afterPersonId: draft.person, sourceKey: resolved.source.institution }] : []);
    const eventChanges = events.flatMap((event) => {
      if (hasManualSchoolAssignment((event as any).metadata) || hasManualSchoolAssignment(metadata.schoolEventAssignments?.[event.id])) return [];
      const candidates = resolved.drafts.filter((draft) =>
        schoolEventTitle(draft.title).toLowerCase() === schoolEventTitle(event.title).toLowerCase() &&
        draft.date === event.eventDate.toISOString().slice(0, 10));
      if (candidates.length !== 1 || !candidates[0].person || candidates[0].schoolAssignment?.basis === 'manual') return [];
      const draft = candidates[0];
      if (event.personId === draft.person) return [];
      const importedChoice = importedDrafts.find((value) => value.importId === draft.importId)?.person;
      // A differing saved choice is a legacy manual override, not an imported default to repair.
      if (importedChoice && event.personId !== importedChoice) return [];
      return [{ eventId: event.id, sourceEventKey: draft.sourceEventKey!, title: event.title,
        beforePersonId: event.personId, afterPersonId: draft.person, sourceKey: resolved.source.institution,
        requiresApproval: true, googleExportPending: Boolean(event.googleEventId) }];
    });
    plans.push({ intake, events, source: resolved.source, drafts: resolved.drafts, metadata, draftChanges, eventChanges });
  }
  const planHash = createHash('sha256').update(JSON.stringify({ familyId, version, rules,
    plans: plans.map(({ intake, events, drafts, source }) => ({ intake, events, drafts, source })) })).digest('hex');
  return { familyId, rules, rulesVersion: version, plans, planHash,
    nextCursor: rows.length > 50 ? intakes[intakes.length - 1].id : null };
};

export const schoolRepairResponse = (plan: Awaited<ReturnType<typeof buildSchoolRepairPlan>>) => ({
  planHash: plan.planHash, rules: plan.rules, rulesVersion: plan.rulesVersion, nextCursor: plan.nextCursor,
  intakes: plan.plans.map(({ intake, source, draftChanges, eventChanges }) => ({ intakeId: intake.id,
    subject: intake.subject, institution: source.institutionName, contentRequired: source.contentRequired,
    draftChanges, eventChanges })),
});

export const applySchoolRepair = async (familyId: string, input: {
  planHash: string; intakeIds?: string[]; afterId?: string; approvedEventIds: string[];
}, actorId: string) => prisma.$transaction(async (tx) => {
  const plan = await buildSchoolRepairPlan(familyId, input.intakeIds, input.afterId, tx as any);
  if (plan.planHash !== input.planHash) throw new SchoolRepairConflict('The repair preview changed. Preview again before applying.');
  const allowedEventIds = new Set(plan.plans.flatMap((item) => item.eventChanges.map((change) => change.eventId)));
  if (input.approvedEventIds.some((id) => !allowedEventIds.has(id))) throw new SchoolRepairConflict('An approved event is not in this repair preview');
  if (plan.rulesVersion === 0) {
    await tx.familyDocument.create({ data: { familyId, key: SCHOOL_RULES_KEY,
      data: plan.rules as unknown as Prisma.InputJsonValue, updatedBy: actorId } });
  }
  const approved = new Set(input.approvedEventIds);
  const at = new Date().toISOString();
  let repairedDrafts = 0;
  let repairedEvents = 0;
  for (const item of plan.plans) {
    const changes = item.eventChanges.filter((change) => approved.has(change.eventId));
    if (!item.draftChanges.length && !changes.length) continue;
    const originalDrafts = Array.isArray(item.intake.parsedDrafts) ? item.intake.parsedDrafts : [];
    const history = Array.isArray(item.metadata.schoolRepairHistory) ? item.metadata.schoolRepairHistory : [];
    const eventAssignments = { ...schoolMetadata(item.metadata.schoolEventAssignments) };
    for (const change of changes) {
      const event = item.events.find((value) => value.id === change.eventId)!;
      const repairedDraft = item.drafts.find((draft) => draft.sourceEventKey === change.sourceEventKey)!;
      const metadata = { ...schoolMetadata((event as any).metadata), ...schoolEventMetadata(repairedDraft, {
        ...item.intake, metadata: { ...item.metadata, schoolSource: item.source },
      }), schoolAssignment: {
        ...repairedDraft.schoolAssignment,
        basis: 'institution', sourceKey: change.sourceKey, sourceEventKey: change.sourceEventKey,
        originalPersonId: change.beforePersonId, repairedBy: actorId, repairedAt: at,
      }, ...(change.googleExportPending ? { schoolExportPending: true } : {}) };
      const result = await tx.calendarEvent.updateMany({ where: { id: event.id, familyId,
        personId: event.personId, updatedAt: event.updatedAt }, data: { personId: change.afterPersonId, metadata } as any });
      if (result.count !== 1) throw new SchoolRepairConflict('An event changed during repair');
      eventAssignments[event.id] = { ...change, actorId, at };
      repairedEvents += 1;
    }
    const updated = await tx.calendarEmailIntake.updateMany({ where: { id: item.intake.id, familyId, updatedAt: item.intake.updatedAt }, data: {
      parsedDrafts: item.drafts as unknown as Prisma.InputJsonValue,
      metadata: { ...item.metadata, schoolSource: item.source,
        schoolOriginalParsedDrafts: item.metadata.schoolOriginalParsedDrafts || originalDrafts,
        schoolEventAssignments: eventAssignments,
        schoolRepairHistory: [...history, { planHash: plan.planHash, actorId, at,
          draftChanges: item.draftChanges, eventChanges: changes }],
      } as unknown as Prisma.InputJsonValue,
    } });
    if (updated.count !== 1) throw new SchoolRepairConflict('An intake changed during repair');
    repairedDrafts += item.draftChanges.length;
  }
  return { repairedDrafts, repairedEvents, externalWrites: false };
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
