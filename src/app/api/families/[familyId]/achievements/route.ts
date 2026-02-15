import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

// GET - Fetch all achievements for a family (with optional person filtering)
export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const personId = searchParams.get('personId');

    // Build where clause with optional person filtering
    const whereClause: any = {
      familyId: familyId
    };

    if (personId) {
      whereClause.personId = personId;
    }

    const achievements = await prisma.achievement.findMany({
      where: whereClause,
      orderBy: {
        achievedDate: 'desc'
      }
    });

    return NextResponse.json(achievements, { status: 200 });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
});

// POST - Create new achievement
export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();

    const {
      personId,
      title,
      description,
      category,
      badge,
      pointsAwarded,
      achievedDate
    } = body;

    // Validation
    if (!personId || !title || !category) {
      return NextResponse.json(
        { error: 'personId, title, and category are required' },
        { status: 400 }
      );
    }

    const newAchievement = await prisma.achievement.create({
      data: {
        familyId,
        personId,
        achievementTitle: title,
        achievementDescription: description || null,
        category,
        badgeEmoji: badge || '🏆',
        pointsAwarded: pointsAwarded ? parseInt(pointsAwarded) : 0,
        achievedDate: achievedDate ? new Date(achievedDate) : new Date()
      }
    });

    return NextResponse.json(newAchievement, { status: 201 });
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    );
  }
});
