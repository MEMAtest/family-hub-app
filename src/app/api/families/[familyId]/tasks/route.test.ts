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
import { POST } from './route';

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
});
