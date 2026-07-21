import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNeonSessionIdentity, type SessionIdentity } from '@/lib/neonAuth';
import { normalizeEmail } from '@/lib/householdInvites';

export interface AuthenticatedUser {
  neonUserId: string;
  dbUser: {
    id: string;
    email: string;
    neonAuthId: string;
    displayName: string | null;
  };
  familyId: string;
  familyMemberId: string;
}

type RouteParams = Record<string, string>;
type RouteContext = { params?: Promise<RouteParams> | RouteParams } | undefined;

export const isLegacyProfileUser = (
  user: { neonAuthId: string | null; authProvider: string } | null | undefined
) => Boolean(user && !user.neonAuthId && user.authProvider === 'local-profile');

function getBypassTestUser(): AuthenticatedUser | null {
  if (process.env.NODE_ENV !== 'test' || process.env.BYPASS_AUTH_FOR_TESTS !== 'true') return null;

  const familyId = process.env.TEST_AUTH_FAMILY_ID;
  if (!familyId) return null;

  return {
    neonUserId: process.env.TEST_AUTH_NEON_USER_ID || 'test-neon-user',
    dbUser: {
      id: process.env.TEST_AUTH_DB_USER_ID || 'test-db-user',
      email: process.env.TEST_AUTH_EMAIL || 'test@example.com',
      neonAuthId: process.env.TEST_AUTH_NEON_USER_ID || 'test-neon-user',
      displayName: 'Smoke Test User',
    },
    familyId,
    familyMemberId: process.env.TEST_AUTH_FAMILY_MEMBER_ID || 'test-family-member',
  };
}

async function getE2EFixtureUser(params?: RouteParams): Promise<AuthenticatedUser | null> {
  // Browser suites run against an isolated local Next server, not a production deployment.
  // Keep the fixture identity behind the explicit E2E build flag so production never has
  // a fallback identity when Neon Auth is unavailable.
  if (process.env.NEXT_PUBLIC_E2E !== 'true') return null;
  const familyId = params?.familyId || (await prisma.family.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id;
  if (!familyId) return null;
  const member = await prisma.familyMember.findFirst({ where: { familyId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!member) return null;
  return {
    neonUserId: 'e2e-fixture-user',
    dbUser: { id: 'e2e-fixture-user', email: 'e2e@family-hub.test', neonAuthId: 'e2e-fixture-user', displayName: 'E2E Fixture' },
    familyId,
    familyMemberId: member.id,
  };
}

async function resolveRouteParams(context: RouteContext): Promise<RouteParams> {
  if (!context?.params) return {};
  const maybePromise = context.params as Promise<RouteParams>;
  if (typeof (maybePromise as { then?: unknown }).then === 'function') {
    return (await maybePromise) || {};
  }
  return (context.params as RouteParams) || {};
}

export async function getCurrentSessionIdentity(_request?: NextRequest): Promise<SessionIdentity | null> {
  if ((process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH_FOR_TESTS === 'true') || process.env.NEXT_PUBLIC_E2E === 'true') {
    return {
      id: process.env.TEST_AUTH_NEON_USER_ID || 'test-neon-user',
      email: process.env.TEST_AUTH_EMAIL || 'test@example.com',
      name: 'Smoke Test User',
      image: null,
    };
  }

  try {
    return await getNeonSessionIdentity();
  } catch (error) {
    console.error('Unable to resolve Neon Auth session:', error);
    return null;
  }
}

async function claimConfiguredLegacyOwner(identity: SessionIdentity) {
  const bootstrapEmail = process.env.FAMILY_OWNER_BOOTSTRAP_EMAIL;
  const bootstrapMemberId = process.env.FAMILY_OWNER_MEMBER_ID;
  if (!bootstrapEmail || !bootstrapMemberId) return null;
  if (normalizeEmail(bootstrapEmail) !== normalizeEmail(identity.email)) return null;

  const member = await prisma.familyMember.findUnique({
    where: { id: bootstrapMemberId },
    include: { user: true },
  });
  if (!member || !isLegacyProfileUser(member.user)) return null;

  return prisma.user.update({
    where: { id: member.user!.id },
    data: {
      neonAuthId: identity.id,
      email: normalizeEmail(identity.email),
      displayName: identity.name || member.user!.displayName,
      avatarUrl: identity.image || member.user!.avatarUrl,
      authProvider: 'google',
    },
  });
}

export async function getOrCreateUserForIdentity(identity: SessionIdentity) {
  // The old open-access app created local placeholder users for adult profiles.
  // The configured first owner upgrades that record so their existing history stays attached.
  const claimedLegacyOwner = await claimConfiguredLegacyOwner(identity);
  if (claimedLegacyOwner) return claimedLegacyOwner;

  const existingByIdentity = await prisma.user.findUnique({
    where: { neonAuthId: identity.id },
  });

  if (existingByIdentity) {
    return prisma.user.update({
      where: { id: existingByIdentity.id },
      data: {
        email: normalizeEmail(identity.email),
        displayName: identity.name || existingByIdentity.displayName,
        avatarUrl: identity.image || existingByIdentity.avatarUrl,
        authProvider: 'google',
      },
    });
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: normalizeEmail(identity.email) },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        neonAuthId: identity.id,
        displayName: identity.name || existingByEmail.displayName,
        avatarUrl: identity.image || existingByEmail.avatarUrl,
        authProvider: 'google',
      },
    });
  }

  return prisma.user.create({
    data: {
      neonAuthId: identity.id,
      email: normalizeEmail(identity.email),
      displayName: identity.name,
      avatarUrl: identity.image,
      authProvider: 'google',
    },
  });
}

