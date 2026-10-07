/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  calendarEmailIntake: { findFirst: jest.fn() }, familyMember: { findMany: jest.fn() }, calendarTask: { upsert: jest.fn() },
} }));
jest.mock('../schoolIntakeServer', () => ({
  loadSchoolRules: jest.fn(), resolveStoredSchoolDrafts: jest.fn(),
}));
import prisma from '@/lib/prisma';
import { loadSchoolRules, resolveStoredSchoolDrafts } from '../schoolIntakeServer';
import { NurseryPreparationError, nurseryPreparationTaskId, saveNurseryPreparation } from '../nurseryPreparation';

const members = [
  { id: 'child-1', name: 'A Child', role: 'Child', ageGroup: 'Nursery' },
  { id: 'parent-1', name: 'A Parent', role: 'Parent', ageGroup: '' },
];
const intake: any = {
  id: 'notice-1', familyId: 'family-1', status: 'review_required', subject: 'Grandir nursery: Label spare clothes',
  text: 'Grandir nursery: Example Nursery\nPlease label spare clothes before Monday.', normalizedText: null,
  metadata: { grandirPortal: { postId: 'post_1' } }, parsedDrafts: [],
};
let savedTask: any;

describe('nursery preparation tasks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T12:00:00.000Z'));
    intake.status = 'review_required';
    intake.text = 'Grandir nursery: Example Nursery\nPlease label spare clothes before Monday.';
    intake.metadata = { grandirPortal: { postId: 'post_1', childMemberId: 'child-1' } };
    savedTask = { id: nurseryPreparationTaskId('family-1', 'notice-1'), completedAt: null, dueDate: new Date('2026-10-08T00:00:00.000Z') };
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(intake);
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members);
    (loadSchoolRules as jest.Mock).mockResolvedValue({ rules: { schemaVersion: 1, sources: [
      { key: 'stewart-fleming', name: 'School', aliases: ['School'], memberIds: [] },
      { key: 'grandir', name: 'Grandir nursery', aliases: ['Grandir'], memberIds: ['child-1'] },
    ] } });
    (resolveStoredSchoolDrafts as jest.Mock).mockImplementation((_intake, rules) => ({
      source: { institution: 'grandir', contentRequired: false, links: ['https://www.app.grandiruk.com/#/account/post/post_1'] },
      drafts: [],
    }));
    (prisma.calendarTask.upsert as jest.Mock).mockImplementation(async (args) => {
      if (!savedTask) savedTask = { ...args.create, completedAt: null };
      return savedTask;
    });
  });
  afterEach(() => jest.useRealTimers());

  it('uses a deterministic SHA-256 task id and stores a resolved preparation task', async () => {
    expect(nurseryPreparationTaskId('family-1', 'notice-1')).toBe(nurseryPreparationTaskId('family-1', 'notice-1'));
    const result = await saveNurseryPreparation('family-1', 'notice-1', '2026-10-08');
    expect(result).toEqual({ taskId: nurseryPreparationTaskId('family-1', 'notice-1'), dueDate: '2026-10-08', completed: false });
    expect(prisma.calendarEmailIntake.findFirst).toHaveBeenCalledWith({ where: { id: 'notice-1', familyId: 'family-1' } });
    expect(prisma.calendarTask.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: result.taskId }, update: {}, create: expect.objectContaining({ familyId: 'family-1', assignees: ['child-1'],
        taskType: 'admin', subject: 'Grandir nursery', assignedDate: new Date('2026-10-07T00:00:00.000Z'),
        dueDate: new Date('2026-10-08T00:00:00.000Z'), title: 'Prepare: Please label spare clothes before Monday',
        notes: expect.stringContaining('https://www.app.grandiruk.com/#/account/post/post_1') }),
    }));
  });

  it('requires a strict real date that is not before the current London date', async () => {
    for (const date of ['2026-02-30', '2026-2-03', '2026-10-06', '2026-10-07T00:00:00Z']) {
      await expect(saveNurseryPreparation('family-1', 'notice-1', date)).rejects.toBeInstanceOf(NurseryPreparationError);
    }
    expect(prisma.calendarEmailIntake.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a foreign or missing intake and a missing Grandir source', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValueOnce(null);
    await expect(saveNurseryPreparation('family-1', 'foreign', '2026-10-08')).rejects.toMatchObject({ statusCode: 404 });
    (resolveStoredSchoolDrafts as jest.Mock).mockReturnValueOnce({ source: { institution: null, contentRequired: false, links: [] }, drafts: [] });
    await expect(saveNurseryPreparation('family-1', 'notice-1', '2026-10-08')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects incorrect child mapping and notices without preparation actions', async () => {
    (loadSchoolRules as jest.Mock).mockResolvedValueOnce({ rules: { sources: [{ key: 'grandir', memberIds: ['child-1', 'parent-1'] }] } });
    await expect(saveNurseryPreparation('family-1', 'notice-1', '2026-10-08')).rejects.toMatchObject({ statusCode: 409 });
    intake.text = 'Grandir nursery: Example Nursery\nWe enjoyed playing outside today.';
    await expect(saveNurseryPreparation('family-1', 'notice-1', '2026-10-08')).rejects.toMatchObject({ statusCode: 409 });
    intake.status = 'content_required';
    await expect(saveNurseryPreparation('family-1', 'notice-1', '2026-10-08')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('retries idempotently without resetting a completed task or its stored due date', async () => {
    savedTask = { id: nurseryPreparationTaskId('family-1', 'notice-1'), completedAt: new Date('2026-10-07T13:00:00Z'),
      dueDate: new Date('2026-10-09T00:00:00.000Z') };
    const result = await saveNurseryPreparation('family-1', 'notice-1', '2026-10-08');
    expect(result).toEqual({ taskId: savedTask.id, dueDate: '2026-10-09', completed: true });
    expect(prisma.calendarTask.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    expect(savedTask.dueDate).toEqual(new Date('2026-10-09T00:00:00.000Z'));
  });
  it('does not reassign a verified portal notice after household source rules change', async () => {
    intake.metadata.grandirPortal.childMemberId = 'previous-child';
    await expect(saveNurseryPreparation('family-1', 'notice-1', '2026-10-08')).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.calendarTask.upsert).not.toHaveBeenCalled();
  });
});
