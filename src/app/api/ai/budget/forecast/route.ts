import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aiService } from '@/services/aiService';
import { deriveForecastContext } from '@/utils/budgetAnalytics';

const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 12;
const UPCOMING_EVENT_WINDOW_DAYS = 60;

const clampMonths = (months?: number) => {
  if (!months || Number.isNaN(months)) return DEFAULT_MONTHS;
  return Math.min(Math.max(Math.floor(months), 3), MAX_MONTHS);
};

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { familyId, months, includeUpcomingEvents } = body as {
      familyId?: string;
      months?: number;
      includeUpcomingEvents?: boolean;
    };

    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

    const monthsToAnalyse = clampMonths(months);
    const now = new Date();
    const analysisStart = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyse - 2, 1);

    const [family, expenses, income] = await Promise.all([
      prisma.family.findUnique({
        where: { id: familyId },
        include: {
          members: {
            select: { id: true },
          },
        },
      }),
      prisma.budgetExpense.findMany({
        where: {
          familyId,
          OR: [
            {
              isRecurring: true,
              AND: [
                {
                  OR: [
                    { recurringEndDate: null },
                    { recurringEndDate: { gte: analysisStart } },
                  ],
                },
                {
                  OR: [
                    { recurringStartDate: null },
                    { recurringStartDate: { lte: now } },
                  ],
                },
              ],
            },
            {
              isRecurring: false,
              OR: [
                { paymentDate: { gte: analysisStart } },
                {
                  paymentDate: null,
                  createdAt: { gte: analysisStart },
                },
              ],
            },
          ],
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      prisma.budgetIncome.findMany({
        where: {
          familyId,
          OR: [
            {
              isRecurring: true,
              AND: [
                {
                  OR: [
                    { recurringEndDate: null },
                    { recurringEndDate: { gte: analysisStart } },
                  ],
                },
                {
                  OR: [
                    { recurringStartDate: null },
                    { recurringStartDate: { lte: now } },
                  ],
                },
              ],
            },
            {
              isRecurring: false,
              OR: [
                { paymentDate: { gte: analysisStart } },
                {
                  paymentDate: null,
                  createdAt: { gte: analysisStart },
                },
              ],
            },
          ],
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    if (!expenses.length) {
      return NextResponse.json({
        summary: 'No expenses recorded yet. Add recurring or one-off expenses to generate a forecast.',
        historicalExpenses: [],
        historicalIncome: [],
        stats: {
          averageMonthlySpend: 0,
          monthOverMonthChange: 0,
          trendDirection: 'flat',
        },
        upcomingEvents: [],
        metadata: {
          monthsAnalyzed: monthsToAnalyse,
          generatedAt: now.toISOString(),
          familySize: family.members.length,
        },
      });
    }

    const forecastContext = deriveForecastContext(expenses, income, {
      months: monthsToAnalyse,
      referenceDate: now,
    });

    const expenseSummaries = forecastContext.historicalExpenses;
    const incomeSummaries = forecastContext.historicalIncome;

    const lastMonthsForAI = expenseSummaries.slice(-Math.min(3, expenseSummaries.length));

    let upcomingEvents: Array<{
      id: string;
      title: string;
      date: string;
      cost: number;
      personName: string | null;
      eventType: string;
    }> = [];

    if (includeUpcomingEvents !== false) {
      const calendarEvents = await prisma.calendarEvent.findMany({
        where: {
          familyId,
          cost: { gt: 0 },
          eventDate: {
            gte: now,
            lte: addDays(now, UPCOMING_EVENT_WINDOW_DAYS),
          },
        },
        include: {
          person: {
            select: { name: true },
          },
        },
        orderBy: {
          eventDate: 'asc',
        },
      });

      upcomingEvents = calendarEvents.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.eventDate.toISOString().split('T')[0],
        cost: Number(event.cost),
        personName: event.person?.name ?? null,
        eventType: event.eventType,
      }));
    }

    const aiSummary = await aiService.predictSpendingTrend({
      last3MonthsExpenses: lastMonthsForAI.map((month) => ({
        month: month.label,
        total: month.total,
        categoryBreakdown: month.categories,
      })),
      upcomingEvents,
    });

    const latestExpenseMonth = expenseSummaries[expenseSummaries.length - 1] ?? null;
    const previousExpenseMonth = expenseSummaries.length > 1
      ? expenseSummaries[expenseSummaries.length - 2]
      : null;

    const previousTotal = previousExpenseMonth?.total ?? 0;
    const latestTotal = latestExpenseMonth?.total ?? 0;
    const rawGrowthRate = previousTotal > 0
      ? (latestTotal - previousTotal) / previousTotal
      : 0;
    const growthRate = Number(
      Math.max(-0.8, Math.min(rawGrowthRate, 0.6)).toFixed(4)
    );

    const categoryRatios = (latestExpenseMonth?.categories || []).map((item) => ({
      category: item.category,
      ratio: latestTotal > 0 ? item.amount / latestTotal : 0,
    }));

    const projectionHorizon = Math.min(6, monthsToAnalyse);
    const projections = Array.from({ length: projectionHorizon }).map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + index + 1, 1);
      const projectedTotalRaw = latestTotal * Math.pow(1 + growthRate, index + 1);
      const projectedTotal = Number(Math.max(0, projectedTotalRaw || 0).toFixed(2));

      return {
        month: monthDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        total: projectedTotal,
        categories: categoryRatios.map((ratio) => ({
          category: ratio.category,
          amount: Number((projectedTotal * ratio.ratio).toFixed(2)),
        })),
      };
    });

    const forecastStats = {
      averageMonthlySpend: forecastContext.averageMonthlySpend,
      monthOverMonthChange: forecastContext.monthOverMonthChange,
      trendDirection: forecastContext.trendDirection,
      latestMonthTotal: latestTotal,
      latestIncomeTotal: incomeSummaries[incomeSummaries.length - 1]?.total ?? 0,
      growthRate,
    };

    return NextResponse.json({
      summary: aiSummary,
      historicalExpenses: expenseSummaries,
      historicalIncome: incomeSummaries,
      stats: forecastStats,
      projection: projections,
      upcomingEvents,
      metadata: {
        monthsAnalyzed: monthsToAnalyse,
        generatedAt: now.toISOString(),
        familySize: family.members.length,
      },
    });
  } catch (error) {
    console.error('Budget forecast error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate budget forecast',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
