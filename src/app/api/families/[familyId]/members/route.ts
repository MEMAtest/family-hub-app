import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all family members
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const members = await prisma.familyMember.findMany({
      where: {
        familyId: params.familyId,
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

// POST - Create new family member
export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const body = await request.json();
    const { name, role, ageGroup, color, icon, fitnessGoals, dateOfBirth, avatarUrl } = body;
    const parsedDob = dateOfBirth ? new Date(dateOfBirth) : null;
    const dateOfBirthValue = parsedDob && !Number.isNaN(parsedDob.getTime()) ? parsedDob : null;

    const member = await prisma.familyMember.create({
      data: {
        familyId: params.familyId,
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
}
