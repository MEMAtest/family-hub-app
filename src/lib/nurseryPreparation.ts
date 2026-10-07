import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { isChildProfile } from '@/utils/schoolEventPresentation';
import { schoolMetadata } from '@/utils/schoolSources';
import { summarizeNurseryNotice } from '@/utils/nurseryNoticeSummary';
import { loadSchoolRules, resolveStoredSchoolDrafts } from './schoolIntakeServer';
import { grandirPostUrl } from './grandirClient';

export class NurseryPreparationError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'NurseryPreparationError';
  }
}

export const nurseryPreparationTaskId = (familyId: string, intakeId: string) =>
  `nursery-preparation-${createHash('sha256').update(JSON.stringify([familyId, intakeId])).digest('hex')}`;

const londonDate = (date: Date) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const validDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const safeSourceLink = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? `${url.origin}${url.pathname}${url.hash}` : null;
  } catch { return null; }
};

export async function saveNurseryPreparation(familyId: string, intakeId: string, dueDate: string) {
  try {
    const today = londonDate(new Date());
    if (typeof dueDate !== 'string' || !validDateKey(dueDate)) {
      throw new NurseryPreparationError(400, 'Enter a valid due date in YYYY-MM-DD format.');
    }
    if (dueDate < today) {
      throw new NurseryPreparationError(400, 'The due date cannot be in the past.');
    }

    const intake = await prisma.calendarEmailIntake.findFirst({ where: { id: intakeId, familyId } });
    if (!intake || intake.familyId !== familyId) {
      throw new NurseryPreparationError(404, 'The nursery notice was not found for this family.');
    }
    if (intake.status === 'content_required') {
      throw new NurseryPreparationError(409, 'Open the original notice and review its content before creating a task.');
    }

    const members = await prisma.familyMember.findMany({ where: { familyId } });
    const { rules } = await loadSchoolRules(familyId, members);
    const grandirRule = rules.sources.find((source) => source.key === 'grandir');
    const mappedChildIds = Array.from(new Set(grandirRule?.memberIds || []));
    const mappedChildren = members.filter((member) => mappedChildIds.includes(member.id) &&
      isChildProfile({ role: member.role || '', ageGroup: member.ageGroup }));
    const resolved = resolveStoredSchoolDrafts(intake, rules, members);
    const verifiedChildId = schoolMetadata(schoolMetadata(intake.metadata).grandirPortal).childMemberId;
    if (resolved.source.institution !== 'grandir' || resolved.source.contentRequired || mappedChildren.length !== 1 || mappedChildIds.length !== 1) {
      throw new NurseryPreparationError(409, 'This notice is not resolved to exactly one child in the current Grandir rules.');
    }
    if (typeof verifiedChildId === 'string' && verifiedChildId !== mappedChildren[0].id) {
      throw new NurseryPreparationError(409, 'The nursery rule no longer matches the verified child. Check the Grandir connection and child assignment.');
    }

    const rawText = intake.text || intake.normalizedText || '';
    const noticeText = rawText.replace(/^Grandir nursery: [^\n]*\n/, '');
    const summary = summarizeNurseryNotice(noticeText, Boolean(schoolMetadata(schoolMetadata(intake.metadata).grandirPortal).hasAttachments));
    if (summary.kind !== 'preparation' || summary.actions.length === 0) {
      throw new NurseryPreparationError(409, 'This notice does not contain a preparation action.');
    }

    const metadata = schoolMetadata(intake.metadata);
    const portal = schoolMetadata(metadata.grandirPortal);
    let originalLink: string | null = null;
    if (typeof portal.postId === 'string') {
      try { originalLink = grandirPostUrl(portal.postId); } catch { /* Fall back to a validated source link. */ }
    }
    if (!originalLink) originalLink = (resolved.source.links || []).map(safeSourceLink).find(Boolean) || null;
    const notes = [summary.actions.join('\n'), originalLink ? `Original notice: ${originalLink}` : ''].filter(Boolean).join('\n\n');
    const taskId = nurseryPreparationTaskId(familyId, intakeId);
    const task = await prisma.calendarTask.upsert({
      where: { id: taskId },
      create: {
        id: taskId, familyId, assignees: [mappedChildren[0].id], taskType: 'admin', subject: 'Grandir nursery',
        assignedDate: new Date(`${today}T00:00:00.000Z`), dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        title: `Prepare: ${summary.title}`, notes,
      },
      update: {},
      select: { id: true, completedAt: true, dueDate: true },
    });
    return { taskId: task.id, dueDate: task.dueDate.toISOString().slice(0, 10), completed: Boolean(task.completedAt) };
  } catch (error) {
    if (error instanceof NurseryPreparationError) throw error;
    throw new NurseryPreparationError(500, 'Could not save the nursery preparation task. Please try again.');
  }
}
