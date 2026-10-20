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
      const personExists = await prisma.familyMember.findFirst({
        where: { id: validPersonId, familyId }
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
    const { id } = body;

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

    const validPerson = body.personId
      ? await prisma.familyMember.findFirst({ where: { id: body.personId, familyId }, select: { id: true } })
      : null;

    const expense = await prisma.budgetExpense.update({
      where: { id },
      data: {
        expenseName: typeof body.expenseName === 'string' ? body.expenseName : undefined,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        category: typeof body.category === 'string' ? body.category : undefined,
        budgetLimit: body.budgetLimit !== undefined && body.budgetLimit !== null ? parseFloat(body.budgetLimit) : body.budgetLimit === null ? null : undefined,
        isRecurring: typeof body.isRecurring === 'boolean' ? body.isRecurring : undefined,
        recurringFrequency: body.recurringFrequency ?? undefined,
        recurringStartDate: body.recurringStartDate ? new Date(body.recurringStartDate) : body.recurringStartDate === null ? null : undefined,
        recurringEndDate: body.recurringEndDate ? new Date(body.recurringEndDate) : body.recurringEndDate === null ? null : undefined,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : body.paymentDate === null ? null : undefined,
        personId: body.personId === null ? null : validPerson?.id,
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
