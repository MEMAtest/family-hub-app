import { NextRequest, NextResponse } from "next/server";
import { neonAuth } from "@neondatabase/neon-js/auth/next/server";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from Neon Auth
    const auth = await neonAuth();

    if (!auth.session || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { familyName, memberName, color, icon, displayName, avatarUrl } = body;

    if (!familyName || !memberName) {
      return NextResponse.json(
        { error: "Family name and member name are required" },
        { status: 400 }
      );
    }

    // Check if user already has a family
    const existingUser = await prisma.user.findUnique({
      where: { neonAuthId: auth.user.id },
      include: { ownedFamilies: true, familyMembers: true },
    });

    if (existingUser?.ownedFamilies.length || existingUser?.familyMembers.length) {
      return NextResponse.json(
        { error: "User already has a family" },
        { status: 400 }
      );
    }

    // Create user, family, and family member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update user
      const user = await tx.user.upsert({
        where: { neonAuthId: auth.user.id },
        update: {
          displayName: displayName || memberName,
          avatarUrl: avatarUrl,
        },
        create: {
          neonAuthId: auth.user.id,
          email: auth.user.email || "",
          displayName: displayName || memberName,
          avatarUrl: avatarUrl,
          authProvider: "neon",
        },
      });

      // Create family with unique code
      const familyCode = nanoid(8).toUpperCase();
      const family = await tx.family.create({
        data: {
          familyName,
          familyCode,
          ownerId: user.id,
        },
      });

      // Create family member for the owner
      const familyMember = await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId: user.id,
          name: memberName,
          role: "Parent",
          ageGroup: "Adult",
          color: color || "#3B82F6",
          icon: icon || "👤",
        },
      });

      return { user, family, familyMember };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
      family: {
        id: result.family.id,
        familyName: result.family.familyName,
        familyCode: result.family.familyCode,
      },
      familyMember: {
        id: result.familyMember.id,
        name: result.familyMember.name,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create family" },
      { status: 500 }
    );
  }
}
