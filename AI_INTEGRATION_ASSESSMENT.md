# AI Integration Assessment for Family Hub

## Overview
This document outlines how OpenRouter AI integration can enhance the Family Hub application across Calendar, Budget, Meals, and Shopping modules.

## OpenRouter API Integration
**API Key**: Configured in `.env.local` as `OPENROUTER_API_KEY`
**Provider**: OpenRouter (https://openrouter.ai)
**Usage**: RESTful API calls to various AI models for intelligent features

---

## 1. Calendar AI Features

### Smart Event Suggestions
**Use Case**: AI analyzes family patterns and suggests upcoming events
- **Example**: "Based on your child's swimming lessons every Tuesday, should I add next month's sessions?"
- **Implementation**:
  - Analyze recurring events
  - Detect patterns in scheduling
  - Suggest events based on historical data

### Conflict Detection & Resolution
**Use Case**: Intelligent conflict detection beyond simple time overlaps
- **Example**: "Ade has a dentist appointment at 3 PM, but school pickup is at 3:15 PM. Suggest rescheduling?"
- **Implementation**:
  - Analyze event locations and travel time
  - Consider family member availability
  - Suggest optimal rescheduling times

### Natural Language Event Creation
**Use Case**: Create events using conversational input
- **Example**: "Add Stewart's football practice every Thursday at 5pm starting next week"
- **Implementation**:
  - Parse natural language input
  - Extract date, time, recurrence, and details
  - Create properly formatted calendar events

### Intelligent Event Descriptions
**Use Case**: Auto-enhance event details with useful information
- **Example**: For "Dentist appointment" → Add typical duration, preparation tips, common questions
- **Implementation**:
  - Analyze event type
  - Generate contextual suggestions
  - Add helpful reminders

**API Endpoint Structure**:
```typescript
POST /api/ai/calendar/suggest-events
POST /api/ai/calendar/detect-conflicts
POST /api/ai/calendar/parse-natural-language
POST /api/ai/calendar/enhance-event
```

---

## 2. Budget AI Features

### Spending Pattern Analysis
**Use Case**: AI identifies spending trends and anomalies
- **Example**: "Your childcare spending is 15% higher than last month. This is mainly due to extra swimming lessons."
- **Implementation**:
  - Analyze monthly spending by category
  - Compare trends over time
  - Identify unusual expenses

### Smart Budget Recommendations
**Use Case**: Personalized budget advice based on family data
- **Example**: "Based on your family of 4 and current spending, consider allocating £400/month for groceries instead of £300"
- **Implementation**:
  - Analyze income and expenses
  - Compare with family size and demographics
  - Suggest optimal budget allocations

### Predictive Cash Flow
**Use Case**: Forecast future financial position
- **Example**: "With your current spending patterns, you'll have £1,200 surplus by end of Q4"
- **Implementation**:
  - Analyze recurring income and expenses
  - Project future balances
  - Warn about potential shortfalls

### Expense Categorization
**Use Case**: Auto-categorize expenses from descriptions
- **Example**: "Tesco receipt £45.67" → Auto-categorize as "Food & Dining"
- **Implementation**:
  - Parse expense names
  - Use AI to determine appropriate category
  - Learn from user corrections

### Financial Goal Insights
**Use Case**: AI provides actionable advice for reaching financial goals
- **Example**: "To save £5,000 for your holiday goal by June, reduce dining out by £150/month"
- **Implementation**:
  - Analyze current savings rate
  - Calculate gap to goal
  - Suggest specific adjustments

**API Endpoint Structure**:
```typescript
POST /api/ai/budget/analyze-spending
POST /api/ai/budget/recommend-budget
POST /api/ai/budget/predict-cashflow
POST /api/ai/budget/categorize-expense
POST /api/ai/budget/goal-insights
```

---

## 3. Meals AI Features

### AI Meal Planning
**Use Case**: Generate weekly meal plans based on preferences and constraints
- **Example**: "Create a week of dinners for 4 people, budget £60, include chicken twice, vegetarian once"
- **Implementation**:
  - Consider family size and preferences
  - Factor in budget constraints
  - Ensure nutritional balance
  - Avoid repetition

### Smart Recipe Suggestions
**Use Case**: Suggest recipes based on available ingredients or past meals
- **Example**: "You have chicken, rice, and broccoli. How about Chicken Stir-Fry?"
- **Implementation**:
  - Analyze current shopping list/pantry
  - Match with recipe database
  - Consider family preferences

### Nutritional Analysis & Advice
**Use Case**: Provide nutritional insights and recommendations
- **Example**: "This week's meals are low in vegetables. Consider adding a side salad to 3 dinners."
- **Implementation**:
  - Analyze meal components
  - Calculate nutritional values
  - Compare with recommended daily allowances
  - Suggest improvements

### Recipe Modification
**Use Case**: Adapt recipes for dietary restrictions or preferences
- **Example**: "Make this recipe vegetarian" or "Reduce calories by 20%"
- **Implementation**:
  - Parse recipe ingredients
  - Suggest substitutions
  - Recalculate nutritional info

### Shopping List Generation
**Use Case**: AI creates optimized shopping lists from meal plans
- **Example**: From 7 meals → Consolidate ingredients, suggest quantities, group by store section
- **Implementation**:
  - Extract all ingredients from planned meals
  - Consolidate duplicates
  - Organize by category
  - Estimate quantities and costs

### Leftover Suggestions
**Use Case**: Minimize food waste with leftover recipes
- **Example**: "You have leftover roast chicken. Make chicken tacos or chicken soup?"
- **Implementation**:
  - Track what was cooked
  - Suggest recipes using leftovers
  - Reduce food waste

**API Endpoint Structure**:
```typescript
POST /api/ai/meals/plan-week
POST /api/ai/meals/suggest-recipes
POST /api/ai/meals/analyze-nutrition
POST /api/ai/meals/modify-recipe
POST /api/ai/meals/generate-shopping-list
POST /api/ai/meals/leftover-ideas
```

---

## 4. Shopping AI Features

### Smart Shopping List Optimization
**Use Case**: AI optimizes shopping lists for efficiency and cost
- **Example**: "Group items by store location" or "Suggest cheaper alternatives"
- **Implementation**:
  - Organize items by store section
  - Suggest bulk buying opportunities
  - Identify cheaper substitutes

### Price Prediction & Alerts
**Use Case**: Track historical prices and alert to good deals
- **Example**: "Chicken breast is usually £8/kg. Current price £6/kg - stock up!"
- **Implementation**:
  - Track purchase history and prices
  - Detect price changes
  - Alert when items are below average

### Recurring Item Detection
**Use Case**: Auto-suggest items based on purchase patterns
- **Example**: "You buy milk every 4 days. Add to this week's list?"
- **Implementation**:
  - Analyze purchase frequency
  - Predict when items need replenishing
  - Auto-add to shopping list

### Store Selection Advice
**Use Case**: Suggest optimal store based on shopping list
- **Example**: "For this list, Tesco will save you £12 vs Sainsbury's"
- **Implementation**:
  - Analyze item availability and prices
  - Calculate total costs per store
  - Consider travel distance/time

### Seasonal Recommendations
**Use Case**: Suggest seasonal items and recipes
- **Example**: "Strawberries are in season and cheap. Add to your list?"
- **Implementation**:
  - Track seasonal produce
  - Suggest recipes using seasonal items
  - Highlight cost savings

### Meal-to-Shopping Integration
**Use Case**: Seamlessly convert meal plans to shopping lists
- **Example**: "Your meal plan needs 2kg chicken, 1kg rice, 500g broccoli. Add all?"
- **Implementation**:
  - Extract ingredients from meal plans
  - Check existing inventory
  - Only add missing items

**API Endpoint Structure**:
```typescript
POST /api/ai/shopping/optimize-list
POST /api/ai/shopping/price-alerts
POST /api/ai/shopping/predict-items
POST /api/ai/shopping/compare-stores
POST /api/ai/shopping/seasonal-suggestions
POST /api/ai/shopping/from-meal-plan
```

---

## Implementation Architecture

### Backend AI Service Layer
Create a centralized AI service for OpenRouter API calls:

**File**: `/src/services/aiService.ts`

```typescript
interface OpenRouterRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

export class AIService {
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
  }

  async chat(messages: Array<{role: string; content: string}>, model = 'anthropic/claude-3.5-sonnet'): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Family Hub'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      } as OpenRouterRequest)
    });

    const data: OpenRouterResponse = await response.json();
    return data.choices[0].message.content;
  }

  // Specific AI feature methods
  async analyzeSpending(expenses: any[], income: any[]): Promise<string> {
    const systemPrompt = "You are a financial advisor analyzing family spending patterns. Provide clear, actionable insights.";
    const userPrompt = `Analyze this family's finances:\n\nIncome: ${JSON.stringify(income)}\n\nExpenses: ${JSON.stringify(expenses)}\n\nProvide spending insights and recommendations.`;

    return await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
  }

  async generateMealPlan(familySize: number, budget: number, preferences: string[]): Promise<any> {
    const systemPrompt = "You are a meal planning expert. Create balanced, budget-friendly meal plans.";
    const userPrompt = `Create a 7-day dinner plan for a family of ${familySize}. Budget: £${budget}. Preferences: ${preferences.join(', ')}. Return as JSON with: [{day, mealName, protein, carbs, vegetables, estimatedCost}]`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    return JSON.parse(response);
  }

  async detectEventConflicts(events: any[]): Promise<string> {
    const systemPrompt = "You are a scheduling assistant. Identify conflicts and suggest solutions.";
    const userPrompt = `Analyze these events for conflicts:\n\n${JSON.stringify(events)}\n\nIdentify any scheduling issues and suggest resolutions.`;

    return await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
  }

  async optimizeShoppingList(items: any[], preferences: any): Promise<any> {
    const systemPrompt = "You are a shopping optimization expert. Organize lists efficiently.";
    const userPrompt = `Optimize this shopping list:\n\n${JSON.stringify(items)}\n\nPreferences: ${JSON.stringify(preferences)}\n\nReturn organized by store section with cost-saving suggestions.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    return JSON.parse(response);
  }
}

export const aiService = new AIService();
```

### Frontend AI Components

**File**: `/src/components/ai/AIInsightCard.tsx`
```typescript
interface AIInsightCardProps {
  title: string;
  insight: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  isLoading?: boolean;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  title,
  insight,
  actionButton,
  isLoading
}) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              Analyzing with AI...
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 whitespace-pre-line">{insight}</p>
              {actionButton && (
                <button
                  onClick={actionButton.onClick}
                  className="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  {actionButton.label} →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
```

### API Routes for AI Features

**Example**: `/src/app/api/ai/budget/analyze/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import { prisma } from '@/services/databaseService';

export async function POST(req: NextRequest) {
  try {
    const { familyId } = await req.json();

    // Fetch family's financial data
    const income = await prisma.budgetIncome.findMany({
      where: { familyId }
    });

    const expenses = await prisma.budgetExpenses.findMany({
      where: { familyId }
    });

    // Use AI to analyze
    const insights = await aiService.analyzeSpending(expenses, income);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze spending' },
      { status: 500 }
    );
  }
}
```

---

## UI Integration Points

### 1. Calendar View
- Add "AI Suggestions" button in header
- Show conflict warnings with AI insights
- Natural language event input field

### 2. Budget Dashboard
- "AI Insights" card showing spending analysis
- "Get Recommendations" button in budget settings
- Real-time expense categorization

### 3. Meals Dashboard
- "AI Meal Planner" button
- "Recipe Suggestions" section
- Nutritional analysis for planned meals

### 4. Shopping Lists
- "Optimize List" button using AI
- Price alerts and seasonal suggestions
- "From Meal Plan" button to auto-generate shopping list

---

## Cost Considerations

### OpenRouter Pricing
- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **GPT-4**: ~$30 per 1M input tokens, ~$60 per 1M output tokens
- **Cheaper models** (Claude Haiku, GPT-3.5): ~$0.25-$0.50 per 1M tokens

### Estimated Usage
- **Average family**: 100-500 AI requests/month
- **Typical cost**: £2-10/month per family
- **Optimization**: Cache common queries, use cheaper models for simple tasks

### Cost Optimization Strategies
1. Use Claude Haiku for simple tasks (categorization, basic suggestions)
2. Use Claude Sonnet for complex analysis (meal planning, financial insights)
3. Cache frequent queries (seasonal suggestions, common recipes)
4. Batch requests where possible
5. Set rate limits per family (e.g., 50 AI requests/day)

---

## Security & Privacy

### Data Handling
- Never send personally identifiable information to AI
- Anonymize financial amounts and names in prompts
- Store AI responses encrypted in database
- Clear AI conversation history after 30 days

### API Key Security
- Store in environment variables only
- Never expose in frontend code
- Rotate keys quarterly
- Monitor usage for anomalies

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up AI service layer
- Create basic API endpoints
- Implement AIInsightCard component
- Add AI insights to Budget dashboard

### Phase 2: Meals Intelligence (Week 2)
- AI meal planning
- Recipe suggestions
- Shopping list generation from meals
- Nutritional analysis

### Phase 3: Calendar & Shopping (Week 3)
- Smart event suggestions
- Conflict detection
- Shopping list optimization
- Price tracking

### Phase 4: Advanced Features (Week 4)
- Natural language event creation
- Predictive cash flow
- Leftover suggestions
- Seasonal recommendations
- Comprehensive testing and optimization

---

## Success Metrics

### User Engagement
- % of families using AI features
- Average AI requests per family per week
- Feature adoption rates

### Quality Metrics
- AI suggestion acceptance rate
- User satisfaction ratings
- Time saved by AI features

### Financial Metrics
- AI API costs per family
- Revenue impact (if premium feature)
- ROI calculation

---

## Conclusion

AI integration via OpenRouter can significantly enhance the Family Hub experience by:
1. **Reducing cognitive load**: Automate planning and decision-making
2. **Saving time**: Quick meal plans, optimized shopping lists, smart scheduling
3. **Improving outcomes**: Better budget management, healthier meals, efficient shopping
4. **Personalizing experience**: Learn from family patterns and preferences

**Recommended Next Steps**:
1. Start with Budget AI insights (high value, low complexity)
2. Add Meals AI planning (high demand feature)
3. Implement Shopping optimization (complements Meals)
4. Enhance Calendar with AI (advanced feature)

**Total Implementation Time**: 4-6 weeks for full AI integration across all modules
**Estimated Cost**: £5-15/month per active family in AI API fees
**Expected User Impact**: 30-40% improvement in time spent on family management tasks
