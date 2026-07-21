import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSessionIdentity, getOrCreateUserForIdentity, isLegacyProfileUser } from '@/lib/auth-utils';
import { hashInviteCode } from '@/lib/householdInvites';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const identity = await getCurrentSessionIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });

    const { code } = await request.json();
    if (typeof code !== 'string' || code.trim().length < 8) {
      return NextResponse.json({ error: 'Enter a valid household invite code.' }, { status: 400 });
    }

    const dbUser = await getOrCreateUserForIdentity(identity);
    const result = await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.familyMember.findFirst({
        where: { userId: dbUser.id },
        select: { familyId: true, id: true },
      });
      if (existingMembership) return { error: 'This Google account is already linked to a household.' };

      const invite = await tx.householdInvite.findUnique({
        where: { codeHash: hashInviteCode(code) },
        include: { targetMember: { include: { user: true } } },
      });
      if (!invite || invite.usedAt || invite.expiresAt <= new Date()) {
        return { error: 'That household invite is no longer valid.' };
      }
      if (invite.targetMember.userId && !isLegacyProfileUser(invite.targetMember.user)) {
        return { error: 'That profile is already linked to an account.' };
      }

      let linkedUserId = dbUser.id;
      if (isLegacyProfileUser(invite.targetMember.user)) {
        // Preserve the older local profile and its related history instead of replacing it.
        if (dbUser.id !== invite.targetMember.user!.id) {
          await tx.user.delete({ where: { id: dbUser.id } });
        }
        const upgradedUser = await tx.user.update({
          where: { id: invite.targetMember.user!.id },
          data: {
            neonAuthId: identity.id,
            email: identity.email.trim().toLowerCase(),
            displayName: identity.name || invite.targetMember.user!.displayName,
            avatarUrl: identity.image || invite.targetMember.user!.avatarUrl,
            authProvider: 'google',
          },
        });
        linkedUserId = upgradedUser.id;
      }

      await tx.familyMember.update({
        where: { id: invite.targetMemberId },
        data: { userId: linkedUserId },
      });
      await tx.householdInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), redeemedById: linkedUserId },
      });
      return { familyId: invite.familyId, memberName: invite.targetMember.name };
    });

    if ('error' in result) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Redeem household invite error:', error);
    return NextResponse.json({ error: 'Could not redeem the invite.' }, { status: 500 });
  }
}
