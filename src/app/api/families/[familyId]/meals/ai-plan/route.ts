import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { aiService } from '@/services/aiService';

const prisma = new PrismaClient();

interface ParsedMealPlan {
  weekStart: string;
  summary: string;
  days: Array<{
    date: string;
    meals: {
      breakfast?: Record<string, unknown>;
      lunch?: Record<string, unknown>;
      dinner?: Record<string, unknown>;
      snacks?: Array<Record<string, unknown>>;
    };
  }>;
  shoppingList: Array<Record<string, unknown>>;
  tips?: string[];
  nutritionHighlights?: string[];
}

const parseAiJson = (text: string): ParsedMealPlan => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI response did not contain JSON object.');
  }

  const jsonString = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
};

const getWeekStart = (date: Date, weekStartsOn: number) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
    const body = await request.json().catch(() => ({}));
    const requestedWeekStart = typeof body.weekStart === 'string' ? body.weekStart : null;

    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            role: true,
            ageGroup: true,
          },
        },
      },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    const today = new Date();
    const weekStartDate = requestedWeekStart ? new Date(requestedWeekStart) : getWeekStart(today, 1); // Monday
    const lastWeekDate = new Date(weekStartDate);
    lastWeekDate.setDate(weekStartDate.getDate() - 7);

    const [recentMeals, pendingItems] = await Promise.all([
      prisma.mealPlan.findMany({
        where: {
          familyId,
          mealDate: {
            gte: lastWeekDate,
            lt: weekStartDate,
          },
        },
        orderBy: { mealDate: 'desc' },
      }),
      prisma.shoppingItem.findMany({
        where: {
          isCompleted: false,
          list: {
            familyId,
          },
        },
        select: {
          itemName: true,
          estimatedPrice: true,
          category: true,
          list: {
            select: {
              listName: true,
            },
          },
        },
        take: 25,
      }),
    ]);

    const aiInput = {
      familyName: family.familyName,
      familyMembers: family.members.map((member) => ({
        name: member.name,
        role: member.role,
        ageGroup: member.ageGroup,
      })),
      weekStart: weekStartDate.toISOString().split('T')[0],
      dietaryNotes: [],
      preferences: [],
      pantryItems: pendingItems.map((item) => ({
        name: item.itemName,
        quantity: item.estimatedPrice ? `~£${item.estimatedPrice.toFixed(2)}` : undefined,
        listName: item.list?.listName,
      })),
      recentMeals: recentMeals.map((meal) => ({
        mealDate: meal.mealDate.toISOString().split('T')[0],
        mealName: meal.mealName,
      })),
    };

    const aiResponse = await aiService.generateMealPlan(aiInput);
    const plan = parseAiJson(aiResponse);

    return NextResponse.json(
      {
        plan,
        raw: aiResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('AI meal plan generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate AI meal plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
