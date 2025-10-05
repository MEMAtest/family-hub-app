import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;

    const expenses = await prisma.budgetExpense.findMany({
      where: {
        familyId: familyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching budget expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget expenses' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
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
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null
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
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const expense = await prisma.budgetExpense.update({
      where: { id },
      data: {
        ...updateData,
        amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
        budgetLimit: updateData.budgetLimit ? parseFloat(updateData.budgetLimit) : undefined,
        paymentDate: updateData.paymentDate ? new Date(updateData.paymentDate) : undefined
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
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400 }
      );
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
}