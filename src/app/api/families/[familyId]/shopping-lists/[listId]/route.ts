import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

// GET - Fetch single shopping list by ID
export const GET = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, listId } = await context.params;

    const list = await prisma.shoppingList.findFirst({
      where: {
        id: listId,
        familyId: familyId
      },
      include: {
        items: true
      }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list' },
      { status: 500 }
    );
  }
});

// PUT - Update shopping list
export const PUT = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId, listId } = await context.params;
    const body = await request.json();

    // Check if list exists and belongs to family
    const existingList = await prisma.shoppingList.findFirst({
      where: {
        id: listId,
        familyId: familyId
      }
    });

    if (!existingList) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    const {
      listName,
      category,
      storeChain,
      customStore,
      isActive
    } = body;

    const updatedList = await prisma.shoppingList.update({
      where: { id: listId },
      data: {
        ...(listName && { listName }),
        ...(category !== undefined && { category }),
        ...(storeChain !== undefined && { storeChain }),
        ...(customStore !== undefined && { customStore }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(updatedList, { status: 200 });
  } catch (error) {
    console.error('Error updating shopping list:', error);
    return NextResponse.json(
      { error: 'Failed to update shopping list' },
      { status: 500 }
    );
  }
});

// DELETE - Delete shopping list
export const DELETE = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId, listId } = await context.params;

    // Check if list exists and belongs to family
    const existingList = await prisma.shoppingList.findFirst({
      where: {
        id: listId,
        familyId: familyId
      }
    });

    if (!existingList) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    await prisma.shoppingList.delete({
      where: { id: listId }
    });

    return NextResponse.json(
      { message: 'Shopping list deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    return NextResponse.json(
      { error: 'Failed to delete shopping list' },
      { status: 500 }
    );
  }
});
