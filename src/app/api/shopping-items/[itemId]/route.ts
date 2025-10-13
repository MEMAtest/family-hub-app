import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch single shopping item
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;

    const item = await prisma.shoppingItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Shopping item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    console.error('Error fetching shopping item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping item' },
      { status: 500 }
    );
  }
}

// PUT - Update shopping item
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;
    const body = await request.json();

    const existingItem = await prisma.shoppingItem.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Shopping item not found' },
        { status: 404 }
      );
    }

    const {
      itemName,
      estimatedPrice,
      category,
      frequency,
      personId,
      isCompleted
    } = body;

    const updatedItem = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        ...(itemName && { itemName }),
        ...(estimatedPrice !== undefined && { estimatedPrice: parseFloat(estimatedPrice) }),
        ...(category !== undefined && { category }),
        ...(frequency !== undefined && { frequency }),
        ...(personId !== undefined && { personId }),
        ...(isCompleted !== undefined && { isCompleted })
      }
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Error updating shopping item:', error);
    return NextResponse.json(
      { error: 'Failed to update shopping item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete shopping item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;

    const existingItem = await prisma.shoppingItem.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Shopping item not found' },
        { status: 404 }
      );
    }

    await prisma.shoppingItem.delete({
      where: { id: itemId }
    });

    return NextResponse.json(
      { message: 'Shopping item deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    return NextResponse.json(
      { error: 'Failed to delete shopping item' },
      { status: 500 }
    );
  }
}

// PATCH - Toggle item completion
export async function PATCH(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;
    const body = await request.json();
    const { action } = body;

    const existingItem = await prisma.shoppingItem.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Shopping item not found' },
        { status: 404 }
      );
    }

    if (action === 'toggle-complete') {
      const updatedItem = await prisma.shoppingItem.update({
        where: { id: itemId },
        data: {
          isCompleted: !existingItem.isCompleted,
          completedAt: !existingItem.isCompleted ? new Date() : null
        }
      });

      return NextResponse.json(updatedItem, { status: 200 });
    } else if (action === 'mark-complete') {
      const updatedItem = await prisma.shoppingItem.update({
        where: { id: itemId },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });

      return NextResponse.json(updatedItem, { status: 200 });
    } else if (action === 'mark-incomplete') {
      const updatedItem = await prisma.shoppingItem.update({
        where: { id: itemId },
        data: {
          isCompleted: false,
          completedAt: null
        }
      });

      return NextResponse.json(updatedItem, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "toggle-complete", "mark-complete", or "mark-incomplete"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating shopping item status:', error);
    return NextResponse.json(
      { error: 'Failed to update shopping item status' },
      { status: 500 }
    );
  }
}
