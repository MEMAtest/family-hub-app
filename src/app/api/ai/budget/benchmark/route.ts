import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aiService } from '@/services/aiService';
import { requireAuth } from '@/lib/auth-utils';
import {
  buildExpenseSummaries,
  buildIncomeSummaries,
  sumByCategory,
} from '@/utils/budgetAnalytics';
import {
  getBenchmarkSpend,
  mapToBenchmarkCategory,
} from '@/data/ukBudgetBenchmarks';

type BenchmarkComparison = {
  category: string | null;
  actual: number;
  benchmark: number | null;
  difference: number | null;
  status: 'no-benchmark' | 'at-par' | 'above' | 'below';
};

const DEFAULT_MONTHS = 3;
const MAX_MONTHS = 6;

export const runtime = 'nodejs';

const clampMonths = (months?: number) => {
  if (!months || Number.isNaN(months)) return DEFAULT_MONTHS;
  return Math.min(Math.max(Math.floor(months), 1), MAX_MONTHS);
};

export const POST = requireAuth(async (req: NextRequest, _context, authUser) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { months } = body as {
      months?: number;
    };
    const familyId = authUser.familyId;

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

    const comparisons: BenchmarkComparison[] = categorySpending.map((item) => {
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

    let aiAnalysis: string;
    try {
      aiAnalysis = await aiService.compareToAverages({
        familySize: family.members.length || 2,
        location: 'United Kingdom',
        categorySpending: topCategoriesForAI.map((item) => ({
          category: mapToBenchmarkCategory(item.category) ?? item.category,
          amount: item.amount,
        })),
        monthlyIncome: monthlyIncome,
      });
    } catch (aiError) {
      console.error('Benchmark AI service error:', aiError);
      aiAnalysis = buildFallbackBenchmarkAnalysis({
        comparisons,
        familySize: family.members.length || 2,
        monthsAnalyzed: monthsToAnalyse,
        monthlyIncome,
      });
    }

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
      },
      { status: 500 }
    );
  }
});

function buildFallbackBenchmarkAnalysis({
  comparisons,
  familySize,
  monthsAnalyzed,
  monthlyIncome,
}: {
  comparisons: BenchmarkComparison[];
  familySize: number;
  monthsAnalyzed: number;
  monthlyIncome: number;
}): string {
  const comparable = comparisons.filter(
    (item) => item.benchmark !== null && item.difference !== null
  );

  if (!comparable.length) {
    return `We reviewed the past ${monthsAnalyzed} month${monthsAnalyzed === 1 ? '' : 's'} for your ${familySize}-person household. We could not match your categories to UK benchmarks yet, but once more expenses are classified we will surface relevant comparisons automatically.`;
  }

  const above = comparable
    .filter((item) => (item.difference ?? 0) > 0)
    .sort((a, b) => (b.difference ?? 0) - (a.difference ?? 0));
  const below = comparable
    .filter((item) => (item.difference ?? 0) < 0)
    .sort((a, b) => (a.difference ?? 0) - (b.difference ?? 0));
  const atPar = comparable.filter((item) => (item.difference ?? 0) === 0);
  const noBench = comparisons.filter((item) => item.status === 'no-benchmark');

  const parts: string[] = [
    `We reviewed the last ${monthsAnalyzed} month${monthsAnalyzed === 1 ? '' : 's'} for your ${familySize}-person household.`,
  ];

  if (monthlyIncome > 0) {
    parts.push(`Average monthly income recorded: £${monthlyIncome.toFixed(2)}.`);
  }

  if (above.length) {
    parts.push(
      `Spending is above typical UK households in ${formatComparisonList(
        above,
        'above'
      )}.`
    );
  }

  if (below.length) {
    parts.push(
      `You are below the UK average in ${formatComparisonList(
        below,
        'below'
      )}.`
    );
  }

  if (!above.length && atPar.length) {
    parts.push('Most tracked categories are currently in line with UK averages.');
  }

  if (noBench.length) {
    const categories = noBench
      .slice(0, 2)
      .map((item) => item.category)
      .join(', ');
    parts.push(
      `We do not yet have national data for ${categories}; these will appear once comparable UK figures are available.`
    );
  }

  parts.push(
    'Consider trimming the categories running above average and reinvesting the savings into your goals.'
  );

  return parts.join(' ');
}

function formatComparisonList(
  items: BenchmarkComparison[],
  direction: 'above' | 'below'
): string {
  return items
    .slice(0, 3)
    .map((item) => {
      const difference = item.difference ?? 0;
      const absoluteDiff = Math.abs(difference);
      const percent =
        item.benchmark && item.benchmark > 0
          ? Math.round((absoluteDiff / item.benchmark) * 100)
          : null;
      const prefix = direction === 'above' ? '+' : '-';
      const percentLabel =
        percent !== null ? ` (~${percent}% ${direction === 'above' ? 'higher' : 'lower'})` : '';

      return `${item.category}: ${prefix}£${absoluteDiff.toFixed(2)}${percentLabel}`;
    })
    .join('; ');
}
