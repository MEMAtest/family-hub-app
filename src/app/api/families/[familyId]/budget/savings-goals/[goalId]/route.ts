import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, goalId } = await context.params;
    const body = await request.json();

    const existing = await prisma.savingsGoal.findFirst({
      where: { id: goalId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }

    const updated = await prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        goalName: body.goalName ? String(body.goalName) : undefined,
        goalDescription: body.goalDescription === null ? null : body.goalDescription ? String(body.goalDescription) : undefined,
        targetAmount: body.targetAmount === undefined ? undefined : Number(body.targetAmount),
        currentAmount: body.currentAmount === undefined ? undefined : Number(body.currentAmount),
        targetDate: body.targetDate === null ? null : body.targetDate ? new Date(body.targetDate) : undefined,
        priority: body.priority ? String(body.priority) : undefined,
        category: body.category ? String(body.category) : undefined,
        isActive: body.isActive === undefined ? undefined : Boolean(body.isActive),
        autoContribution: body.autoContribution === null ? null : body.autoContribution === undefined ? undefined : Number(body.autoContribution),
        contributionFreq: body.contributionFreq === null ? null : body.contributionFreq ? String(body.contributionFreq) : undefined,
      },
      include: {
        contributions: {
          orderBy: { contributionDate: 'desc' },
          take: 25,
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating savings goal:', error);
    return NextResponse.json({ error: 'Failed to update savings goal' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, goalId } = await context.params;

    const existing = await prisma.savingsGoal.findFirst({
      where: { id: goalId, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }

    await prisma.savingsGoal.delete({ where: { id: goalId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    return NextResponse.json({ error: 'Failed to delete savings goal' }, { status: 500 });
  }
});