async function bootstrapConfiguredOwner(identity: SessionIdentity, dbUserId: string) {
  const bootstrapEmail = process.env.FAMILY_OWNER_BOOTSTRAP_EMAIL;
  const bootstrapMemberId = process.env.FAMILY_OWNER_MEMBER_ID;
  if (!bootstrapEmail || !bootstrapMemberId) return null;
  if (normalizeEmail(bootstrapEmail) !== normalizeEmail(identity.email)) return null;

  return prisma.$transaction(async (tx) => {
    const member = await tx.familyMember.findUnique({
      where: { id: bootstrapMemberId },
      include: { family: true },
    });
    if (!member || (member.userId && member.userId !== dbUserId)) return null;
    if (member.family.ownerId && member.family.ownerId !== dbUserId) return null;

    await tx.family.update({
      where: { id: member.familyId },
      data: { ownerId: dbUserId },
    });
    return tx.familyMember.update({
      where: { id: member.id },
      data: { userId: dbUserId },
    });
  });
}

export async function getAuthenticatedUser(request: NextRequest, params?: RouteParams): Promise<AuthenticatedUser | null> {
  const bypassUser = getBypassTestUser();
  if (bypassUser) return bypassUser;
  const e2eUser = await getE2EFixtureUser(params);
  if (e2eUser) return e2eUser;

  const identity = await getCurrentSessionIdentity(request);
  if (!identity) return null;
  const dbUser = await getOrCreateUserForIdentity(identity);

  let member = await prisma.familyMember.findFirst({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'asc' },
  });

  const bootstrappedMember = await bootstrapConfiguredOwner(identity, dbUser.id);
  if (bootstrappedMember) member = bootstrappedMember;
  if (!member) return null;

  return {
    neonUserId: identity.id,
    dbUser: {
      id: dbUser.id,
      email: dbUser.email,
      neonAuthId: identity.id,
      displayName: dbUser.displayName,
    },
    familyId: member.familyId,
    familyMemberId: member.id,
  };
}

export function privateAreaResponse(ownerName?: string) {
  return NextResponse.json(
    {
      error: ownerName ? `This is ${ownerName}'s private area.` : 'This is another person’s private area.',
      privateArea: true,
    },
    { status: 404 }
  );
}

export async function requireOwnProfile(authUser: AuthenticatedUser, personId: string) {
  if (authUser.familyMemberId === personId) return true;
  return false;
}

export function requireAuth(
  handler: (
    request: NextRequest,
    context: { params: Promise<RouteParams> },
    authUser: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: RouteContext) => {
    const params = await resolveRouteParams(context);
    const authUser = await getAuthenticatedUser(request, params);
    if (!authUser) {
      return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
    }
    return handler(request, { params: Promise.resolve(params) }, authUser);
  };
}

export function requireFamilyAccess(
  handler: (
    request: NextRequest,
    context: { params: Promise<RouteParams> },
    authUser: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: RouteContext) => {
    const params = await resolveRouteParams(context);
    const authUser = await getAuthenticatedUser(request, params);
    if (!authUser) {
      return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
    }
    if (params.familyId && params.familyId !== authUser.familyId) {
      return privateAreaResponse();
    }
    return handler(request, { params: Promise.resolve(params) }, authUser);
  };
}

export async function checkAuth(): Promise<boolean> {
  try {
    return (await fetch('/api/auth/me')).ok;
  } catch {
    return false;
  }
}
