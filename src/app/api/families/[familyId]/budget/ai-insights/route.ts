import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId } = params;

    // Get family budget data
    const [income, expenses, family] = await Promise.all([
      prisma.budgetIncome.findMany({
        where: { familyId },
        include: { person: true }
      }),
      prisma.budgetExpense.findMany({
        where: { familyId },
        include: { person: true }
      }),
      prisma.family.findUnique({
        where: { id: familyId }
      })
    ]);

    if (!family) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Number(expense.amount);
      return acc;
    }, {} as Record<string, number>);

    // Find largest expense categories
    const topCategories = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, amount]) => `${cat} (£${amount.toFixed(2)})`);

    // Create a prompt for Claude
    const prompt = `Analyze this family budget data and provide insights:

Family: ${family.familyName}

Monthly Income: £${totalIncome.toFixed(2)}
- Income sources: ${income.length} entries

Monthly Expenses: £${totalExpenses.toFixed(2)}
- Expense entries: ${expenses.length} items
- Top spending categories: ${topCategories.join(', ')}

Net Savings: £${netSavings.toFixed(2)}
Savings Rate: ${savingsRate.toFixed(1)}%

Expense breakdown by category:
${Object.entries(expensesByCategory)
  .map(([cat, amount]) => `- ${cat}: £${amount.toFixed(2)} (${((amount / totalExpenses) * 100).toFixed(1)}%)`)
  .join('\n')}

Please provide:
1. A brief financial health assessment (2-3 sentences)
2. Top 3 actionable recommendations to improve their budget
3. Any spending patterns or concerns to watch
4. Positive aspects of their budget management

Keep the response concise, practical, and encouraging. Focus on specific, actionable advice.`;

    try {
      // Get insights from Claude
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const insights = response.content[0].type === 'text'
        ? response.content[0].text
        : 'Unable to generate insights at this time.';

      return NextResponse.json({
        insights,
        summary: {
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate: savingsRate.toFixed(1),
          topCategories
        }
      });
    } catch (aiError) {
      console.error('AI API Error:', aiError);

      // Provide fallback insights if AI fails
      const fallbackInsights = `**Financial Overview for ${family.familyName}**

Your monthly income of £${totalIncome.toFixed(2)} ${totalExpenses > totalIncome ? 'is currently exceeded by' : 'covers'} your expenses of £${totalExpenses.toFixed(2)}, resulting in ${netSavings >= 0 ? 'savings' : 'a deficit'} of £${Math.abs(netSavings).toFixed(2)}.

**Key Observations:**
• Your top spending categories are: ${topCategories.join(', ')}
• You have ${income.length} income source(s) and ${expenses.length} expense entries
• Your current savings rate is ${savingsRate.toFixed(1)}%

**Recommendations:**
1. ${savingsRate < 10 ? 'Focus on increasing your savings rate to at least 10-20% of income' : 'Maintain your healthy savings rate'}
2. Review your ${topCategories[0]?.split(' ')[0] || 'highest expense'} spending for potential reductions
3. ${expenses.length > 20 ? 'Consider consolidating or eliminating some of your ' + expenses.length + ' expense items' : 'Keep tracking all expenses to maintain visibility'}

**Positive Notes:**
${netSavings > 0 ? '✓ You are successfully saving money each month' : ''}
${income.length > 1 ? '✓ Multiple income sources provide financial stability' : ''}
${savingsRate > 20 ? '✓ Excellent savings rate above 20%' : ''}
${expenses.length > 0 ? '✓ Good expense tracking habits in place' : ''}`;

      return NextResponse.json({
        insights: fallbackInsights,
        summary: {
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate: savingsRate.toFixed(1),
          topCategories
        }
      });
    }
  } catch (error) {
    console.error('Budget AI Insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate budget insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}