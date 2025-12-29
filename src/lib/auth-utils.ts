import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
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

/**
 * Get the authenticated user from Neon Auth and our database
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const auth = await neonAuth();

    if (!auth.session || !auth.user) {
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { neonAuthId: auth.user.id },
      include: {
        ownedFamilies: true,
        familyMembers: {
          include: { family: true },
        },
      },
    });

    if (!dbUser) {
      return null;
    }

    const familyId =
      dbUser.ownedFamilies[0]?.id || dbUser.familyMembers[0]?.familyId;
    const familyMemberId = dbUser.familyMembers[0]?.id;

    if (!familyId || !familyMemberId) {
      return null;
    }

    return {
      neonUserId: auth.user.id,
      dbUser: {
        id: dbUser.id,
        email: dbUser.email,
        neonAuthId: dbUser.neonAuthId!,
        displayName: dbUser.displayName,
      },
      familyId,
      familyMemberId,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function requireAuth(
  handler: (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    authUser: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(request, context, authUser);
  };
}

/**
 * Higher-order function to wrap API route handlers with family access verification
 * Checks that the user belongs to the requested family
 */
export function requireFamilyAccess(
  handler: (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
    authUser: AuthenticatedUser
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to the requested family
    const params = await context.params;
    const familyId = params.familyId;

    if (familyId && familyId !== authUser.familyId) {
      return NextResponse.json(
        { error: "Access denied to this family" },
        { status: 403 }
      );
    }

    return handler(request, context, authUser);
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
