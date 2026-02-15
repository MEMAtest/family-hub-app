import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

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

    try {
      const aiResponse = await aiService.summariseGoalProgress(aiInput);
      const summary = parseAiJson(aiResponse);

      return NextResponse.json(
        {
          summary,
          raw: aiResponse,
          fallback: false,
        },
        { status: 200 }
      );
    } catch (aiError) {
      console.error('Goal progress AI service error:', aiError);
      const fallbackSummary = buildFallbackGoalSummary({
        familyName: family.familyName,
        goals,
        achievements,
      });

      return NextResponse.json(
        {
          summary: fallbackSummary,
          raw: null,
          fallback: true,
        },
        { status: 200 }
      );
    }
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
});

const buildFallbackGoalSummary = ({
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
    updatedAt: Date | null;
  }>;
  achievements: Array<{
    achievementTitle: string;
    category: string;
    pointsAwarded: number;
    achievedDate: Date;
  }>;
}): ParsedGoalProgressSummary => {
  const totalGoals = goals.length;
  const completedGoals = goals.filter((goal) => goal.currentProgress >= 100).length;
  const averageProgress =
    totalGoals === 0
      ? 0
      : Math.round(
          goals.reduce((sum, goal) => sum + goal.currentProgress, 0) / totalGoals
        );

  const latestAchievement = achievements[0];

  const goalBreakdown = goals.slice(0, 12).map((goal) => {
    const status =
      goal.currentProgress >= 80
        ? 'on_track'
        : goal.currentProgress >= 50
          ? 'behind'
          : 'at_risk';

    return {
      title: goal.goalTitle,
      progress: goal.currentProgress,
      status,
      highlight:
        status === 'on_track'
          ? 'Progress is on track based on recent updates.'
          : status === 'behind'
            ? 'Momentum is slowing; consider a mid-point check-in.'
            : 'Needs focused attention to stay viable.',
      nextStep:
        status === 'on_track'
          ? 'Keep following the current routine.'
          : status === 'behind'
            ? 'Schedule a planning session to unblock progress.'
            : 'Break the goal into smaller weekly targets and assign owners.',
    };
  });

  const riskyGoals = goalBreakdown
    .filter((goal) => goal.status === 'at_risk')
    .map((goal) => goal.title);

  const summaryLines = [
    `${familyName} is tracking ${totalGoals} active goal${totalGoals === 1 ? '' : 's'} with an average completion of ${averageProgress}%.`,
    completedGoals
      ? `${completedGoals} goal${completedGoals === 1 ? '' : 's'} are already complete — great work!`
      : 'No goals are complete yet, but steady progress keeps everyone accountable.',
    riskyGoals.length
      ? `Give extra support to ${riskyGoals.slice(0, 2).join(', ')} to prevent these from slipping.`
      : 'No critical risks spotted; focus on maintaining the current cadence.',
  ];

  if (latestAchievement) {
    summaryLines.push(
      `Recent win: ${latestAchievement.achievementTitle} (${latestAchievement.category}) earned ${latestAchievement.pointsAwarded} pts on ${latestAchievement.achievedDate.toLocaleDateString('en-GB')}. Celebrate this momentum.`
    );
  }

  const recommendations: string[] = [];
  if (riskyGoals.length) {
    recommendations.push(
      `Agree on next actions for ${riskyGoals[0]} so everyone knows how to contribute this week.`
    );
  }
  if (averageProgress < 60) {
    recommendations.push(
      'Run a short weekly stand-up to unblock slower goals and rediscover motivation.'
    );
  }
  if (!recommendations.length) {
    recommendations.push('Continue celebrating small wins and capture new achievements to stay motivated.');
  }

  return {
    summary: summaryLines.join(' '),
    metrics: [
      {
        label: 'Active goals',
        value: `${totalGoals}`,
        context: completedGoals
          ? `${completedGoals} completed`
          : 'Looking for the first completion',
      },
      {
        label: 'Average progress',
        value: `${averageProgress}%`,
        context: 'Across all goals',
      },
      {
        label: 'Recent achievements',
        value: `${achievements.length}`,
        context: latestAchievement
          ? `${latestAchievement.achievementTitle} earned on ${latestAchievement.achievedDate.toLocaleDateString('en-GB')}`
          : 'Record achievements to spotlight momentum',
      },
    ],
    goalBreakdown,
    momentum: {
      improving: [],
      slipping: riskyGoals,
    },
    riskyGoals,
    recommendations,
  };
};
