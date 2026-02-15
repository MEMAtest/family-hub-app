import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const goals = await prisma.savingsGoal.findMany({
      where: {
        familyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        contributions: {
          orderBy: { contributionDate: 'desc' },
          take: 25,
        },
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    return NextResponse.json({ error: 'Failed to fetch savings goals' }, { status: 500 });
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();

    if (!body?.goalName || body?.targetAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: goalName, targetAmount' },
        { status: 400 }
      );
    }

    const targetAmount = Number(body.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json({ error: 'targetAmount must be a positive number' }, { status: 400 });
    }

    const created = await prisma.savingsGoal.create({
      data: {
        familyId,
        goalName: String(body.goalName),
        goalDescription: body.goalDescription ? String(body.goalDescription) : null,
        targetAmount,
        currentAmount: body.currentAmount === undefined ? 0 : Number(body.currentAmount),
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        priority: body.priority ? String(body.priority) : 'medium',
        category: body.category ? String(body.category) : 'general',
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        autoContribution: body.autoContribution === undefined ? null : Number(body.autoContribution),
        contributionFreq: body.contributionFreq ? String(body.contributionFreq) : null,
      },
      include: {
        contributions: true,
      },
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error creating savings goal:', error);
    return NextResponse.json({ error: 'Failed to create savings goal' }, { status: 500 });
  }
});

