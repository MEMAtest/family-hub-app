import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

interface ParsedGoalCoachPlan {
  summary: string;
  celebration?: string[];
  focusGoal?: {
    title: string;
    progress: number;
    nextStep: string;
    encouragement?: string;
    targetDate?: string;
  };
  blockers?: string[];
  weeklyActions?: Array<{
    title: string;
    owner?: string;
    dueDate?: string;
    motivation?: string;
  }>;
  checkInQuestions?: string[];
  encouragement?: string;
}

const parseAiJson = (text: string): ParsedGoalCoachPlan => {
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

    const [goals, achievements] = await Promise.all([
      prisma.familyGoal.findMany({
        where: { familyId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.achievement.findMany({
        where: { familyId },
        orderBy: { achievedDate: 'desc' },
        take: 10,
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
      })),
      achievements: achievements.map((ach) => ({
        title: ach.achievementTitle,
        category: ach.category,
        points: ach.pointsAwarded,
        earnedDate: ach.achievedDate.toISOString().split('T')[0],
      })),
    };

    const aiResponse = await aiService.coachGoals(aiInput);
    const plan = parseAiJson(aiResponse);

    return NextResponse.json(
      {
        plan,
        raw: aiResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Goal coaching AI error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate goal insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
