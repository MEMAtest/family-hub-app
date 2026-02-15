import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

// GET - Fetch single meal by ID
export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, mealId } = await context.params;

    const meal = await prisma.mealPlan.findFirst({
      where: {
        id: mealId,
        familyId: familyId
      }
    });

    if (!meal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(meal, { status: 200 });
  } catch (error) {
    console.error('Error fetching meal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal' },
      { status: 500 }
    );
  }
});

// PUT - Update existing meal
export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, mealId } = await context.params;
    const body = await request.json();

    // Check if meal exists and belongs to family
    const existingMeal = await prisma.mealPlan.findFirst({
      where: {
        id: mealId,
        familyId: familyId
      }
    });

    if (!existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }

    const {
      mealDate,
      mealName,
      proteinSource,
      carbohydrateSource,
      vegetableSource,
      estimatedCalories,
      mealNotes,
      isEaten
    } = body;

    const updatedMeal = await prisma.mealPlan.update({
      where: { id: mealId },
      data: {
        ...(mealDate && { mealDate: new Date(mealDate) }),
        ...(mealName && { mealName }),
        ...(proteinSource !== undefined && { proteinSource }),
        ...(carbohydrateSource !== undefined && { carbohydrateSource }),
        ...(vegetableSource !== undefined && { vegetableSource }),
        ...(estimatedCalories !== undefined && {
          estimatedCalories: estimatedCalories ? parseInt(estimatedCalories) : null
        }),
        ...(mealNotes !== undefined && { mealNotes }),
        ...(isEaten !== undefined && { isEaten })
      }
    });

    return NextResponse.json(updatedMeal, { status: 200 });
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json(
      { error: 'Failed to update meal' },
      { status: 500 }
    );
  }
});

// DELETE - Delete meal
export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, mealId } = await context.params;

    // Check if meal exists and belongs to family
    const existingMeal = await prisma.mealPlan.findFirst({
      where: {
        id: mealId,
        familyId: familyId
      }
    });

    if (!existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }

    await prisma.mealPlan.delete({
      where: { id: mealId }
    });

    return NextResponse.json(
      { message: 'Meal deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
});

// PATCH - Mark meal as eaten
export const PATCH = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, mealId } = await context.params;
    const body = await request.json();
    const { action } = body;

    // Check if meal exists and belongs to family
    const existingMeal = await prisma.mealPlan.findFirst({
      where: {
        id: mealId,
        familyId: familyId
      }
    });

    if (!existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }

    if (action === 'mark-eaten') {
      const updatedMeal = await prisma.mealPlan.update({
        where: { id: mealId },
        data: {
          isEaten: true,
          eatenAt: new Date()
        }
      });

      return NextResponse.json(updatedMeal, { status: 200 });
    } else if (action === 'unmark-eaten') {
      const updatedMeal = await prisma.mealPlan.update({
        where: { id: mealId },
        data: {
          isEaten: false,
          eatenAt: null
        }
      });

      return NextResponse.json(updatedMeal, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "mark-eaten" or "unmark-eaten"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating meal status:', error);
    return NextResponse.json(
      { error: 'Failed to update meal status' },
      { status: 500 }
    );
  }
});
