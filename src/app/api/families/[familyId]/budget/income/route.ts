import { NextRequest, NextResponse } from 'next/server';
import { deduplicateRecurringItems, filterBudgetItemsByMonth } from '@/utils/budgetMonthFilter';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

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
    const body = await request.json();

    // Handle personId - if it's not a valid database ID or doesn't exist, set to null
    let validPersonId = body.personId;

    if (validPersonId && validPersonId !== 'null' && validPersonId !== 'undefined') {
      // Check if the person exists
      const personExists = await prisma.familyMember.findUnique({
        where: { id: validPersonId }
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
        incomeName: body.incomeName,
        amount: parseFloat(body.amount),
        category: body.category,
        isRecurring: body.isRecurring || false,
        recurringFrequency: body.recurringFrequency || null,
        recurringStartDate: body.recurringStartDate ? new Date(body.recurringStartDate) : null,
        recurringEndDate: body.recurringEndDate ? new Date(body.recurringEndDate) : null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null
      }
    });

    return NextResponse.json(income);
  } catch (error) {
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
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Income ID is required' }, { status: 400 });
    }

    const existing = await prisma.budgetIncome.findFirst({
      where: { id, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    const income = await prisma.budgetIncome.update({
      where: { id },
      data: {
        ...updateData,
        amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
        paymentDate: updateData.paymentDate ? new Date(updateData.paymentDate) : undefined,
        recurringStartDate: updateData.recurringStartDate ? new Date(updateData.recurringStartDate) : undefined,
        recurringEndDate: updateData.recurringEndDate ? new Date(updateData.recurringEndDate) : undefined
      }
    });

    return NextResponse.json(income);
  } catch (error) {
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
