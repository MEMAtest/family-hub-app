import { NextRequest, NextResponse } from 'next/server';
import { deduplicateRecurringItems, filterBudgetItemsByMonth } from '@/utils/budgetMonthFilter';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { z } from 'zod';
import { validateIncomePlan } from '@/lib/budget/incomePlan';

export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let income = await prisma.budgetIncome.findMany({
      where: {
        familyId: familyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Apply deduplication first
    income = deduplicateRecurringItems(income);

    // If month/year parameters are provided, filter by month
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (!isNaN(monthNum) && !isNaN(yearNum)) {
        income = filterBudgetItemsByMonth(income, monthNum, yearNum);
      }
    }

    return NextResponse.json(income);
  } catch (error) {
    console.error('Error fetching budget income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget income' },
      { status: 500 }
    );
  }
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = z.record(z.unknown()).parse(await request.json());
    const plan = validateIncomePlan(body);

    // Handle personId - if it's not a valid database ID or doesn't exist, set to null
    let validPersonId = typeof body.personId === 'string' ? body.personId : null;

    if (validPersonId && validPersonId !== 'null' && validPersonId !== 'undefined') {
      // Check if the person exists
      const personExists = await prisma.familyMember.findFirst({
        where: { id: validPersonId, familyId }
      });

      if (!personExists) {
        validPersonId = null;
      }
    } else {
      validPersonId = null;
    }

    const income = await prisma.budgetIncome.create({
      data: {
        familyId: familyId,
        personId: validPersonId,
        ...plan,
      }
    });

    return NextResponse.json(income);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Invalid income plan.' }, { status: 400 });
    console.error('Error creating budget income:', error);
    return NextResponse.json(
      { error: 'Failed to create budget income' },
      { status: 500 }
    );
  }
});

export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = z.record(z.unknown()).parse(await request.json());
    const id = typeof body.id === 'string' ? body.id : null;

    if (!id) {
      return NextResponse.json({ error: 'Income ID is required' }, { status: 400 });
    }

    const existing = await prisma.budgetIncome.findFirst({
      where: { id, familyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    const plan = validateIncomePlan({
      ...existing,
      recurringStartDate: existing.recurringStartDate ?? (existing.isRecurring ? existing.createdAt : null),
      paymentDate: existing.paymentDate ?? (!existing.isRecurring ? existing.createdAt : null),
      ...body,
    });

    const validPerson = typeof body.personId === 'string' && body.personId
      ? await prisma.familyMember.findFirst({ where: { id: body.personId, familyId }, select: { id: true } })
      : null;

    const income = await prisma.budgetIncome.update({
      where: { id },
      data: {
        ...plan,
        personId: body.personId !== undefined ? validPerson?.id ?? null : undefined,
      }
    });

    return NextResponse.json(income);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Invalid income plan.' }, { status: 400 });
    console.error('Error updating budget income:', error);
    return NextResponse.json(
      { error: 'Failed to update budget income' },
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
        { error: 'Income ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.budgetIncome.findFirst({
      where: { id, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    await prisma.budgetIncome.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget income:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget income' },
      { status: 500 }
    );
  }
});
