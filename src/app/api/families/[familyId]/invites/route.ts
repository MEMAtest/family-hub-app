import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createInviteCode, hashInviteCode, inviteExpiry } from '@/lib/householdInvites';
import { isLegacyProfileUser, requireFamilyAccess } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export const POST = requireFamilyAccess(async (request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    const { memberId } = await request.json();
    if (typeof memberId !== 'string' || !memberId) {
      return NextResponse.json({ error: 'Choose the adult profile to invite.' }, { status: 400 });
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { ownerId: true },
    });
    if (!family || family.ownerId !== authUser.dbUser.id) {
      return NextResponse.json({ error: 'Only the household owner can create an invite.' }, { status: 404 });
    }

    const member = await prisma.familyMember.findFirst({
      where: { id: memberId, familyId, ageGroup: 'Adult' },
      select: { id: true, userId: true, name: true, user: { select: { neonAuthId: true, authProvider: true } } },
    });
    if (!member) return NextResponse.json({ error: 'Adult profile not found.' }, { status: 404 });
    if (member.userId && !isLegacyProfileUser(member.user)) {
      return NextResponse.json({ error: `${member.name} already has an account.` }, { status: 400 });
    }

    const code = createInviteCode();
    const expiresAt = inviteExpiry();
    await prisma.$transaction([
      prisma.householdInvite.updateMany({
        where: { familyId, targetMemberId: member.id, usedAt: null },
        data: { expiresAt: new Date() },
      }),
      prisma.householdInvite.create({
        data: {
          familyId,
          targetMemberId: member.id,
          createdById: authUser.dbUser.id,
          codeHash: hashInviteCode(code),
          expiresAt,
        },
      }),
    ]);

    return NextResponse.json({
      code,
      memberName: member.name,
      expiresAt: expiresAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Create household invite error:', error);
    return NextResponse.json({ error: 'Could not create the invite.' }, { status: 500 });
  }
});
