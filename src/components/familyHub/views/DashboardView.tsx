'use client'

import { useMemo, useState, useEffect } from 'react';
import { formatDate } from '@/utils/formatDate';
import {
  Activity,
  CalendarDays,
  DollarSign,
  ShoppingBag,
  Users,
  Target,
  BarChart3,
  TrendingUp,
  Clock,
  Utensils,
  GraduationCap,
  BookOpen,
  Heart,
  UtensilsCrossed,
  Zap,
  ShoppingCart,
  PieChart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useBudgetContext } from '@/contexts/familyHub/BudgetContext';
import { useShoppingContext } from '@/contexts/familyHub/ShoppingContext';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useGoalsContext } from '@/contexts/familyHub/GoalsContext';
import { useMealsContext } from '@/contexts/familyHub/MealsContext';
import { stewartFleming2025To2026, stewartFleming2026To2027 } from '@/data/schoolTerms';
import { useFamilyStore } from '@/store/familyStore';

const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  onClick,
  className,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: typeof Activity;
  onClick?: () => void;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow ${
      onClick ? 'cursor-pointer' : 'cursor-default'
    } ${className ?? ''}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className="rounded-full bg-blue-50 p-2 text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
  </button>
);

export const DashboardView = () => {
  const { setView } = useAppView();
  const { events, openCreateForm } = useCalendarContext();
  const { data: budgetData, openForm: openBudgetForm } = useBudgetContext();
  const mealsContext = useMealsContext();
  const { openMealForm } = mealsContext;
  const { lists, openForm: openShoppingForm } = useShoppingContext();
  const { members, openForm: openFamilyForm } = useFamilyContext();
  const { goalsData, openQuickActivityForm, personalTracking } = useGoalsContext();
  const mealPlanning = mealsContext.mealPlanning;

  // School year selector state
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<'2025-2026' | '2026-2027'>('2025-2026');

  // Fetch actual budget data from database
  const [dbBudgetTotals, setDbBudgetTotals] = useState({ income: 0, expenses: 0, net: 0 });
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);

  useEffect(() => {
    const fetchBudgetData = async () => {
      if (!familyId) return;

      try {
        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const [incomeRes, expensesRes] = await Promise.all([
          fetch(`/api/families/${familyId}/budget/income?month=${currentMonth}&year=${currentYear}`),
          fetch(`/api/families/${familyId}/budget/expenses?month=${currentMonth}&year=${currentYear}`)
        ]);

        const incomeList = await incomeRes.json();
        const expenseList = await expensesRes.json();

        const totalIncome = Array.isArray(incomeList)
          ? incomeList.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0)
          : 0;
        const totalExpenses = Array.isArray(expenseList)
          ? expenseList.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0)
          : 0;

        setDbBudgetTotals({
          income: totalIncome,
          expenses: totalExpenses,
          net: totalIncome - totalExpenses
        });
      } catch (error) {
        console.error('Failed to fetch budget data:', error);
      }
    };

    fetchBudgetData();
  }, [familyId]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => new Date(`${event.date}T${event.time}`) >= now)
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
      .slice(0, 5);
  }, [events]);

  const schoolTerms = useMemo(() => {
    // Use selected school year data
    const baseTerms = selectedSchoolYear === '2025-2026'
      ? stewartFleming2025To2026
      : stewartFleming2026To2027;

    if (events.length === 0) {
      return baseTerms;
    }

    const calendarDerived = events
      .filter((event) => event.title.toLowerCase().includes('fleming') || event.id?.startsWith('school-'))
      .map((event) => {
        const lowerTitle = event.title.toLowerCase();
        let type: 'term' | 'half-term' | 'break' | 'inset' = 'term';
        if (lowerTitle.includes('half')) type = 'half-term';
        if (lowerTitle.includes('break') || lowerTitle.includes('holiday')) type = 'break';
        if (lowerTitle.includes('inset')) type = 'inset';

        return {
          id: event.id ?? `school-${event.title.toLowerCase().replace(/\s+/g, '-')}`,
          name: event.title,
          start: event.date,
          end: undefined,
          type,
          description: event.notes,
        };
      });

    return calendarDerived.length > 0 ? calendarDerived : baseTerms;
  }, [events, selectedSchoolYear]);

  const budgetTotals = useMemo(() => {
    if (!budgetData) {
      return { income: 0, expenses: 0, net: 0 };
    }

    const income = Object.values(budgetData.income.monthly ?? {})
      .filter((item: any) => item !== null && item !== undefined)
      .reduce((sum, item: any) => sum + (item.amount || 0), 0)
      + (budgetData.income.oneTime ?? [])
        .filter((item: any) => item !== null && item !== undefined)
        .reduce((sum, item: any) => sum + (item.amount || 0), 0);

    const recurringExpenses = Object.values(budgetData.expenses.recurringMonthly ?? {})
      .filter((section: any) => section !== null && section !== undefined)
      .reduce((sectionSum, section: any) => {
        return sectionSum + Object.values(section)
          .filter((item: any) => item !== null && item !== undefined)
          .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      }, 0);

    const oneTimeExpenses = (budgetData.expenses.oneTimeSpends ?? [])
      .filter((item: any) => item !== null && item !== undefined)
      .reduce((sum, item: any) => sum + (item.amount || 0), 0);

    const expenses = recurringExpenses + oneTimeExpenses;

    return {
      income,
      expenses,
      net: income - expenses,
    };
  }, [budgetData]);

  const totalGoals = (goalsData?.familyGoals?.length || 0) + (goalsData?.individualGoals?.length || 0);
  const avgGoalProgress = useMemo(() => {
    if (!goalsData) return 0;
    const values = [
      ...(goalsData.familyGoals ?? []).map((goal: any) => goal.progress || 0),
      ...(goalsData.individualGoals ?? []).map((goal: any) => goal.progress || 0),
    ];
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [goalsData]);

  const upcomingMeals = useMemo(() => {
    if (!mealPlanning) return [] as Array<{ date: string; name: string }>;
    return Object.entries(mealPlanning.planned || {})
      .map(([date, meal]) => ({ date, name: (meal as any).name || `${(meal as any).protein ?? ''} ${(meal as any).carb ?? ''}` }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [mealPlanning]);

  const budgetCategorySeries = useMemo(() => {
    if (!budgetData) return [] as Array<{ category: string; amount: number }>;

    const recurring = Object.entries(budgetData.expenses.recurringMonthly || {}).flatMap(([group, items]) =>
      Object.values(items as Record<string, any>)
        .filter((item: any) => item !== null && item !== undefined)
        .map((item: any) => ({
          category: item.category || group,
          amount: item.amount || 0,
        }))
    );

    const oneTime = (budgetData.expenses.oneTimeSpends || [])
      .filter((item: any) => item !== null && item !== undefined)
      .map((item: any) => ({
        category: item.category || 'One-time',
        amount: item.amount || 0,
      }));

    const merged = [...recurring, ...oneTime];
    const totals = new Map<string, number>();
    merged.forEach(({ category, amount }) => {
      totals.set(category, (totals.get(category) || 0) + amount);
    });

    return Array.from(totals.entries()).map(([category, amount]) => ({ category, amount }));
  }, [budgetData]);

  const upcomingSchoolHighlights = useMemo(() => {
    const today = new Date();
    return schoolTerms
      .filter((term) => new Date(term.start) >= today)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  }, [schoolTerms]);

  const snapshotCards = useMemo(() => ([
    {
      key: 'events',
      label: 'Upcoming Events',
      value: String(upcomingEvents.length),
      subtext: upcomingEvents[0]?.title ? `Next: ${upcomingEvents[0].title}` : 'All caught up',
      icon: CalendarDays,
      onClick: () => setView('calendar' as const),
    },
    {
      key: 'budget',
      label: 'Net Income',
      value: `£${dbBudgetTotals.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      subtext: `Income £${dbBudgetTotals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      onClick: () => setView('budget' as const),
    },
    {
      key: 'shopping',
      label: 'Shopping Lists',
      value: String(lists.length),
      subtext: `Estimated £${lists.reduce((sum, list) => sum + (list.estimatedTotal || 0), 0).toFixed(0)}`,
      icon: ShoppingBag,
      onClick: () => setView('shopping' as const),
    },
    {
      key: 'goals',
      label: 'Active Goals',
      value: String(totalGoals),
      subtext: `Avg progress ${avgGoalProgress}%`,
      icon: Target,
      onClick: () => setView('goals' as const),
    },
  ]), [avgGoalProgress, dbBudgetTotals, lists, setView, totalGoals, upcomingEvents]);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Snapshot</h2>
        <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:hidden">
          {snapshotCards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={card.value}
              subtext={card.subtext}
              icon={card.icon}
              onClick={card.onClick}
              className="min-w-[220px] snap-start"
            />
          ))}
        </div>
        <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4">
          {snapshotCards.map((card) => (
            <StatCard
              key={`grid-${card.key}`}
              label={card.label}
              value={card.value}
              subtext={card.subtext}
              icon={card.icon}
              onClick={card.onClick}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Upcoming Schedule</h3>
            <button
              onClick={() => openCreateForm()}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
            >
              Add Event
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-gray-500">No upcoming events scheduled.</p>
            )}
            {upcomingEvents.map((event) => {
              const person = members.find((m) => m.id === event.person);
              return (
                <div key={event.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {event.date} at {event.time} • {event.location || 'TBC'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{person?.name || 'Family'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">Family Activity</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Today&apos;s steps</span>
              <span className="font-semibold text-gray-900">{personalTracking.fitness.todaySteps.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-gray-500">Weekly goal progress</span>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min((personalTracking.fitness.weeklyProgress / personalTracking.fitness.weeklyGoal) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{personalTracking.fitness.weeklyProgress}/{personalTracking.fitness.weeklyGoal} workouts</span>
            </div>
            <button
              onClick={openQuickActivityForm}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Activity className="mr-2 h-4 w-4" /> Log Activity
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <GraduationCap className="h-5 w-5 text-purple-500" /> Stewart Fleming Term Dates
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSchoolYear('2025-2026')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedSchoolYear === '2025-2026'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2025/26
              </button>
              <button
                onClick={() => setSelectedSchoolYear('2026-2027')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedSchoolYear === '2026-2027'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2026/27
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingSchoolHighlights.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-sm text-gray-500">
                  All term dates for {selectedSchoolYear} have passed
                </p>
              </div>
            ) : (
              upcomingSchoolHighlights.map((term) => (
                <div key={term.name} className="dashboard-widget p-4">
                  <p className="text-sm font-semibold text-gray-900">{term.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {term.end ? `${term.start} → ${term.end}` : term.start}
                  </p>
                  {term.description && (
                    <p className="mt-2 text-xs text-gray-500">{term.description}</p>
                  )}
                  <div className="mt-3 inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    <BookOpen className="mr-1 h-4 w-4" /> {term.type.replace('-', ' ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="mt-4 space-y-3">
            <button
              onClick={() => openMealForm(new Date().toISOString().split('T')[0])}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-blue-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Plan this week&apos;s meals</p>
                  <p className="text-xs text-gray-500">Keep the meal planner up to date</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => openBudgetForm()}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-emerald-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-gray-900">Update budget tracker</p>
                  <p className="text-xs text-gray-500">Capture income and expenses</p>
                </div>
              </div>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </button>
            <button
              onClick={() => openShoppingForm(lists[0]?.id)}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-orange-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-gray-900">Add to shopping list</p>
                  <p className="text-xs text-gray-500">Stay ahead of grocery needs</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => openFamilyForm()}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-indigo-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="font-medium text-gray-900">Add family member</p>
                  <p className="text-xs text-gray-500">Keep household records up to date</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setView('calendar')}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-purple-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium text-gray-900">Review calendar</p>
                  <p className="text-xs text-gray-500">Check clashes before the week begins</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <BarChart3 className="h-5 w-5 text-blue-500" /> Budget Overview
          </h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Income', amount: dbBudgetTotals.income, fill: '#10B981' },
                { name: 'Expenses', amount: dbBudgetTotals.expenses, fill: '#EF4444' },
                { name: 'Net', amount: dbBudgetTotals.net, fill: dbBudgetTotals.net >= 0 ? '#3B82F6' : '#F59E0B' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `£${value.toLocaleString()}`} width={80} />
                <Tooltip formatter={(value: number) => `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-green-50 p-3 border border-green-200">
              <p className="text-xs text-green-700 font-medium">Total Income</p>
              <p className="text-lg font-semibold text-green-900">£{dbBudgetTotals.income.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
              <p className="text-xs text-red-700 font-medium">Total Expenses</p>
              <p className="text-lg font-semibold text-red-900">£{dbBudgetTotals.expenses.toLocaleString()}</p>
            </div>
            <div className={`rounded-lg p-3 border ${dbBudgetTotals.net >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-xs font-medium ${dbBudgetTotals.net >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Net Income</p>
              <p className={`text-lg font-semibold ${dbBudgetTotals.net >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>
                £{dbBudgetTotals.net.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Heart className="h-5 w-5 text-rose-500" /> Fitness & wellbeing
          </h3>
          <div className="mt-4 space-y-3 text-sm">
            {personalTracking.fitness.activities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="rounded-lg border border-gray-100 px-3 py-2">
                <p className="font-medium text-gray-900">{activity.type}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(activity.date)} • {activity.duration} mins • {activity.intensity}
                </p>
                {activity.notes && <p className="mt-1 text-xs text-gray-400">{activity.notes}</p>}
              </div>
            ))}
            <button
              onClick={openQuickActivityForm}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Activity className="h-4 w-4" /> Log new activity
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Users className="h-5 w-5 text-indigo-500" /> Household members
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between rounded-md border border-gray-100 p-3">
                <span className="font-medium text-gray-900">{member.name}</span>
                <span className="text-xs text-gray-400">{member.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Utensils className="h-5 w-5 text-green-500" /> Meal plan highlights
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            {upcomingMeals.map((meal) => (
              <li key={meal.date} className="rounded-lg border border-gray-100 px-3 py-2">
                <p className="font-medium text-gray-900">{meal.name || 'Family meal'}</p>
                <p className="text-xs text-gray-500">{formatDate(meal.date)}</p>
              </li>
            ))}
            {upcomingMeals.length === 0 && (
              <p className="text-xs text-gray-500">No meals planned yet. Add one using the quick actions.</p>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <ShoppingBag className="h-5 w-5 text-orange-500" /> Shopping lists
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            {lists.map((list) => (
              <li key={list.id} className="rounded-lg border border-gray-100 px-3 py-2">
                <p className="font-medium text-gray-900">{list.name}</p>
                <p className="text-xs text-gray-500">
                  {list.items.length} items • Est. £{list.estimatedTotal.toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
