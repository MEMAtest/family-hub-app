import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { familyId: string; memberId: string } }
) {
  try {
    const body = await request.json();
    const parsedDob = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const dateOfBirthValue = parsedDob && !Number.isNaN(parsedDob.getTime()) ? parsedDob : null;
    const existing = await prisma.familyMember.findFirst({
      where: {
        id: params.memberId,
        familyId: params.familyId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    const member = await prisma.familyMember.update({
      where: { id: params.memberId },
      data: {
        name: body.name ?? existing.name,
        role: body.role ?? existing.role,
        ageGroup: body.ageGroup ?? existing.ageGroup,
        dateOfBirth: body.dateOfBirth === undefined ? existing.dateOfBirth : dateOfBirthValue,
        avatarUrl: body.avatarUrl === undefined ? existing.avatarUrl : body.avatarUrl,
        color: body.color ?? existing.color,
        icon: body.icon ?? existing.icon,
        fitnessGoals: body.fitnessGoals ?? existing.fitnessGoals,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error updating family member:', error);
    return NextResponse.json({ error: 'Failed to update family member' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { familyId: string; memberId: string } }
) {
  try {
    const existing = await prisma.familyMember.findFirst({
      where: {
        id: params.memberId,
        familyId: params.familyId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    await prisma.familyMember.delete({
      where: { id: params.memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return NextResponse.json({ error: 'Failed to delete family member' }, { status: 500 });
  }
}
