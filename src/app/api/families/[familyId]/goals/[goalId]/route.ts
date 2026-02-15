import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

// GET - Fetch single goal by ID
export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, goalId } = await context.params;

    const goal = await prisma.familyGoal.findFirst({
      where: {
        id: goalId,
        familyId: familyId
      }
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(goal, { status: 200 });
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
      { status: 500 }
    );
  }
});

// PUT - Update existing goal
export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, goalId } = await context.params;
    const body = await request.json();

    // Check if goal exists and belongs to family
    const existingGoal = await prisma.familyGoal.findFirst({
      where: {
        id: goalId,
        familyId: familyId
      }
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    const {
      title,
      description,
      type,
      targetValue,
      currentProgress,
      deadline,
      participants,
      milestones
    } = body;

    const updatedGoal = await prisma.familyGoal.update({
      where: { id: goalId },
      data: {
        ...(title && { goalTitle: title }),
        ...(description !== undefined && { goalDescription: description }),
        ...(type && { goalType: type }),
        ...(targetValue !== undefined && { targetValue }),
        ...(currentProgress !== undefined && { currentProgress: parseInt(currentProgress) }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(participants !== undefined && { participants }),
        ...(milestones !== undefined && { milestones }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedGoal, { status: 200 });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
});

// DELETE - Delete goal
export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, goalId } = await context.params;

    // Check if goal exists and belongs to family
    const existingGoal = await prisma.familyGoal.findFirst({
      where: {
        id: goalId,
        familyId: familyId
      }
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    await prisma.familyGoal.delete({
      where: { id: goalId }
    });

    return NextResponse.json(
      { message: 'Goal deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
});

// PATCH - Update goal progress
export const PATCH = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, goalId } = await context.params;
    const body = await request.json();
    const { action, progress, milestone } = body;

    // Check if goal exists and belongs to family
    const existingGoal = await prisma.familyGoal.findFirst({
      where: {
        id: goalId,
        familyId: familyId
      }
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    if (action === 'update-progress') {
      if (progress === undefined || progress < 0 || progress > 100) {
        return NextResponse.json(
          { error: 'Progress must be between 0 and 100' },
          { status: 400 }
        );
      }

      const updatedGoal = await prisma.familyGoal.update({
        where: { id: goalId },
        data: {
          currentProgress: parseInt(progress),
          updatedAt: new Date()
        }
      });

      return NextResponse.json(updatedGoal, { status: 200 });
    } else if (action === 'add-milestone') {
      if (!milestone || !milestone.title) {
        return NextResponse.json(
          { error: 'Milestone title is required' },
          { status: 400 }
        );
      }

      const currentMilestones = existingGoal.milestones as any[] || [];
      const newMilestone = {
        id: `milestone-${Date.now()}`,
        title: milestone.title,
        description: milestone.description || '',
        targetDate: milestone.targetDate || null,
        isCompleted: false,
        completedAt: null
      };

      const updatedGoal = await prisma.familyGoal.update({
        where: { id: goalId },
        data: {
          milestones: [...currentMilestones, newMilestone],
          updatedAt: new Date()
        }
      });

      return NextResponse.json(updatedGoal, { status: 200 });
    } else if (action === 'complete-milestone') {
      if (!milestone || !milestone.id) {
        return NextResponse.json(
          { error: 'Milestone ID is required' },
          { status: 400 }
        );
      }

      const currentMilestones = existingGoal.milestones as any[] || [];
      const updatedMilestones = currentMilestones.map((m: any) => {
        if (m.id === milestone.id) {
          return {
            ...m,
            isCompleted: true,
            completedAt: new Date().toISOString()
          };
        }
        return m;
      });

      const updatedGoal = await prisma.familyGoal.update({
        where: { id: goalId },
        data: {
          milestones: updatedMilestones,
          updatedAt: new Date()
        }
      });

      return NextResponse.json(updatedGoal, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "update-progress", "add-milestone", or "complete-milestone"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating goal status:', error);
    return NextResponse.json(
      { error: 'Failed to update goal status' },
      { status: 500 }
    );
  }
});
