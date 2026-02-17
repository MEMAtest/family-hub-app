import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    void request;
    const family = await prisma.family.findFirst({
      include: {
        members: true,
      },
    });
    const familyMember = family?.members[0] || null;

    return NextResponse.json({
      user: {
        id: "local-open-user",
        neonAuthId: null,
        email: "local@family-hub.app",
        displayName: "Local Family User",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
