jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    calendarTask: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    familyMember: { findMany: jest.fn() },
  },
}));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));

import prisma from '@/lib/prisma';
import { POST, PATCH } from './route';

const makeRequest = (body: Record<string, unknown>) => ({ json: async () => body }) as any;
const makeContext = () => ({ params: Promise.resolve({ familyId: 'family-id' }) }) as any;

describe('family reminder persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves repeating tasks only for family members in the same household', async () => {
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'child-id' }]);
    (prisma.calendarTask.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'task-id', ...data, completedAt: null, completedBy: null, createdAt: new Date(), updatedAt: new Date(),
    }));

    const result = await (POST as any)(makeRequest({
      title: 'Bring in toys',
      assignees: ['child-id'],
      assignedDate: '2026-10-02',
      dueDate: '2026-10-02',
      taskType: 'other',
      priority: 'medium',
      recurringPattern: { frequency: 'weekly', interval: 1, daysOfWeek: [2, 5] },
    }), makeContext());

    expect(result.status).toBe(201);
    expect(result.body.recurringPattern).toEqual({ frequency: 'weekly', interval: 1, daysOfWeek: [2, 5] });
    expect(prisma.familyMember.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['child-id'] }, familyId: 'family-id' },
      select: { id: true },
    });
    expect(prisma.calendarTask.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ familyId: 'family-id', title: 'Bring in toys' }),
    }));
  });

  it('rejects a family member id that belongs to another household', async () => {
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([]);
    const result = await (POST as any)(makeRequest({
      title: 'Bring in toys', assignees: ['foreign-child'],
      assignedDate: '2026-10-02', dueDate: '2026-10-02',
    }), makeContext());

    expect(result.status).toBe(400);
    expect(prisma.calendarTask.create).not.toHaveBeenCalled();
  });

  it('persists one recurring occurrence completion without losing the rule', async () => {
    const rule = { frequency: 'weekly', interval: 1, daysOfWeek: [2] };
    (prisma.calendarTask.findFirst as jest.Mock).mockResolvedValue({
      id: 'task-id', familyId: 'family-id', assignedDate: new Date('2026-10-02'),
      dueDate: new Date('2026-10-02'), recurrenceRule: rule,
    });
    (prisma.calendarTask.update as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'task-id', title: 'Homework', assignees: [], assignedDate: new Date('2026-10-02'),
      dueDate: new Date('2026-10-02'), recurrenceRule: data.recurrenceRule,
      completedAt: null, completedBy: null, taskType: 'homework', priority: 'medium',
      createdAt: new Date(), updatedAt: new Date(),
    }));

    const occurrenceCompletions = { '2026-10-06': '2026-10-06T18:00:00.000Z' };
    const result = await (PATCH as any)(makeRequest({ id: 'task-id', occurrenceCompletions }), makeContext());

    expect(result.status).toBe(200);
    expect(result.body.occurrenceCompletions).toEqual(occurrenceCompletions);
    expect(result.body.recurringPattern).toEqual(rule);
    expect(prisma.calendarTask.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ recurrenceRule: { ...rule, occurrenceCompletions } }),
    }));
  });

  it('rejects invalid occurrence dates before updating', async () => {
    (prisma.calendarTask.findFirst as jest.Mock).mockResolvedValue({
      id: 'task-id', assignedDate: new Date('2026-10-02'), dueDate: new Date('2026-10-02'),
      recurrenceRule: { frequency: 'weekly', interval: 1 },
    });
    const result = await (PATCH as any)(makeRequest({
      id: 'task-id', occurrenceCompletions: { 'not-a-date': '2026-10-06T18:00:00.000Z' },
    }), makeContext());
    expect(result.status).toBe(400);
    expect(prisma.calendarTask.update).not.toHaveBeenCalled();
  });
});
