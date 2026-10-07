/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  familyMember: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn(), create: jest.fn() },
  calendarEmailIntake: { findMany: jest.fn(), updateMany: jest.fn() },
  calendarEvent: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() }, $transaction: jest.fn(),
} }));
import prisma from '@/lib/prisma';
import { applySchoolRepair, buildSchoolRepairPlan, hasManualSchoolAssignment, SchoolRepairConflict } from '../schoolIntakeRepair';
import { initialSchoolRules } from '@/utils/schoolSources';

const members = [{ id: 'amari', name: 'Amari', role: 'Child' }, { id: 'askia', name: 'Askia', role: 'Child' }];
let intake: any;
let events: any[];
describe('audited school repair', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    intake = { id: 'intake', familyId: 'family', sender: 'office@stewartfleming.bromley.sch.uk',
      subject: 'Weekly update', text: 'Stewart Fleming Primary School', html: '', status: 'review_required',
      receivedAt: new Date('2026-10-06'), updatedAt: new Date('2026-10-06'), metadata: { schoolSenderVerified: true },
      createdEventIds: ['saved-photo'], parsedDrafts: [{ importId: 'photo', sourceEventKey: 'photo-key',
        title: 'Individual and sibling photographs', person: 'askia', date: '2026-10-07', time: '09:00',
        source: 'All children Individual and sibling photographs 7 October 2026', sourceLine: 1,
        importStatus: 'ready', warnings: [], duration: 60, type: 'education' }] };
    events = [{ id: 'saved-photo', familyId: 'family', sourceId: 'intake', personId: 'askia', title: 'Individual and sibling photographs',
      eventDate: new Date('2026-10-07'), updatedAt: new Date('2026-10-06'), googleEventId: 'exported', metadata: { unrelated: 'preserved' } }];
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members);
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: initialSchoolRules(members), version: 1 });
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockImplementation(async () => [structuredClone(intake)]);
    (prisma.calendarEvent.findMany as jest.Mock).mockImplementation(async () => structuredClone(events));
    (prisma.$transaction as jest.Mock).mockImplementation(async (handler) => handler(prisma));
    (prisma.calendarEmailIntake.updateMany as jest.Mock).mockImplementation(async ({ data }) => { Object.assign(intake, data); return { count: 1 }; });
    (prisma.calendarEvent.updateMany as jest.Mock).mockImplementation(async ({ where, data }) => { Object.assign(events.find((event) => event.id === where.id), data); return { count: 1 }; });
  });
  it('dry-runs source-linked wrong previews and events without any writes', async () => {
    const plan = await buildSchoolRepairPlan('family');
    expect(plan.plans[0].draftChanges[0]).toMatchObject({ beforePersonId: 'askia', afterPersonId: 'amari' });
    expect(plan.plans[0].eventChanges[0]).toMatchObject({ eventId: 'saved-photo', beforePersonId: 'askia', afterPersonId: 'amari', requiresApproval: true });
    expect(prisma.calendarEmailIntake.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'family' } }));
    expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ familyId: 'family' }) }));
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.updateMany).not.toHaveBeenCalled();
    expect(prisma.familyDocument.create).not.toHaveBeenCalled();
  });
  it('corrects in place only when approved, preserves originals and provenance, and is idempotent', async () => {
    const plan = await buildSchoolRepairPlan('family');
    expect(await applySchoolRepair('family', { planHash: plan.planHash, approvedEventIds: ['saved-photo'] }, 'actor')).toEqual({ repairedDrafts: 1, repairedEvents: 1, externalWrites: false });
    expect(events[0]).toMatchObject({ id: 'saved-photo', personId: 'amari', metadata: {
      unrelated: 'preserved', schoolExportPending: true, schoolProvenance: { intakeId: 'intake', institutionKey: 'stewart-fleming', senderVerified: true },
      schoolAssignment: { originalPersonId: 'askia', repairedBy: 'actor' },
    } });
    expect(intake.metadata.schoolOriginalParsedDrafts[0].person).toBe('askia');
    expect(intake.metadata.schoolRepairHistory).toHaveLength(1);
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    const second = await buildSchoolRepairPlan('family');
    expect(second.plans[0].draftChanges).toEqual([]);
    expect(second.plans[0].eventChanges).toEqual([]);
    expect(await applySchoolRepair('family', { planHash: second.planHash, approvedEventIds: [] }, 'actor')).toEqual({ repairedDrafts: 0, repairedEvents: 0, externalWrites: false });
    expect(intake.metadata.schoolRepairHistory).toHaveLength(1);
  });
  it('supports correcting previews now and approving the saved event later', async () => {
    let plan = await buildSchoolRepairPlan('family');
    await applySchoolRepair('family', { planHash: plan.planHash, approvedEventIds: [] }, 'actor');
    expect(events[0].personId).toBe('askia');
    plan = await buildSchoolRepairPlan('family');
    expect(plan.plans[0].eventChanges).toHaveLength(1);
    await applySchoolRepair('family', { planHash: plan.planHash, approvedEventIds: ['saved-photo'] }, 'actor');
    expect(events[0].personId).toBe('amari');
  });
  it.each([
    { assignmentOverride: { personId: 'askia', changedAt: '2026-10-06', changedBy: 'actor' } },
    { schoolAssignment: { basis: 'manual', manualOverride: { personId: 'askia' } } },
    { manualAssignmentOverride: true },
  ])('preserves durable saved-event manual overrides %j', async (override) => {
    events[0].metadata = override;
    expect(hasManualSchoolAssignment(override)).toBe(true);
    const plan = await buildSchoolRepairPlan('family');
    expect(plan.plans[0].eventChanges).toEqual([]);
    await applySchoolRepair('family', { planHash: plan.planHash, approvedEventIds: [] }, 'actor');
    expect(events[0].metadata).toEqual(override);
    expect(prisma.calendarEvent.updateMany).not.toHaveBeenCalled();
  });
  it('preserves the intake manual override and its original imported choice', async () => {
    intake.metadata.schoolOverrides = { 'photo-key': { personId: 'askia', actorId: 'actor', at: '2026-10-06' } };
    const plan = await buildSchoolRepairPlan('family');
    expect(plan.plans[0].drafts[0]).toMatchObject({ person: 'askia', schoolAssignment: { basis: 'manual', originalPersonId: 'askia' } });
    expect(plan.plans[0].draftChanges).toEqual([]);
    expect(plan.plans[0].eventChanges).toEqual([]);
  });
  it('preserves a differing legacy saved choice instead of treating it as an imported default', async () => {
    events[0].personId = 'adult-chosen';
    expect((await buildSchoolRepairPlan('family')).plans[0].eventChanges).toEqual([]);
  });
  it('rejects stale hashes and approvals outside the preview before any writes', async () => {
    const plan = await buildSchoolRepairPlan('family');
    intake.updatedAt = new Date('2026-10-07');
    await expect(applySchoolRepair('family', { planHash: plan.planHash, approvedEventIds: [] }, 'actor')).rejects.toBeInstanceOf(SchoolRepairConflict);
    const current = await buildSchoolRepairPlan('family');
    await expect(applySchoolRepair('family', { planHash: current.planHash, approvedEventIds: ['foreign-event'] }, 'actor')).rejects.toBeInstanceOf(SchoolRepairConflict);
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.updateMany).not.toHaveBeenCalled();
  });
  it('keeps historical dates and record IDs unchanged', async () => {
    intake.parsedDrafts[0].date = '2025-12-01';
    events[0].eventDate = new Date('2025-12-01');
    const plan = await buildSchoolRepairPlan('family');
    await applySchoolRepair('family', { planHash: plan.planHash, approvedEventIds: ['saved-photo'] }, 'actor');
    expect(events[0].eventDate).toEqual(new Date('2025-12-01'));
    expect(events[0].id).toBe('saved-photo');
  });
  it('does not reassign a legacy PTA child to another child while enriching its draft concerns', async () => {
    intake.parsedDrafts[0].title = 'PTA AGM';
    intake.parsedDrafts[0].source = 'PTA AGM 7 October 2026';
    events[0].title = 'PTA AGM';
    const plan = await buildSchoolRepairPlan('family');
    expect(plan.plans[0].drafts[0].schoolAssignment).toMatchObject({ concernedMemberIds: ['amari'], attendeePersonId: null, attendeeStatus: 'needs_confirmation' });
    expect(plan.plans[0].eventChanges).toEqual([]);
    await applySchoolRepair('family', { planHash: plan.planHash, approvedEventIds: [] }, 'actor');
    expect(events[0].personId).toBe('askia');
    expect(prisma.calendarEvent.updateMany).not.toHaveBeenCalled();
    expect(intake.parsedDrafts[0].schoolAssignment.concernedMemberIds).toEqual(['amari']);
  });
});
