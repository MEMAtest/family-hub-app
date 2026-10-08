jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  calendarTask: { findMany: jest.fn() }, budgetExpense: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn() },
  familyMember: { findMany: jest.fn() }, notification: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
} }));
jest.mock('@/lib/webPush', () => ({ sendFamilyPushNotification: jest.fn() }));

import prisma from '@/lib/prisma';
import { sendFamilyPushNotification } from '@/lib/webPush';
import { runHomeIntelligenceSweep } from '@/lib/homeIntelligenceReminders';

const dbTask = {
  id: 'task', title: 'Bring PE kit', assignees: ['amari'], assignedDate: new Date('2026-10-08'), dueDate: new Date('2026-10-09'),
  dueTime: null, completedAt: null, completedBy: null, taskType: 'homework', subject: 'School', notes: null,
  priority: 'medium', effortMinutes: null, sourceEventId: null, recurrenceRule: null,
  createdAt: new Date('2026-10-08'), updatedAt: new Date('2026-10-08'),
};

beforeEach(() => {
  jest.resetAllMocks();
  (prisma.calendarTask.findMany as jest.Mock).mockResolvedValue([dbTask]);
  (prisma.budgetExpense.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: [] });
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'amari', name: 'Amari' }]);
  (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notification' });
  (prisma.notification.update as jest.Mock).mockResolvedValue({ id: 'notification' });
  (sendFamilyPushNotification as jest.Mock).mockResolvedValue({ sent: 1, failed: 0 });
});

it('runs only in the London morning and evening routine windows', async () => {
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T11:00:00Z'))).skipped).toBe('outside_routine_window');
  expect(prisma.calendarTask.findMany).not.toHaveBeenCalled();
});

it('creates one concise household prompt and records provider acceptance without claiming delivery', async () => {
  const result = await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'));
  expect(result).toMatchObject({ planned: 1, created: 1, pushAccepted: 1, deliveryConfirmed: false });
  expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    title: 'Bring PE kit', message: expect.stringContaining('School: Bring PE kit'),
    actions: expect.arrayContaining([expect.objectContaining({ action: 'view_home_intelligence' })]),
  }) }));
  expect(prisma.notification.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    metadata: expect.objectContaining({ pushStatus: 'accepted', deliveryConfirmed: false }),
  }) }));
});

it('deduplicates repeated scheduler ticks in the same routine phase', async () => {
  (prisma.notification.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });
  const result = await runHomeIntelligenceSweep('family', new Date('2026-10-09T19:15:00Z'));
  expect(result.created).toBe(0);
  expect(prisma.notification.create).not.toHaveBeenCalled();
  expect(sendFamilyPushNotification).not.toHaveBeenCalled();
});
