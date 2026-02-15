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

    let expenses = await prisma.budgetExpense.findMany({
      where: {
        familyId: familyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Apply deduplication first
    expenses = deduplicateRecurringItems(expenses);

    // If month/year parameters are provided, filter by month
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (!isNaN(monthNum) && !isNaN(yearNum)) {
        expenses = filterBudgetItemsByMonth(expenses, monthNum, yearNum);
      }
    }

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching budget expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget expenses' },
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

    const expense = await prisma.budgetExpense.create({
      data: {
        familyId: familyId,
        personId: validPersonId,
        expenseName: body.expenseName,
        amount: parseFloat(body.amount),
        category: body.category,
        budgetLimit: body.budgetLimit ? parseFloat(body.budgetLimit) : null,
        isRecurring: body.isRecurring || false,
        recurringFrequency: body.recurringFrequency || null,
        recurringStartDate: body.recurringStartDate ? new Date(body.recurringStartDate) : null,
        recurringEndDate: body.recurringEndDate ? new Date(body.recurringEndDate) : null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        isReceiptScan: body.isReceiptScan || false,
        receiptScanDate: body.receiptScanDate ? new Date(body.receiptScanDate) : null
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating budget expense:', error);
    return NextResponse.json(
      { error: 'Failed to create budget expense' },
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
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.budgetExpense.findFirst({
      where: { id, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expense = await prisma.budgetExpense.update({
      where: { id },
      data: {
        ...updateData,
        amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
        budgetLimit: updateData.budgetLimit ? parseFloat(updateData.budgetLimit) : undefined,
        paymentDate: updateData.paymentDate ? new Date(updateData.paymentDate) : undefined,
        recurringStartDate: updateData.recurringStartDate ? new Date(updateData.recurringStartDate) : undefined,
        recurringEndDate: updateData.recurringEndDate ? new Date(updateData.recurringEndDate) : undefined
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating budget expense:', error);
    return NextResponse.json(
      { error: 'Failed to update budget expense' },
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
        { error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.budgetExpense.findFirst({
      where: { id, familyId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.budgetExpense.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget expense' },
      { status: 500 }
    );
  }
});
