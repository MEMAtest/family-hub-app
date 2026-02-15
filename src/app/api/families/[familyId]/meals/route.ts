import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

// GET - Fetch all meals for a family (with optional date filtering)
export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause with optional date filtering
    const whereClause: any = {
      familyId: familyId
    };

    if (startDate && endDate) {
      whereClause.mealDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else if (startDate) {
      whereClause.mealDate = {
        gte: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.mealDate = {
        lte: new Date(endDate)
      };
    }

    const meals = await prisma.mealPlan.findMany({
      where: whereClause,
      orderBy: {
        mealDate: 'asc'
      }
    });

    return NextResponse.json(meals, { status: 200 });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meals' },
      { status: 500 }
    );
  }
});

// POST - Create new meal plan
export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();

    const {
      mealDate,
      mealName,
      proteinSource,
      carbohydrateSource,
      vegetableSource,
      estimatedCalories,
      mealNotes
    } = body;

    // Validation
    if (!mealDate || !mealName) {
      return NextResponse.json(
        { error: 'mealDate and mealName are required' },
        { status: 400 }
      );
    }

    const newMeal = await prisma.mealPlan.create({
      data: {
        familyId,
        mealDate: new Date(mealDate),
        mealName,
        proteinSource: proteinSource || null,
        carbohydrateSource: carbohydrateSource || null,
        vegetableSource: vegetableSource || null,
        estimatedCalories: estimatedCalories ? parseInt(estimatedCalories) : null,
        mealNotes: mealNotes || null,
        isEaten: false
      }
    });

    return NextResponse.json(newMeal, { status: 201 });
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    );
  }
});

// PUT - Update existing meal (handled in [mealId]/route.ts)
// DELETE - Delete meal (handled in [mealId]/route.ts)
