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

const buildFallbackGoalCoachPlan = ({
  familyName,
  goals,
  achievements,
}: {
  familyName: string;
  goals: Array<{
    goalTitle: string;
    goalType: string;
    currentProgress: number;
    targetValue: string;
    deadline: Date | null;
  }>;
  achievements: Array<{
    achievementTitle: string;
    category: string;
    pointsAwarded: number;
    achievedDate: Date;
  }>;
}): ParsedGoalCoachPlan => {
  const sortedGoals = [...goals].sort((a, b) => a.currentProgress - b.currentProgress);
  const focusGoal = sortedGoals.find((goal) => goal.currentProgress < 100) ?? sortedGoals[0];
  const completedGoals = goals.filter((goal) => goal.currentProgress >= 100).length;
  const averageProgress = Math.round(
    goals.reduce((sum, goal) => sum + goal.currentProgress, 0) / Math.max(goals.length, 1)
  );
  const latestAchievement = achievements[0];
  const atRiskGoals = goals.filter((goal) => goal.currentProgress < 50);
  const nearCompleteGoals = goals.filter((goal) => goal.currentProgress >= 80 && goal.currentProgress < 100);

  return {
    summary: `${familyName} has ${goals.length} active goal${goals.length === 1 ? '' : 's'} with average progress at ${averageProgress}%. ${completedGoals ? `${completedGoals} goal${completedGoals === 1 ? ' is' : 's are'} already complete.` : 'The next win should come from a small, visible weekly action.'}`,
    celebration: [
      latestAchievement
        ? `${latestAchievement.achievementTitle} earned ${latestAchievement.pointsAwarded} points in ${latestAchievement.category}.`
        : nearCompleteGoals.length
          ? `${nearCompleteGoals[0].goalTitle} is close to completion.`
          : 'The family has goals recorded and ready to track.',
    ],
    focusGoal: focusGoal
      ? {
          title: focusGoal.goalTitle,
          progress: focusGoal.currentProgress,
          nextStep:
            focusGoal.currentProgress >= 80
              ? 'Agree the final action needed to mark this complete.'
              : 'Break this into one clear task for this week and assign an owner.',
          encouragement:
            focusGoal.currentProgress >= 80
              ? 'This is close enough to turn into a finished win.'
              : 'A small committed action will make the goal feel active again.',
          targetDate: focusGoal.deadline ? focusGoal.deadline.toISOString().split('T')[0] : undefined,
        }
      : undefined,
    blockers: atRiskGoals.length
      ? atRiskGoals.slice(0, 3).map((goal) => `${goal.goalTitle} needs a clearer next step or owner.`)
      : ['No major blockers found from current progress. Keep the weekly rhythm visible.'],
    weeklyActions: goals.slice(0, 3).map((goal) => ({
      title: goal.currentProgress >= 80
        ? `Finish the next step for ${goal.goalTitle}`
        : `Choose one small action for ${goal.goalTitle}`,
      owner: goal.goalType === 'family' ? 'Family' : 'Assigned person',
      dueDate: goal.deadline ? goal.deadline.toISOString().split('T')[0] : undefined,
      motivation: goal.currentProgress >= 80
        ? 'Completing near-finished goals builds momentum.'
        : 'Small weekly actions keep goals from becoming background noise.',
    })),
    checkInQuestions: [
      'What is the one action we can finish before the next family check-in?',
      'Which goal needs help from someone else this week?',
    ],
    encouragement: 'AI coaching is temporarily unavailable, so Omosanya Home prepared a practical plan from the saved goal data.',
  };
};

const withFallbackTimeout = <T,>(promise: Promise<T>, durationMs: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Goal coaching timed out')), durationMs);
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          plan: buildFallbackGoalCoachPlan({ familyName: family.familyName, goals, achievements }),
          degraded: true,
          reason: 'AI coaching is temporarily unavailable.',
        },
        { status: 200 }
      );
    }

    let aiResponse = '';
    try {
      aiResponse = await withFallbackTimeout(aiService.coachGoals(aiInput), 6500);
      const plan = parseAiJson(aiResponse);

      return NextResponse.json(
        {
          plan,
          raw: aiResponse,
        },
        { status: 200 }
      );
    } catch (error) {
      console.warn('Goal coaching AI degraded:', error);
      return NextResponse.json(
        {
          plan: buildFallbackGoalCoachPlan({ familyName: family.familyName, goals, achievements }),
          degraded: true,
          reason: 'AI coaching is temporarily unavailable.',
        },
        { status: 200 }
      );
    }
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
