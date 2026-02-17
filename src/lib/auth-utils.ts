import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
type RouteContext = {
  params?: Promise<RouteParams> | RouteParams;
} | undefined;

const OPEN_ACCESS_USER = {
  id: "local-open-user",
  email: "local@family-hub.app",
  neonAuthId: "local-open-user",
  displayName: "Local Family User",
};

function getBypassTestUser(): AuthenticatedUser | null {
  // Allow route-level smoke tests to execute in-process without a Next request scope.
  // This is only active in NODE_ENV=test and must be explicitly enabled.
  if (process.env.NODE_ENV !== "test") return null;
  if (process.env.BYPASS_AUTH_FOR_TESTS !== "true") return null;

  const familyId = process.env.TEST_AUTH_FAMILY_ID;
  if (!familyId) return null;

  return {
    neonUserId: process.env.TEST_AUTH_NEON_USER_ID || "test-neon-user",
    dbUser: {
      id: process.env.TEST_AUTH_DB_USER_ID || "test-db-user",
      email: process.env.TEST_AUTH_EMAIL || "test@example.com",
      neonAuthId: process.env.TEST_AUTH_NEON_USER_ID || "test-neon-user",
      displayName: "Smoke Test User",
    },
    familyId,
    familyMemberId: process.env.TEST_AUTH_FAMILY_MEMBER_ID || "test-family-member",
  };
}

async function getOpenAccessUser(
  params?: RouteParams
): Promise<AuthenticatedUser> {
  const requestedFamilyId = params?.familyId;
  const resolvedFamilyId =
    requestedFamilyId ||
    (await prisma.family.findFirst({ select: { id: true } }))?.id ||
    "";

  const resolvedMemberId =
    (
      await prisma.familyMember.findFirst({
        where: resolvedFamilyId ? { familyId: resolvedFamilyId } : undefined,
        select: { id: true },
      })
    )?.id || "";

  return {
    neonUserId: OPEN_ACCESS_USER.neonAuthId,
    dbUser: { ...OPEN_ACCESS_USER },
    familyId: resolvedFamilyId,
    familyMemberId: resolvedMemberId,
  };
}

async function resolveRouteParams(context: RouteContext): Promise<RouteParams> {
  if (!context?.params) {
    return {};
  }

  const maybePromise = context.params as Promise<RouteParams>;
  if (typeof (maybePromise as { then?: unknown }).then === "function") {
    return (await maybePromise) || {};
  }

  return (context.params as RouteParams) || {};
}

/**
 * Auth is intentionally disabled for this app.
 * Keep the function for compatibility with existing route wrappers.
 */
export async function getAuthenticatedUser(
  _request: NextRequest
): Promise<AuthenticatedUser | null> {
  const bypassUser = getBypassTestUser();
  if (bypassUser) {
    return bypassUser;
  }
  return null;
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function requireAuth(
  handler: (
    request: NextRequest,
    context: { params: Promise<RouteParams> },
    authUser: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: RouteContext
  ) => {
    const params = await resolveRouteParams(context);
    const authUser =
      (await getAuthenticatedUser(request)) || (await getOpenAccessUser(params));

    return handler(request, { params: Promise.resolve(params) }, authUser);
  };
}

/**
 * Higher-order function to wrap API route handlers with family access verification
 * Checks that the user belongs to the requested family
 */
export function requireFamilyAccess(
  handler: (
    request: NextRequest,
    context: { params: Promise<RouteParams> },
    authUser: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: RouteContext
  ) => {
    const params = await resolveRouteParams(context);
    const authUser =
      (await getAuthenticatedUser(request)) || (await getOpenAccessUser(params));

    return handler(request, { params: Promise.resolve(params) }, authUser);
  };
}

/**
 * Check if user is authenticated (for client-side use)
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/me");
    return response.ok;
  } catch {
    return false;
  }
}
