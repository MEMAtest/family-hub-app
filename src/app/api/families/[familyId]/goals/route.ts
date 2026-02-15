import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;

    const goals = await prisma.familyGoal.findMany({
      where: {
        familyId: familyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching family goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family goals' },
      { status: 500 }
    );
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();

    const goal = await prisma.familyGoal.create({
      data: {
        familyId: familyId,
        goalTitle: body.title,
        goalDescription: body.description || '',
        goalType: body.type,
        targetValue: body.targetValue || '',
        currentProgress: body.currentProgress || 0,
        deadline: body.deadline ? new Date(body.deadline) : null,
        participants: body.participants || [],
        milestones: body.milestones || []
      }
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error creating family goal:', error);
    return NextResponse.json(
      { error: 'Failed to create family goal' },
      { status: 500 }
    );
  }
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const existing = await prisma.familyGoal.findFirst({
      where: { id, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const goal = await prisma.familyGoal.update({
      where: { id },
      data: {
        ...updateData,
        deadline: updateData.deadline ? new Date(updateData.deadline) : undefined,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error updating family goal:', error);
    return NextResponse.json(
      { error: 'Failed to update family goal' },
      { status: 500 }
    );
  }
});

export const DELETE = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.familyGoal.findFirst({
      where: { id, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await prisma.familyGoal.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting family goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete family goal' },
      { status: 500 }
    );
  }
});
