import { NextRequest, NextResponse } from 'next/server';
import type { FitnessStats, ActivityType } from '@/types/fitness.types';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

/**
 * Get the start date for a given period
 */
function getStartDateForPeriod(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      const defaultWeekStart = new Date(now);
      defaultWeekStart.setDate(now.getDate() - 7);
      return defaultWeekStart;
  }
}

/**
 * Calculate workout streak (consecutive days with activities)
 */
function calculateStreak(activities: Array<{ activityDate: Date }>): number {
  if (activities.length === 0) return 0;

  // Get unique dates
  const dates = [...new Set(
    activities.map(a => {
      const d = new Date(a.activityDate);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  )].sort().reverse();

  // Check if there's an activity today or yesterday
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) {
    return 0; // Streak is broken
  }

  let streak = 0;
  const currentDate = dates.includes(todayStr) ? today : yesterday;

  for (const dateStr of dates) {
    const checkDateStr = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
    if (dateStr === checkDateStr) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Group activities by type
 */
function groupByType(activities: Array<{ activityType: string }>): Partial<Record<ActivityType, number>> {
  return activities.reduce((acc, activity) => {
    const type = activity.activityType as ActivityType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Partial<Record<ActivityType, number>>);
}

/**
 * GET /api/families/[familyId]/fitness/stats
 * Get aggregated fitness statistics
 * Query params: personId, period (week|month|year)
 */
export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const { searchParams } = new URL(request.url);

    const personId = searchParams.get('personId');
    const period = (searchParams.get('period') || 'week') as 'week' | 'month' | 'year';

    const startDate = getStartDateForPeriod(period);

    // Build where clause
    const where: any = {
      person: { familyId },
      activityDate: { gte: startDate },
    };

    if (personId) {
      where.personId = personId;
    }

    // Fetch activities within period
    const activities = await prisma.fitnessTracking.findMany({
      where,
      select: {
        id: true,
        activityType: true,
        durationMinutes: true,
        calories: true,
        activityDate: true,
      },
      orderBy: { activityDate: 'desc' },
    });

    // Calculate stats
    const totalWorkouts = activities.length;
    const totalMinutes = activities.reduce((sum, a) => sum + a.durationMinutes, 0);
    const totalCalories = activities.reduce((sum, a) => sum + (a.calories || 0), 0);
    const averageDuration = totalWorkouts > 0
      ? Math.round(totalMinutes / totalWorkouts)
      : 0;

    // Fetch all activities for streak calculation (need more history)
    const allActivities = await prisma.fitnessTracking.findMany({
      where: {
        person: { familyId },
        ...(personId && { personId }),
        activityDate: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      select: { activityDate: true },
      orderBy: { activityDate: 'desc' },
    });

    const streakDays = calculateStreak(allActivities);

    // Get person's fitness goals if personId is provided
    let progressToGoal;
    if (personId) {
      const person = await prisma.familyMember.findUnique({
        where: { id: personId },
        select: { fitnessGoals: true },
      });

      if (person?.fitnessGoals) {
        const goals = person.fitnessGoals as any;
        progressToGoal = {
          workouts: {
            current: totalWorkouts,
            target: goals.workouts || 0,
          },
          activeHours: {
            current: Math.round(totalMinutes / 60 * 10) / 10,
            target: goals.activeHours || 0,
          },
          ...(goals.steps && {
            steps: {
              current: 0, // Would come from device sync
              target: goals.steps,
            },
          }),
        };
      }
    }

    const stats: FitnessStats = {
      period,
      totalWorkouts,
      totalMinutes,
      totalCalories,
      averageDuration,
      streakDays,
      activitiesByType: groupByType(activities),
      progressToGoal,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching fitness stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
});
