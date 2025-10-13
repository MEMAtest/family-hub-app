import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all shopping lists for a family (with optional active filter)
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
    const { searchParams } = new URL(request.url);

    const activeOnly = searchParams.get('activeOnly');

    // Build where clause with optional active filtering
    const whereClause: any = {
      familyId: familyId
    };

    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }

    const shoppingLists = await prisma.shoppingList.findMany({
      where: whereClause,
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(shoppingLists, { status: 200 });
  } catch (error) {
    console.error('Error fetching shopping lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping lists' },
      { status: 500 }
    );
  }
}

// POST - Create new shopping list
export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
    const body = await request.json();

    const {
      listName,
      category,
      storeChain,
      customStore
    } = body;

    // Validation
    if (!listName) {
      return NextResponse.json(
        { error: 'listName is required' },
        { status: 400 }
      );
    }

    const newList = await prisma.shoppingList.create({
      data: {
        familyId,
        listName,
        category: category || 'General',
        storeChain: storeChain || null,
        customStore: customStore || null,
        isActive: true
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(newList, { status: 201 });
  } catch (error) {
    console.error('Error creating shopping list:', error);
    return NextResponse.json(
      { error: 'Failed to create shopping list' },
      { status: 500 }
    );
  }
}
