import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

interface ParsedShoppingOptimisation {
  summary: string;
  estimatedSavings?: {
    weekly?: number | null;
    monthly?: number | null;
  };
  listRecommendations: Array<{
    listName: string;
    actions: string[];
    storeSuggestions?: string[];
    estimatedSavings?: number | null;
  }>;
  substitutions: Array<{
    originalItem: string;
    alternative: string;
    reason: string;
    savings?: number | null;
    store?: string;
  }>;
  stockAlerts?: string[];
  nextActions?: string[];
}

const parseAiJson = (text: string): ParsedShoppingOptimisation => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI response did not contain JSON object.');
  }

  const jsonString = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
};

export const POST = requireFamilyAccess(async (_request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: {
        familyName: true,
      },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    const activeLists = await prisma.shoppingList.findMany({
      where: {
        familyId,
        isActive: true,
      },
      include: {
        items: {
          where: { isCompleted: false },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const recentPurchases = await prisma.shoppingItem.findMany({
      where: {
        list: {
          familyId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 25,
      include: {
        list: {
          select: {
            storeChain: true,
          },
        },
      },
    });

    const aiInput = {
      familyName: family.familyName,
      activeLists: activeLists.map((list) => ({
        listName: list.listName,
        storeChain: list.storeChain ?? null,
        items: list.items.map((item) => ({
          name: item.itemName,
          category: item.category,
          estimatedPrice: item.estimatedPrice,
          isCompleted: item.isCompleted,
        })),
      })),
      recentPurchases: recentPurchases.map((item) => ({
        itemName: item.itemName,
        storeChain: item.list?.storeChain ?? null,
        price: item.estimatedPrice,
        purchasedAt: item.completedAt
          ? item.completedAt.toISOString().split('T')[0]
          : item.createdAt.toISOString().split('T')[0],
      })),
      budgetNotes: [],
    };

    const aiResponse = await aiService.optimiseShoppingLists(aiInput);
    const optimisation = parseAiJson(aiResponse);

    return NextResponse.json(
      {
        optimisation,
        raw: aiResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('AI shopping optimisation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate shopping optimisation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
