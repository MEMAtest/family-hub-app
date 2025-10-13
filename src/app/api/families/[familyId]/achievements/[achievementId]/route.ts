import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch single achievement by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string; achievementId: string } }
) {
  try {
    const { familyId, achievementId } = params;

    const achievement = await prisma.achievement.findFirst({
      where: {
        id: achievementId,
        familyId: familyId
      }
    });

    if (!achievement) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(achievement, { status: 200 });
  } catch (error) {
    console.error('Error fetching achievement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievement' },
      { status: 500 }
    );
  }
}

// DELETE - Delete achievement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { familyId: string; achievementId: string } }
) {
  try {
    const { familyId, achievementId } = params;

    // Check if achievement exists and belongs to family
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        id: achievementId,
        familyId: familyId
      }
    });

    if (!existingAchievement) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    await prisma.achievement.delete({
      where: { id: achievementId }
    });

    return NextResponse.json(
      { message: 'Achievement deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json(
      { error: 'Failed to delete achievement' },
      { status: 500 }
    );
  }
}
