import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;

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
}

export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
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
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

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
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
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
}