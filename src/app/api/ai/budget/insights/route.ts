import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export const POST = requireAuth(async (req: NextRequest, _context, authUser) => {
  try {
    const { month, year } = await req.json();
    const familyId = authUser.familyId;

    // Get current month/year if not provided
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Fetch family data
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: true
      }
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    // Fetch income - for recurring items, only include if they're active in this month
    // For recurring: must have started on or before this month (or no start date)
    // For one-time: must have payment date within target month
    const allIncome = await prisma.budgetIncome.findMany({
      where: {
        familyId,
        OR: [
          {
            // Recurring income active during the target month
            isRecurring: true,
            AND: [
              {
                OR: [
                  { recurringStartDate: { lte: endDate } },
                  { recurringStartDate: null }
                ]
              },
              {
                OR: [
                  { recurringEndDate: { gte: startDate } },
                  { recurringEndDate: null }
                ]
              }
            ]
          },
          {
            // One-time income with payment date in this month
            isRecurring: false,
            paymentDate: {
              gte: startDate,
              lte: endDate
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Deduplicate recurring income by name+category, keeping FIRST occurrence (by createdAt)
    // This matches dashboard behavior which orders by createdAt desc and takes first
    const seenIncome = new Map<string, typeof allIncome[0]>();
    allIncome.forEach(item => {
      if (item.isRecurring) {
        const key = `${item.incomeName}_${item.category}`;
        if (!seenIncome.has(key)) {
          seenIncome.set(key, item);
        }
      } else {
        seenIncome.set(item.id, item);
      }
    });
    const income = Array.from(seenIncome.values());

    // Fetch expenses - same logic
    const allExpenses = await prisma.budgetExpense.findMany({
      where: {
        familyId,
        OR: [
          {
            // Recurring expense active during the target month
            isRecurring: true,
            AND: [
              {
                OR: [
                  { recurringStartDate: { lte: endDate } },
                  { recurringStartDate: null }
                ]
              },
              {
                OR: [
                  { recurringEndDate: { gte: startDate } },
                  { recurringEndDate: null }
                ]
              }
            ]
          },
          {
            isRecurring: false,
            paymentDate: {
              gte: startDate,
              lte: endDate
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Deduplicate recurring expenses by name+category, keeping FIRST occurrence
    const seenExpenses = new Map<string, typeof allExpenses[0]>();
    allExpenses.forEach(item => {
      if (item.isRecurring) {
        const key = `${item.expenseName}_${item.category}`;
        if (!seenExpenses.has(key)) {
          seenExpenses.set(key, item);
        }
      } else {
        seenExpenses.set(item.id, item);
      }
    });
    const expenses = Array.from(seenExpenses.values());

    // Calculate totals
    const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const existing = acc.find(item => item.category === expense.category);
      if (existing) {
        existing.amount += Number(expense.amount);
      } else {
        acc.push({
          category: expense.category,
          amount: Number(expense.amount),
          budgetLimit: expense.budgetLimit ? Number(expense.budgetLimit) : undefined
        });
      }
      return acc;
    }, [] as Array<{ category: string; amount: number; budgetLimit?: number }>);

    // Sort by amount descending
    expensesByCategory.sort((a, b) => b.amount - a.amount);

    // Month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[targetMonth - 1];

    // Generate AI insights
    const insights = await aiService.analyzeBudgetSpending({
      familySize: family.members.length,
      location: 'London, UK', // TODO: Get from family profile
      totalIncome,
      totalExpenses,
      expensesByCategory,
      monthName
    });

    // Get recommendations if expenses > income
    let recommendations = null;
    if (totalExpenses > totalIncome * 0.9) {
      recommendations = await aiService.getBudgetRecommendations({
        familySize: family.members.length,
        totalIncome,
        expensesByCategory
      });
    }

    return NextResponse.json({
      insights,
      recommendations,
      data: {
        totalIncome,
        totalExpenses,
        expensesByCategory,
        monthName,
        familySize: family.members.length
      }
    });

  } catch (error) {
    console.error('Budget AI insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
});
