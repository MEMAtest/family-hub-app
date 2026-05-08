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

const buildFallbackOptimisation = (data: {
  activeLists: Array<{
    listName: string;
    storeChain?: string | null;
    items: Array<{
      name: string;
      category?: string | null;
      estimatedPrice?: number | null;
    }>;
  }>;
}): ParsedShoppingOptimisation => {
  const totalItems = data.activeLists.reduce((sum, list) => sum + list.items.length, 0);
  const estimatedTotal = data.activeLists.reduce(
    (sum, list) => sum + list.items.reduce((listSum, item) => listSum + (item.estimatedPrice ?? 0), 0),
    0
  );

  return {
    summary: totalItems > 0
      ? `AI suggestions are temporarily unavailable, so Omosanya Home prepared a practical checklist from ${totalItems} open item${totalItems === 1 ? '' : 's'} across ${data.activeLists.length} active list${data.activeLists.length === 1 ? '' : 's'}.`
      : 'AI suggestions are temporarily unavailable. Add items to a shopping list and Omosanya Home can prepare a practical checklist from your current basket.',
    estimatedSavings: {
      weekly: estimatedTotal > 0 ? Math.max(2, Math.round(estimatedTotal * 0.08)) : null,
      monthly: estimatedTotal > 0 ? Math.max(8, Math.round(estimatedTotal * 0.08 * 4)) : null,
    },
    listRecommendations: data.activeLists.map((list) => ({
      listName: list.listName,
      actions: [
        'Check pantry staples before leaving home',
        list.storeChain ? `Keep this run focused on ${list.storeChain}` : 'Pick one main store before comparing extras',
        'Group fresh, chilled, and household items before checkout',
      ],
      storeSuggestions: list.storeChain ? [list.storeChain] : [],
      estimatedSavings: list.items.length > 0 ? Math.max(1, Math.round(list.items.length * 1.5)) : null,
    })),
    substitutions: data.activeLists.flatMap((list) =>
      list.items
        .filter((item) => item.category && ['snacks', 'household', 'pantry', 'dairy'].includes(item.category.toLowerCase()))
        .slice(0, 2)
        .map((item) => ({
          originalItem: item.name,
          alternative: 'Compare own-brand or multipack option',
          reason: 'This category usually has like-for-like alternatives without changing the meal plan.',
          savings: typeof item.estimatedPrice === 'number' ? Math.max(0.5, Math.round(item.estimatedPrice * 0.2 * 100) / 100) : null,
          store: list.storeChain ?? undefined,
        }))
    ),
    stockAlerts: ['Check cupboards, freezer, toiletries, and school supplies before checkout.'],
    nextActions: ['Review duplicates across active lists', 'Put fresh items into the final basket last', 'Keep receipts so next week has better price history'],
  };
};

const withFallbackTimeout = <T,>(promise: Promise<T>, durationMs: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('AI optimisation timed out')), durationMs);
    }),
  ]);

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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          optimisation: buildFallbackOptimisation(aiInput),
          degraded: true,
          reason: 'AI suggestions are temporarily unavailable.',
        },
        { status: 200 }
      );
    }

    let aiResponse = '';
    try {
      aiResponse = await withFallbackTimeout(aiService.optimiseShoppingLists(aiInput), 6500);
      const optimisation = parseAiJson(aiResponse);

      return NextResponse.json(
        {
          optimisation,
          raw: aiResponse,
        },
        { status: 200 }
      );
    } catch (error) {
      console.warn('AI shopping optimisation degraded:', error);
      return NextResponse.json(
        {
          optimisation: buildFallbackOptimisation(aiInput),
          degraded: true,
          reason: 'AI suggestions are temporarily unavailable.',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('AI shopping optimisation error:', error);
    return NextResponse.json(
      {
        error: 'Shopping suggestions are temporarily unavailable.',
      },
      { status: 500 }
    );
  }
});
