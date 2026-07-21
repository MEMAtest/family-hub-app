import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, getCurrentSessionIdentity, getOrCreateUserForIdentity } from '@/lib/auth-utils';
import { isNeonAuthConfigured } from '@/lib/neonAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (
      !isNeonAuthConfigured()
      && process.env.BYPASS_AUTH_FOR_TESTS !== 'true'
      && process.env.NEXT_PUBLIC_E2E !== 'true'
    ) {
      return NextResponse.json(
        { error: 'Google sign-in has not been configured for this deployment.' },
        { status: 503 }
      );
    }

    const identity = await getCurrentSessionIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
    }

    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      const dbUser = await getOrCreateUserForIdentity(identity);
      return NextResponse.json({
        user: {
          id: dbUser.id,
          neonAuthId: identity.id,
          email: dbUser.email,
          displayName: dbUser.displayName,
          avatarUrl: dbUser.avatarUrl,
        },
        family: null,
        familyMember: null,
        accessPending: true,
      });
    }

    const familyRecord = await prisma.family.findUnique({
      where: { id: authUser.familyId },
      select: { id: true, familyName: true, familyCode: true, createdAt: true, ownerId: true },
    });
    const familyMember = await prisma.familyMember.findUnique({
      where: { id: authUser.familyMemberId },
      select: { id: true, name: true, role: true, ageGroup: true, color: true, icon: true },
    });

    return NextResponse.json({
      user: {
        ...authUser.dbUser,
        avatarUrl: identity.image,
      },
      family: familyRecord ? { id: familyRecord.id, familyName: familyRecord.familyName, familyCode: familyRecord.familyCode, createdAt: familyRecord.createdAt } : null,
      familyMember,
      accessPending: false,
      isOwner: familyRecord?.ownerId === authUser.dbUser.id,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Unable to load your account.' }, { status: 500 });
  }
}
