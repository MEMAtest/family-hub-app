import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all items for a shopping list
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string; listId: string } }
) {
  try {
    const { familyId, listId } = params;

    // Verify list belongs to family
    const list = await prisma.shoppingList.findFirst({
      where: {
        id: listId,
        familyId: familyId
      }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    const items = await prisma.shoppingItem.findMany({
      where: {
        listId: listId
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error fetching shopping items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping items' },
      { status: 500 }
    );
  }
}

// POST - Add item to shopping list
export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string; listId: string } }
) {
  try {
    const { familyId, listId } = params;
    const body = await request.json();

    // Verify list belongs to family
    const list = await prisma.shoppingList.findFirst({
      where: {
        id: listId,
        familyId: familyId
      }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    const {
      itemName,
      estimatedPrice,
      category,
      frequency,
      personId
    } = body;

    // Validation
    if (!itemName) {
      return NextResponse.json(
        { error: 'itemName is required' },
        { status: 400 }
      );
    }

    const newItem = await prisma.shoppingItem.create({
      data: {
        listId,
        itemName,
        estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : 0.00,
        category: category || 'General',
        frequency: frequency || null,
        personId: personId || null,
        isCompleted: false
      }
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating shopping item:', error);
    return NextResponse.json(
      { error: 'Failed to create shopping item' },
      { status: 500 }
    );
  }
}
