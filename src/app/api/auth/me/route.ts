import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from Neon Auth
    const auth = await neonAuth();

    if (!auth.session || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create user in our database
    let dbUser = await prisma.user.findUnique({
      where: { neonAuthId: auth.user.id },
      include: {
        familyMembers: {
          include: {
            family: true,
          },
        },
        ownedFamilies: true,
      },
    });

    if (!dbUser) {
      // Create new user record (but they still need to complete onboarding)
      dbUser = await prisma.user.create({
        data: {
          neonAuthId: auth.user.id,
          email: auth.user.email || "",
          displayName: auth.user.name || auth.user.email?.split("@")[0],
          avatarUrl: auth.user.image,
          authProvider: "neon",
        },
        include: {
          familyMembers: {
            include: {
              family: true,
            },
          },
          ownedFamilies: true,
        },
      });
    }

    // Get the user's family (one family per user model)
    const family = dbUser.ownedFamilies[0] || dbUser.familyMembers[0]?.family;
    const familyMember = dbUser.familyMembers[0];

    return NextResponse.json({
      user: {
        id: dbUser.id,
        neonAuthId: dbUser.neonAuthId,
        email: dbUser.email,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      },
      family: family
        ? {
            id: family.id,
            familyName: family.familyName,
            familyCode: family.familyCode,
            createdAt: family.createdAt,
          }
        : null,
      familyMember: familyMember
        ? {
            id: familyMember.id,
            name: familyMember.name,
            role: familyMember.role,
            ageGroup: familyMember.ageGroup,
            color: familyMember.color,
            icon: familyMember.icon,
          }
        : null,
      needsOnboarding: !family,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
