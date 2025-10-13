/**
 * AI Service - Anthropic Claude Integration
 * Provides intelligent insights for Family Hub features
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages';
import { logAIUsage } from '@/utils/aiTelemetry';
import { redactSensitiveData } from '@/utils/privacy';

export class AIService {
  private anthropic: Anthropic;
  private readonly maxPromptChars = 12000;
  private readonly maxRetries = 2;
  private readonly baseRetryDelayMs = 750;
  private readonly requestTimeoutMs = 20000;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not found in environment variables');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generic chat completion method using Claude
   */
  private async chat(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 1024
  ): Promise<string> {
    const safeSystemPrompt = this.sanitisePrompt(systemPrompt);
    const safeUserPrompt = this.sanitisePrompt(userPrompt);

    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= this.maxRetries) {
      const startedAt = Date.now();

      try {
        const message = await Promise.race([
          this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            system: safeSystemPrompt,
            messages: [
              {
                role: 'user',
                content: safeUserPrompt,
              },
            ],
          }),
          this.timeoutPromise(),
        ]) as Message;

        const content = message.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }

        logAIUsage({
          feature: systemPrompt.split('\n')[0]?.slice(0, 60) || 'ai.chat',
          tokensRequested: maxTokens,
          tokensGenerated: message.usage?.output_tokens,
          durationMs: Date.now() - startedAt,
          success: true,
          timestamp: new Date().toISOString(),
        });

        return content.text;
      } catch (error) {
        lastError = error;
        attempt += 1;

        if (attempt > this.maxRetries) {
          break;
        }

        const delay = this.baseRetryDelayMs * Math.pow(2, attempt - 1);
        logAIUsage({
          feature: systemPrompt.split('\n')[0]?.slice(0, 60) || 'ai.chat',
          tokensRequested: maxTokens,
          durationMs: Date.now() - startedAt,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        await this.sleep(delay);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Unknown error calling AI service');
  }

  private sanitisePrompt(prompt: string): string {
    if (!prompt) return '';
    const trimmed = redactSensitiveData(prompt).trim();
    if (trimmed.length <= this.maxPromptChars) {
      return trimmed;
    }
    const ellipsis = '\n\n[Truncated due to length]';
    return `${trimmed.slice(0, this.maxPromptChars)}${ellipsis}`;
  }

  private sleep(durationMs: number) {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  private timeoutPromise() {
    return new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('AI request timed out'));
      }, this.requestTimeoutMs);
    });
  }

  /**
   * BUDGET AI FEATURES
   */

  /**
   * Analyze monthly spending and provide insights
   */
  async analyzeBudgetSpending(data: {
    familySize: number;
    location: string; // e.g., "London, UK" or "Manchester, UK"
    totalIncome: number;
    totalExpenses: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
    monthName: string;
  }): Promise<string> {
    const net = data.totalIncome - data.totalExpenses;
    const netStatus = net >= 0 ? 'surplus' : 'deficit';

    // Sort categories by amount to get top 2
    const sortedCategories = [...data.expensesByCategory].sort((a, b) => b.amount - a.amount);
    const top1 = sortedCategories[0];
    const top2 = sortedCategories[1];

    const systemPrompt = `You are a financial advisor. Analyze budget data and provide specific savings suggestions based on the actual numbers provided. Always use the exact figures given and focus on actionable advice.`;

    const userPrompt = `EXAMPLE FORMAT (you must follow this structure exactly):

Example input: Income £5000, Expenses £4200, surplus £800. Top categories: Groceries £1500, Transport £900.
Example output: "Your family received £5,000 income and spent £4,200, leaving £800 surplus. Your biggest expenses were Groceries (£1,500) and Transport (£900). Consider meal planning to reduce grocery costs by 10-15% (saving £150-225/month), and review transport options like carpooling or public transport to potentially save £100-150/month."

NOW ANALYZE THIS ACTUAL DATA:

Income: £${data.totalIncome.toFixed(2)}
Expenses: £${data.totalExpenses.toFixed(2)}
Net: £${Math.abs(net).toFixed(2)} ${netStatus}
Top category: ${top1.category} (£${top1.amount.toFixed(2)})
Second category: ${top2.category} (£${top2.amount.toFixed(2)})

Write your analysis following the example format above. Use the EXACT numbers from above. Start with "Your family received £${data.totalIncome.toFixed(2)} income and spent £${data.totalExpenses.toFixed(2)}, leaving £${Math.abs(net).toFixed(2)} ${netStatus}." Then mention the two top categories with their amounts, and give ONE specific savings tip for each category. Keep it to 3-4 sentences total.`;

    return await this.chat(systemPrompt, userPrompt);
  }

  /**
   * Provide spending recommendations based on patterns
   */
  async getBudgetRecommendations(data: {
    familySize: number;
    totalIncome: number;
    expensesByCategory: Array<{ category: string; amount: number; budgetLimit?: number }>;
    savingsGoal?: number;
  }): Promise<string> {
    const systemPrompt = `You are a practical UK family finance advisor. Give specific, actionable budget recommendations. Keep it brief (2-3 points).`;

    const categoriesOverBudget = data.expensesByCategory.filter(
      cat => cat.budgetLimit && cat.amount > cat.budgetLimit
    );

    const userPrompt = `Family of ${data.familySize}, income £${data.totalIncome}/month

Categories spending:
${data.expensesByCategory.map(cat => {
  const overBudget = cat.budgetLimit && cat.amount > cat.budgetLimit
    ? ` (£${(cat.amount - cat.budgetLimit).toFixed(2)} over budget)`
    : '';
  return `- ${cat.category}: £${cat.amount.toFixed(2)}${overBudget}`;
}).join('\n')}

${data.savingsGoal ? `Savings goal: £${data.savingsGoal}/month` : ''}

Give 2-3 specific recommendations to improve their budget.`;

    return await this.chat(systemPrompt, userPrompt);
  }

  /**
   * Compare spending to UK averages
   */
  async compareToAverages(data: {
    familySize: number;
    location: string;
    categorySpending: Array<{ category: string; amount: number }>;
    monthlyIncome: number;
  }): Promise<string> {
    const systemPrompt = `You are a UK financial data analyst. Compare family spending to UK national averages.
Use actual UK data when possible. Be specific about percentages and amounts. Keep response brief (2-3 sentences per category).`;

    const userPrompt = `Compare this family's spending to UK averages:

Family: ${data.familySize} people in ${data.location}
Monthly income: £${data.monthlyIncome.toFixed(2)}

Their spending:
${data.categorySpending.map(cat => `- ${cat.category}: £${cat.amount.toFixed(2)}`).join('\n')}

For the top 3 spending categories, compare to UK average households of similar size.
Indicate if spending is below average, average, or above average, with specific percentages.`;

    return await this.chat(systemPrompt, userPrompt);
  }

  /**
   * Predict future spending trend
   */
  async predictSpendingTrend(data: {
    last3MonthsExpenses: Array<{ month: string; total: number; categoryBreakdown: any }>;
    upcomingEvents?: Array<{ title: string; cost: number; date: string }>;
  }): Promise<string> {
    const systemPrompt = `You are a financial forecasting assistant. Analyze spending trends and predict next month. Be realistic and specific.`;

    const userPrompt = `Recent spending history:
${data.last3MonthsExpenses.map(m => `- ${m.month}: £${m.total.toFixed(2)}`).join('\n')}

${data.upcomingEvents && data.upcomingEvents.length > 0 ? `
Upcoming expenses from calendar:
${data.upcomingEvents.map(e => `- ${e.title}: £${e.cost.toFixed(2)} on ${e.date}`).join('\n')}
` : ''}

Predict next month's likely spending and explain the reasoning in 2-3 sentences.`;

    return await this.chat(systemPrompt, userPrompt);
  }

  /**
   * CALENDAR AI FEATURES
   */

  /**
   * Generate a 7-day meal plan
   */
  async generateMealPlan(data: {
    familyName: string;
    familyMembers: Array<{ name: string; role: string; ageGroup: string }>;
    weekStart: string;
    dietaryNotes?: string[];
    preferences?: string[];
    pantryItems: Array<{ name: string; quantity?: string; listName?: string }>;
    recentMeals: Array<{ mealDate: string; mealName: string; mealType?: string }>;
  }): Promise<string> {
    const systemPrompt = `You are an experienced UK family meal planner. Create balanced, practical weekly meal plans that respect dietary notes, avoid recent repeats, and keep grocery lists realistic. Always return valid JSON following the required schema.`;

    const userPrompt = `Using the following context, produce a structured meal plan JSON for the upcoming week.

Context:
- Family: ${data.familyName}
- Members: ${data.familyMembers.map(m => `${m.name} (${m.role}, ${m.ageGroup})`).join('; ')}
- Week begins on: ${data.weekStart}
- Dietary notes: ${(data.dietaryNotes && data.dietaryNotes.length) ? data.dietaryNotes.join(', ') : 'None provided'}
- Preferences: ${(data.preferences && data.preferences.length) ? data.preferences.join(', ') : 'Not specified'}
- Pantry items (help minimise waste): ${data.pantryItems.length ? data.pantryItems.map(item => `${item.name}${item.quantity ? ` (${item.quantity})` : ''}${item.listName ? ` from ${item.listName}` : ''}`).join('; ') : 'No pantry items listed'}
- Meals served recently: ${data.recentMeals.length ? data.recentMeals.map(meal => `${meal.mealDate}: ${meal.mealName}`).join('; ') : 'None recorded'}

Requirements:
1. Cover 7 consecutive days starting ${data.weekStart}. For each day include breakfast, lunch, and dinner. Snacks are optional.
2. Prioritise variety; avoid repeating the same main meal within the week or any meal that appeared in the recent meals list.
3. Provide brief descriptions that mention key ingredients and why the meal fits the family (nutrition, time, kid-friendly, etc.).
4. Provide estimated calories and prep time (minutes) for each meal.
5. Produce a consolidated shopping list highlighting items not usually stocked in a typical pantry. Include quantity guidance when possible.
6. Offer 3-4 practical tips to streamline prep or reduce cost.

Return JSON with this exact structure:
{
  "weekStart": "ISO date string (YYYY-MM-DD)",
  "summary": "Short overview paragraph",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "meals": {
        "breakfast": {
          "name": "Meal title",
          "description": "Why it works / key ingredients",
          "calories": number,
          "prepTimeMinutes": number,
          "shoppingItems": ["ingredient", "..."]
        },
        "lunch": { ...same shape... },
        "dinner": { ...same shape... },
        "snacks": [
          {
            "name": "Snack suggestion",
            "description": "Optional notes",
            "shoppingItems": ["optional ingredient"]
          }
        ]
      }
    }
  ],
  "shoppingList": [
    { "item": "Ingredient", "quantity": "e.g. 2 packs", "notes": "Optional guidance" }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "nutritionHighlights": ["Key nutritional benefits"]
}

Only output the JSON object—no additional commentary.`;

    return await this.chat(systemPrompt, userPrompt, 2048);
  }

  /**
   * Optimise shopping lists with store and substitution recommendations
   */
  async optimiseShoppingLists(data: {
    familyName: string;
    activeLists: Array<{
      listName: string;
      storeChain?: string | null;
      items: Array<{
        name: string;
        category?: string | null;
        estimatedPrice?: number | null;
        priority?: string | null;
        isCompleted?: boolean;
      }>;
    }>;
    recentPurchases: Array<{
      itemName: string;
      storeChain?: string | null;
      price?: number | null;
      purchasedAt: string;
    }>;
    budgetNotes?: string[];
  }): Promise<string> {
    const systemPrompt = `You are a UK supermarket budgeting assistant. Analyse household shopping lists, spots savings, store choices, and realistic substitutions. Always answer in valid JSON.`;

    const userPrompt = `Use the context below to recommend how the family can optimise their shopping this week.

Family: ${data.familyName}
Active lists: ${data.activeLists.length}
Budget notes: ${data.budgetNotes?.length ? data.budgetNotes.join('; ') : 'None provided'}

Lists detail:
${data.activeLists.map((list, index) => `List ${index + 1}: ${list.listName}${list.storeChain ? ` @ ${list.storeChain}` : ''}
Items:
${list.items.map(item => `- ${item.name}${item.category ? ` (${item.category})` : ''}${typeof item.estimatedPrice === 'number' ? ` ~£${item.estimatedPrice.toFixed(2)}` : ''}${item.priority ? ` [${item.priority}]` : ''}`).join('\n')}`).join('\n\n')}

Recent purchases (for price context):
${data.recentPurchases.map(purchase => `- ${purchase.itemName}${purchase.storeChain ? ` @ ${purchase.storeChain}` : ''}${typeof purchase.price === 'number' ? ` for £${purchase.price.toFixed(2)}` : ''} on ${purchase.purchasedAt}`).join('\n')}

Return JSON with structure:
{
  "summary": "One paragraph overview",
  "estimatedSavings": {
    "weekly": number | null,
    "monthly": number | null
  },
  "listRecommendations": [
    {
      "listName": "",
      "actions": ["Move fresh produce to Aldi", "Consolidate snacks"],
      "storeSuggestions": ["Tesco"],
      "estimatedSavings": number | null
    }
  ],
  "substitutions": [
    {
      "originalItem": "",
      "alternative": "",
      "reason": "",
      "savings": number | null,
      "store": ""
    }
  ],
  "stockAlerts": ["Use tinned tomatoes already in pantry"],
  "nextActions": ["Set dairy budget to £20", "Schedule Costco run"]
}

Only output the JSON object.`;

    return await this.chat(systemPrompt, userPrompt, 2048);
  }

  /**
   * Provide personalised goal coaching insights
   */
  async coachGoals(data: {
    familyName: string;
    goals: Array<{
      title: string;
      type: string;
      progress: number;
      targetValue: string;
      deadline?: string | null;
    }>;
    achievements: Array<{
      title: string;
      category: string;
      points: number;
      earnedDate: string;
    }>;
  }): Promise<string> {
    const systemPrompt = `You are a warm, practical UK family goal coach. Celebrate wins, highlight the most important goal to focus on, and recommend specific next steps that can be completed this week. Always return valid JSON in the requested structure.`;

    const userPrompt = `Family: ${data.familyName}
Goals (${data.goals.length}):
${data.goals.map(goal => `- ${goal.title} [${goal.type}] progress ${goal.progress}% target ${goal.targetValue}${goal.deadline ? ` deadline ${goal.deadline}` : ''}`).join('\n')}

Recent achievements:
${data.achievements.length ? data.achievements.map(ach => `- ${ach.title} (${ach.category}) worth ${ach.points}pts on ${ach.earnedDate}`).join('\n') : 'None recorded'}

Return JSON:
{
  "summary": "Overview paragraph",
  "celebration": ["Notable win"],
  "focusGoal": {
    "title": "",
    "progress": number,
    "nextStep": "",
    "encouragement": "",
    "targetDate": "YYYY-MM-DD" | null
  },
  "blockers": ["Obstacle 1"],
  "weeklyActions": [
    { "title": "", "owner": "", "dueDate": "YYYY-MM-DD" | null, "motivation": "" }
  ],
  "checkInQuestions": ["Question 1", "Question 2"],
  "encouragement": "Short supportive message"
}

Only output the JSON object.`;

    return await this.chat(systemPrompt, userPrompt, 2048);
  }

  /**
   * Summarise goal progress across the family
   */
  async summariseGoalProgress(data: {
    familyName: string;
    goals: Array<{
      title: string;
      type: string;
      progress: number;
      targetValue: string;
      deadline?: string | null;
      updatedAt?: string;
    }>;
    achievements: Array<{
      title: string;
      category: string;
      points: number;
      earnedDate: string;
    }>;
  }): Promise<string> {
    const systemPrompt = `You are a motivational yet practical family coach. Summarise progress, detect risks, and give clear recommendations. Always output valid JSON in the requested schema.`;

    const userPrompt = `Family: ${data.familyName}
Goals (${data.goals.length}):
${data.goals.map(goal => `- ${goal.title} [${goal.type}] progress ${goal.progress}% target ${goal.targetValue}${goal.deadline ? ` deadline ${goal.deadline}` : ''}${goal.updatedAt ? ` updated ${goal.updatedAt}` : ''}`).join('\n')}

Recent achievements:
${data.achievements.length ? data.achievements.map(ach => `- ${ach.title} (${ach.category}) ${ach.points}pts on ${ach.earnedDate}`).join('\n') : 'None recorded'}

Return JSON:
{
  "summary": "",
  "metrics": [
    { "label": "", "value": "", "context": "" }
  ],
  "goalBreakdown": [
    {
      "title": "",
      "progress": number,
      "status": "on_track | behind | at_risk",
      "highlight": "",
      "nextStep": ""
    }
  ],
  "momentum": {
    "improving": [""],
    "slipping": ["" ]
  },
  "riskyGoals": [""],
  "recommendations": ["" ]
}

Only output the JSON object.`;

    return await this.chat(systemPrompt, userPrompt, 2048);
  }

  /**
   * Detect scheduling conflicts and suggest resolutions
   */
  async detectEventConflicts(events: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    duration: number;
    personName: string;
    location?: string;
  }>): Promise<string> {
    const systemPrompt = `You are a scheduling assistant. Identify time conflicts and overlaps.
Consider travel time between locations. Suggest practical solutions. Keep it brief.`;

    const userPrompt = `Check these events for conflicts:

${events.map(e => `- ${e.personName}: ${e.title} at ${e.time} (${e.duration}min)${e.location ? ` @ ${e.location}` : ''}`).join('\n')}

Identify any conflicts or tight scheduling. Suggest resolutions if needed.`;

    return await this.chat(systemPrompt, userPrompt);
  }

  /**
   * Suggest events based on family patterns
   */
  async suggestEvents(data: {
    familyMembers: Array<{ name: string; role: string; ageGroup: string }>;
    recentEvents: Array<{ title: string; type: string; recurring: boolean }>;
    currentMonth: string;
  }): Promise<string> {
    const systemPrompt = `You are a family activity planner. Suggest relevant events based on family composition and past activities.
Be practical and consider UK school terms, holidays, and typical family schedules.`;

    const userPrompt = `Family members:
${data.familyMembers.map(m => `- ${m.name} (${m.role}, ${m.ageGroup})`).join('\n')}

Recent recurring events:
${data.recentEvents.filter(e => e.recurring).map(e => `- ${e.title} (${e.type})`).join('\n')}

Current month: ${data.currentMonth}

Suggest 2-3 events or activities this family might want to schedule.`;

    return await this.chat(systemPrompt, userPrompt);
  }

  /**
   * Suggest smart scheduling slots for a new event
   */
  async suggestMeetingSlots(data: {
    familyName: string;
    eventTitle: string;
    durationMinutes: number;
    preferredDates: string[];
    participants: Array<{ name: string; role: string; typicalAvailability?: string[] }>;
    existingEvents: Array<{
      date: string;
      time: string;
      durationMinutes: number;
      title: string;
      personName: string;
    }>;
  }): Promise<string> {
    const systemPrompt = `You are a family scheduling assistant. Given availability and existing events, propose 3-4 practical slots. Consider UK school/work patterns, travel buffer (15 minutes), evenings after 19:30 disfavoured, and avoid double-booking participants. Output valid JSON.`;

    const userPrompt = `Family: ${data.familyName}
Event: ${data.eventTitle}
Duration: ${data.durationMinutes} minutes
Preferred dates: ${data.preferredDates.join(', ')}

Participants:
${data.participants.map(person => `- ${person.name} (${person.role}) availability hints: ${person.typicalAvailability?.join(', ') ?? 'not specified'}`).join('\n')}

Existing events:
${data.existingEvents.map(event => `- ${event.date} ${event.time} (${event.durationMinutes}m) ${event.title} for ${event.personName}`).join('\n') || 'None recorded'}

Return JSON with structure:
{
  "summary": "",
  "recommendedSlots": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "confidence": number,
      "reasons": ["Reason 1"],
      "travelBuffer": "Discrete note about gaps",
      "participants": ["Name"]
    }
  ],
  "considerations": ["Constraint or advice"],
  "followUp": ["Action item"]
}

Only output the JSON object.`;

    return await this.chat(systemPrompt, userPrompt, 2048);
  }

  /**
   * Analyze calendar for work-life balance
   */
  async analyzeCalendarBalance(data: {
    totalEvents: number;
    eventsByType: Array<{ type: string; count: number }>;
    familySize: number;
    weekRange: string;
  }): Promise<string> {
    const systemPrompt = `You are a family wellness advisor. Analyze calendar balance between work, activities, and family time.
Keep it supportive and practical.`;

    const userPrompt = `Week of ${data.weekRange}:
Family size: ${data.familySize}
Total events: ${data.totalEvents}

Events by type:
${data.eventsByType.map(t => `- ${t.type}: ${t.count}`).join('\n')}

Provide a brief assessment of their weekly balance and one suggestion if needed.`;

    return await this.chat(systemPrompt, userPrompt);
  }
}

// Export singleton instance
export const aiService = new AIService();
