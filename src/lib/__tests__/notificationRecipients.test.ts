jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { familyMember: { findMany: jest.fn() } } }));
import prisma from '@/lib/prisma';
import { notificationVisibility, canActOnNotification } from '@/lib/notificationRecipients';
const auth = { familyMemberId: 'ade' } as any;
it('only shows own, legacy household, and explicitly unclaimed recipient notifications', async () => {
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'angela', name: 'Angela' }]);
  const result = await notificationVisibility('family', auth);
  expect(result.where).toEqual({ familyId: 'family', OR: [
    { recipientPersonId: null }, { recipientPersonId: 'ade' }, { recipientPersonId: { in: ['angela'] } },
  ] });
});
it('does not treat an unclaimed recipient as permission to respond on their behalf', () => {
  expect(canActOnNotification('ade', auth)).toBe(true);
  expect(canActOnNotification('angela', auth)).toBe(false);
  expect(canActOnNotification('angela', { familyMemberId: undefined } as any)).toBe(false);
});
