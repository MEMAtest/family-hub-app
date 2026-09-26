import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";
import { getCurrentSessionIdentity, getOrCreateUserForIdentity } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const identity = await getCurrentSessionIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
    }
    const authenticatedUser = await getOrCreateUserForIdentity(identity);
    const body = await request.json();
    const { familyName, memberName, color, icon, displayName, avatarUrl, email } = body;

    if (!familyName || !memberName) {
      return NextResponse.json(
        { error: "Family name and member name are required" },
        { status: 400 }
      );
    }

    // Single-family app setup: avoid creating duplicate root families accidentally.
    const existingFamily = await prisma.family.findFirst({
      select: { id: true },
    });

    if (existingFamily) {
      return NextResponse.json(
        { error: "Family already exists. Use the Family section to add members." },
        { status: 400 }
      );
    }

    void email;

    // Create owner user, family, and first family member in a transaction.
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: authenticatedUser.id },
        data: { displayName: displayName || memberName, avatarUrl: avatarUrl },
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
