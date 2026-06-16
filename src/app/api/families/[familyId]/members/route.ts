import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { getOrCreateOpenFamily } from '@/lib/defaultFamilyPersistence';

// GET all family members
export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const family = await getOrCreateOpenFamily(familyId);
    const resolvedFamilyId = family?.id ?? familyId;
    const members = await prisma.familyMember.findMany({
      where: {
        familyId: resolvedFamilyId,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
});

// POST - Create new family member
export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const family = await getOrCreateOpenFamily(familyId);
    const resolvedFamilyId = family?.id ?? familyId;
    const body = await request.json();
    const { name, role, ageGroup, color, icon, fitnessGoals, dateOfBirth, avatarUrl } = body;
    const parsedDob = dateOfBirth ? new Date(dateOfBirth) : null;
    const dateOfBirthValue = parsedDob && !Number.isNaN(parsedDob.getTime()) ? parsedDob : null;

    const member = await prisma.familyMember.create({
      data: {
        familyId: resolvedFamilyId,
        name,
        role,
        ageGroup,
        dateOfBirth: dateOfBirthValue,
        avatarUrl: avatarUrl || null,
        color,
        icon,
        fitnessGoals,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error creating family member:', error);
    return NextResponse.json({ error: 'Failed to create family member' }, { status: 500 });
  }
});
