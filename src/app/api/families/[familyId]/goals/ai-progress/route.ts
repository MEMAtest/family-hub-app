import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { aiService } from '@/services/aiService';

const prisma = new PrismaClient();

interface ParsedGoalProgressSummary {
  summary: string;
  metrics?: Array<{ label: string; value: string; context?: string }>;
  goalBreakdown: Array<{
    title: string;
    progress: number;
    status: string;
    highlight?: string;
    nextStep?: string;
  }>;
  momentum?: {
    improving: string[];
    slipping: string[];
  };
  riskyGoals?: string[];
  recommendations?: string[];
}

const parseAiJson = (text: string): ParsedGoalProgressSummary => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('AI response did not contain JSON object.');
  }

  const jsonString = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
};

export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;
    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

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

    const [goals, achievements] = await Promise.all([
      prisma.familyGoal.findMany({
        where: { familyId },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.achievement.findMany({
        where: { familyId },
        orderBy: { achievedDate: 'desc' },
        take: 15,
      }),
    ]);

    if (!goals.length) {
      return NextResponse.json(
        { error: 'No goals found to analyse' },
        { status: 400 }
      );
    }

    const aiInput = {
      familyName: family.familyName,
      goals: goals.map((goal) => ({
        title: goal.goalTitle,
        type: goal.goalType,
        progress: goal.currentProgress,
        targetValue: goal.targetValue,
        deadline: goal.deadline ? goal.deadline.toISOString().split('T')[0] : null,
        updatedAt: goal.updatedAt ? goal.updatedAt.toISOString().split('T')[0] : undefined,
      })),
      achievements: achievements.map((ach) => ({
        title: ach.achievementTitle,
        category: ach.category,
        points: ach.pointsAwarded,
        earnedDate: ach.achievedDate.toISOString().split('T')[0],
      })),
    };

    const aiResponse = await aiService.summariseGoalProgress(aiInput);
    const summary = parseAiJson(aiResponse);

    return NextResponse.json(
      {
        summary,
        raw: aiResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Goal progress AI error:', error);
    return NextResponse.json(
      {
        error: 'Failed to summarise goal progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
