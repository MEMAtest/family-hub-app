import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;

    const income = await prisma.budgetIncome.findMany({
      where: {
        familyId: familyId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(income);
  } catch (error) {
    console.error('Error fetching budget income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget income' },
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

    const income = await prisma.budgetIncome.create({
      data: {
        familyId: familyId,
        personId: body.personId,
        incomeName: body.incomeName,
        amount: parseFloat(body.amount),
        category: body.category,
        isRecurring: body.isRecurring || false,
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
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    const income = await prisma.budgetIncome.update({
      where: { id },
      data: {
        ...updateData,
        amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
        paymentDate: updateData.paymentDate ? new Date(updateData.paymentDate) : undefined
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
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Income ID is required' },
        { status: 400 }
      );
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
}