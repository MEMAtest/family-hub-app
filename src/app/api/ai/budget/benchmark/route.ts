import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aiService } from '@/services/aiService';
import {
  buildExpenseSummaries,
  buildIncomeSummaries,
  sumByCategory,
} from '@/utils/budgetAnalytics';
import {
  getBenchmarkSpend,
  mapToBenchmarkCategory,
} from '@/data/ukBudgetBenchmarks';

const DEFAULT_MONTHS = 3;
const MAX_MONTHS = 6;

const clampMonths = (months?: number) => {
  if (!months || Number.isNaN(months)) return DEFAULT_MONTHS;
  return Math.min(Math.max(Math.floor(months), 1), MAX_MONTHS);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { familyId, months } = body as {
      familyId?: string;
      months?: number;
    };

    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

    const monthsToAnalyse = clampMonths(months);
    const now = new Date();
    const analysisStart = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyse - 1, 1);

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
        orderBy: { createdAt: 'asc' },
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
        orderBy: { createdAt: 'asc' },
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
        analysis: 'No expenses recorded yet so we cannot compare to UK averages. Add category spending to unlock benchmarking insights.',
        comparisons: [],
        metadata: {
          monthsAnalyzed: monthsToAnalyse,
          generatedAt: now.toISOString(),
          familySize: family.members.length,
        },
      });
    }

    const expenseSummaries = buildExpenseSummaries(expenses, {
      months: monthsToAnalyse,
      referenceDate: now,
    });
    const incomeSummaries = buildIncomeSummaries(income, {
      months: monthsToAnalyse,
      referenceDate: now,
    });

    const latestExpenses = expenseSummaries[expenseSummaries.length - 1];
    const latestIncome = incomeSummaries[incomeSummaries.length - 1];

    const monthlyIncome = latestIncome?.total ?? 0;
    const categorySpending = (latestExpenses?.categories || []).filter(
      (item) => item.amount > 0
    );

    if (!categorySpending.length) {
      return NextResponse.json({
        analysis: 'Recent expenses exist but amounts are zero, so benchmarking is not available.',
        comparisons: [],
        metadata: {
          monthsAnalyzed: monthsToAnalyse,
          generatedAt: now.toISOString(),
          familySize: family.members.length,
        },
      });
    }

    const comparisons = categorySpending.map((item) => {
      const benchmark = getBenchmarkSpend(item.category, family.members.length);
      const normalisedCategory = mapToBenchmarkCategory(item.category);

      if (benchmark === null) {
        return {
          category: normalisedCategory,
          actual: Number(item.amount.toFixed(2)),
          benchmark: null,
          difference: null,
          status: 'no-benchmark' as const,
        };
      }

      const difference = Number((item.amount - benchmark).toFixed(2));

      return {
        category: normalisedCategory,
        actual: Number(item.amount.toFixed(2)),
        benchmark,
        difference,
        status: difference === 0 ? 'at-par' : difference > 0 ? 'above' : 'below',
      };
    });

    // Sort comparisons by actual spend so AI focuses on meaningful categories
    const topCategoriesForAI = [...categorySpending]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const aiAnalysis = await aiService.compareToAverages({
      familySize: family.members.length || 2,
      location: 'United Kingdom',
      categorySpending: topCategoriesForAI.map((item) => ({
        category: mapToBenchmarkCategory(item.category) ?? item.category,
        amount: item.amount,
      })),
      monthlyIncome: monthlyIncome,
    });

    const totalBenchmark = sumByCategory(
      categorySpending
        .map((item) => ({
          category: mapToBenchmarkCategory(item.category) ?? item.category,
          amount: getBenchmarkSpend(item.category, family.members.length) ?? 0,
        }))
        .filter((item) => item.amount > 0)
    ).reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      analysis: aiAnalysis,
      comparisons,
      metadata: {
        monthsAnalyzed: monthsToAnalyse,
        generatedAt: now.toISOString(),
        familySize: family.members.length,
        averageMonthlyIncome: monthlyIncome,
        averageBenchmarkSpend: Number(totalBenchmark.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Budget benchmark error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate benchmark comparison',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

