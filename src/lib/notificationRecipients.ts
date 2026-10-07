import prisma from '@/lib/prisma';
import type { AuthenticatedUser } from '@/lib/auth-utils';

export const notificationVisibility = async (familyId: string, authUser: AuthenticatedUser) => {
  const unclaimed = await prisma.familyMember.findMany({
    where: { familyId, OR: [{ userId: null }, { user: { neonAuthId: null } }] },
    select: { id: true, name: true },
  });
  return {
    unclaimed,
    where: { familyId, OR: [
      { recipientPersonId: null },
      ...(authUser.familyMemberId ? [{ recipientPersonId: authUser.familyMemberId }] : []),
      ...(unclaimed.length ? [{ recipientPersonId: { in: unclaimed.map((member) => member.id) } }] : []),
    ] },
  };
};

export const canActOnNotification = (recipientPersonId: string | null | undefined, authUser: AuthenticatedUser) =>
  !recipientPersonId || Boolean(authUser.familyMemberId && authUser.familyMemberId === recipientPersonId);
