'use client'

import { useMemo, useState } from 'react';
import { formatDateLong } from '@/utils/formatDate';
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
  UtensilsCrossed,
  Zap,
  ShoppingCart,
  PieChart,
  Wrench,
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
import { useContractorContext } from '@/contexts/familyHub/ContractorContext';
import { stewartFleming2025To2026, stewartFleming2026To2027 } from '@/data/schoolTerms';
import { extractBudgetRecords, summariseBudgetForMonth } from '@/utils/budgetAnalytics';
import { UpcomingContractorVisits } from '@/components/contractors';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);
const formatShortDate = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const dateValue = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(dateValue.getTime())) return '';
  const day = dateValue.getDate().toString().padStart(2, '0');
  const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
  const year = dateValue.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format date as "Wed 17 Dec" for clear display
const formatNiceDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

// Calculate days between two dates
const daysBetween = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

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
    } ${className ?? ''} dark:border-slate-700 dark:bg-slate-800`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{value}</p>
      </div>
      <div className="rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {subtext && <p className="text-xs text-gray-500 dark:text-slate-400">{subtext}</p>}
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
  const { openQuickAppointment, upcomingAppointments } = useContractorContext();
  const mealPlanning = mealsContext.mealPlanning;

  // School year selector state - calculate dynamically based on current date
  // Academic year starts in September
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1; // Sept = month 8
  const currentAcademicYear = `${academicYear}-${academicYear + 1}`;
  const nextAcademicYear = `${academicYear + 1}-${academicYear + 2}`;

  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(currentAcademicYear);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => new Date(`${event.date}T${event.time}`) >= now)
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
      .slice(0, 5);
  }, [events]);

  const schoolTerms = useMemo(() => {
    // Use selected school year data - map dynamic years to available data
    // For now, use 2025-2026 data for current year, 2026-2027 for next
    const baseTerms = selectedSchoolYear === currentAcademicYear
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
  }, [events, selectedSchoolYear, currentAcademicYear]);

  const { expenseRecords } = useMemo(() => extractBudgetRecords(budgetData), [budgetData]);

  const monthlyBudgetSnapshot = useMemo(
    () => summariseBudgetForMonth(budgetData),
    [budgetData]
  );

  const budgetCardTotals = useMemo(() => ({
    income: monthlyBudgetSnapshot.totalIncome,
    expenses: monthlyBudgetSnapshot.totalExpenses,
    net: monthlyBudgetSnapshot.netIncome,
  }), [monthlyBudgetSnapshot.netIncome, monthlyBudgetSnapshot.totalExpenses, monthlyBudgetSnapshot.totalIncome]);

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
    if (!expenseRecords.length) return [] as Array<{ category: string; amount: number }>;

    const totals = new Map<string, number>();
    expenseRecords.forEach((record) => {
      const category = record.category || 'Other';
      totals.set(category, (totals.get(category) || 0) + Number(record.amount || 0));
    });

    return Array.from(totals.entries()).map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }));
  }, [expenseRecords]);

  const upcomingSchoolHighlights = useMemo(() => {
    const today = new Date();
    return schoolTerms
      .filter((term) => new Date(term.start) >= today)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  }, [schoolTerms]);

  // Find the next school break with clear break-up and return dates
  const nextSchoolBreak = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all breaks (both full breaks and half-terms)
    const allBreaks = schoolTerms
      .filter((term) => term.type === 'break' || term.type === 'half-term')
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Check if we're currently IN a break
    const currentBreak = allBreaks.find((brk) => {
      const startDate = brk.start;
      const endDate = brk.end || brk.start;
      return todayStr >= startDate && todayStr <= endDate;
    });

    if (currentBreak) {
      // We're currently on a break - find when school returns
      const nextTermStart = schoolTerms
        .filter((term) => term.type === 'term' && term.name.toLowerCase().includes('start'))
        .filter((term) => term.start > (currentBreak.end || currentBreak.start))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

      const breakEnd = currentBreak.end || currentBreak.start;
      const daysRemaining = daysBetween(todayStr, breakEnd);

      return {
        isCurrentlyOnBreak: true,
        breakName: currentBreak.name,
        breakEndDate: breakEnd,
        returnDate: nextTermStart?.start,
        daysRemaining,
        breakUpDate: currentBreak.start,
        breakUpName: currentBreak.name,
        daysUntilBreak: 0,
        breakDuration: currentBreak.end ? daysBetween(currentBreak.start, currentBreak.end) + 1 : 1,
      };
    }

    // Find the next upcoming break (not currently in one)
    const nextBreak = allBreaks.find((brk) => brk.start > todayStr);

    if (!nextBreak) return null;

    // Find when school breaks up for this break
    // For half-terms, we need to find the day before the break starts
    // For full breaks (Easter, Christmas, Summer), find the term end before it
    let breakUpDate = nextBreak.start;
    let breakUpName = nextBreak.name;

    // Look for a term end that happens just before this break
    const termEndBefore = schoolTerms
      .filter((term) => term.type === 'term' && term.name.toLowerCase().includes('end'))
      .filter((term) => {
        const termEndDate = new Date(term.start);
        const breakStartDate = new Date(nextBreak.start);
        const daysDiff = (breakStartDate.getTime() - termEndDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff >= 0 && daysDiff <= 7; // Within a week before break
      })
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())[0];

    if (termEndBefore) {
      breakUpDate = termEndBefore.start;
      breakUpName = termEndBefore.name.replace(' Ends', '');
    } else {
      // For half-terms, the break-up day is the Friday before (day before break starts)
      const breakStart = new Date(nextBreak.start);
      breakStart.setDate(breakStart.getDate() - 3); // Typically Friday before Monday half-term
      // But we'll just use the break start minus 1 day as "last day of school"
      const lastSchoolDay = new Date(nextBreak.start);
      lastSchoolDay.setDate(lastSchoolDay.getDate() - 1);
      breakUpDate = lastSchoolDay.toISOString().split('T')[0];
      breakUpName = nextBreak.name.replace(' Break', '');
    }

    // Find when school returns after this break
    const nextTermStart = schoolTerms
      .filter((term) => term.type === 'term' && term.name.toLowerCase().includes('start'))
      .filter((term) => term.start > (nextBreak.end || nextBreak.start))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

    const daysUntilBreak = daysBetween(todayStr, breakUpDate);
    const breakDuration = nextBreak.end ? daysBetween(nextBreak.start, nextBreak.end) + 1 : 1;

    return {
      isCurrentlyOnBreak: false,
      breakUpDate,
      breakUpName,
      returnDate: nextTermStart?.start,
      breakName: nextBreak.name,
      daysUntilBreak,
      breakDuration,
    };
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
      value: formatCurrency(budgetCardTotals.net),
      subtext: `Income ${formatCurrency(budgetCardTotals.income)}`,
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
  ]), [avgGoalProgress, budgetCardTotals, lists, setView, totalGoals, upcomingEvents]);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Snapshot</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {formatDateLong(new Date())}
          </p>
        </div>
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
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Upcoming Schedule</h3>
            <button
              onClick={() => openCreateForm()}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
              <div key={event.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
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

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Family Activity</h3>
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
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
              <GraduationCap className="h-5 w-5 text-purple-500" /> Stewart Fleming Term Dates
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSchoolYear(currentAcademicYear)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedSchoolYear === currentAcademicYear
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {academicYear}/{(academicYear + 1).toString().slice(-2)}
              </button>
              <button
                onClick={() => setSelectedSchoolYear(nextAcademicYear)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedSchoolYear === nextAcademicYear
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {academicYear + 1}/{(academicYear + 2).toString().slice(-2)}
              </button>
            </div>
          </div>
          {/* Next Break Summary - Clear at-a-glance view */}
          {nextSchoolBreak && (
            <div className={`mb-4 p-4 rounded-lg border ${
              nextSchoolBreak.isCurrentlyOnBreak
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{nextSchoolBreak.isCurrentlyOnBreak ? '🏖️' : '🎉'}</span>
                <span className={`font-semibold ${
                  nextSchoolBreak.isCurrentlyOnBreak
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-purple-900 dark:text-purple-100'
                }`}>
                  {nextSchoolBreak.isCurrentlyOnBreak ? 'Currently on Break!' : 'Next School Break'}
                </span>
                {nextSchoolBreak.isCurrentlyOnBreak ? (
                  <span className="ml-auto px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">
                    {nextSchoolBreak.daysRemaining} days left
                  </span>
                ) : nextSchoolBreak.daysUntilBreak > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
                    {nextSchoolBreak.daysUntilBreak} days to go
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {nextSchoolBreak.isCurrentlyOnBreak ? (
                  <>
                    <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Enjoying</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-1">
                        {nextSchoolBreak.breakName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Until {nextSchoolBreak.breakEndDate && formatNiceDate(nextSchoolBreak.breakEndDate)}</p>
                    </div>
                    {nextSchoolBreak.returnDate && (
                      <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Back to school</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-1">
                          {formatNiceDate(nextSchoolBreak.returnDate)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Time to enjoy!</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Breaking up</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-1">
                        {formatNiceDate(nextSchoolBreak.breakUpDate)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{nextSchoolBreak.breakUpName}</p>
                    </div>
                    {nextSchoolBreak.returnDate && (
                      <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Back to school</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-1">
                          {formatNiceDate(nextSchoolBreak.returnDate)}
                        </p>
                        {nextSchoolBreak.breakDuration > 0 && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">{nextSchoolBreak.breakDuration} days off</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Term Dates */}
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
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{term.name}</p>
                  <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                    {term.end
                      ? `${formatNiceDate(term.start)} → ${formatNiceDate(term.end)}`
                      : formatNiceDate(term.start)
                    }
                  </p>
                  {term.description && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{term.description}</p>
                  )}
                  <div className="mt-3 inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-200">
                    <BookOpen className="mr-1 h-4 w-4" /> {term.type.replace('-', ' ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Quick Actions</h3>
          </div>
          <div className="mt-4 space-y-3">
            <button
              onClick={() => openMealForm(new Date().toISOString().split('T')[0])}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-blue-300 hover:shadow dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Plan this week&apos;s meals</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Keep the meal planner up to date</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => openBudgetForm()}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-emerald-300 hover:shadow dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Update budget tracker</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Capture income and expenses</p>
                </div>
              </div>
              <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
            </button>
            <button
              onClick={() => openShoppingForm(lists[0]?.id)}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-orange-300 hover:shadow dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-orange-500 dark:text-orange-300" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Add to shopping list</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Stay ahead of grocery needs</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => openFamilyForm()}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-indigo-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Add family member</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Keep household records up to date</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setView('calendar')}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-purple-300 hover:shadow"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-500 dark:text-purple-300" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Review calendar</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Check clashes before the week begins</p>
                </div>
              </div>
            </button>
            <button
              onClick={openQuickAppointment}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-amber-300 hover:shadow dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-amber-500 dark:text-amber-300" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Book contractor</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Schedule a visit quickly</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
            <BarChart3 className="h-5 w-5 text-blue-500" /> Budget Overview
          </h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Income', amount: budgetCardTotals.income, fill: '#10B981' },
                { name: 'Expenses', amount: budgetCardTotals.expenses, fill: '#EF4444' },
                { name: 'Net', amount: budgetCardTotals.net, fill: budgetCardTotals.net >= 0 ? '#3B82F6' : '#F59E0B' }
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
            <div className="rounded-lg bg-green-50 p-3 border border-green-200 dark:border-green-500/40 dark:bg-green-500/10">
              <p className="text-xs text-green-700 font-medium dark:text-green-300">Total Income</p>
              <p className="text-lg font-semibold text-green-900 dark:text-green-200">£{budgetCardTotals.income.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 border border-red-200 dark:border-red-500/40 dark:bg-red-500/10">
              <p className="text-xs text-red-700 font-medium dark:text-red-300">Total Expenses</p>
              <p className="text-lg font-semibold text-red-900 dark:text-red-200">£{budgetCardTotals.expenses.toLocaleString()}</p>
            </div>
            <div className={`rounded-lg p-3 border ${budgetCardTotals.net >= 0 ? 'bg-blue-50 border-blue-200 dark:border-blue-500/40 dark:bg-blue-500/10' : 'bg-amber-50 border-amber-200 dark:border-amber-500/40 dark:bg-amber-500/10'}`}>
              <p className={`text-xs font-medium ${budgetCardTotals.net >= 0 ? 'text-blue-700 dark:text-blue-200' : 'text-amber-700 dark:text-amber-200'}`}>Net Income</p>
              <p className={`text-lg font-semibold ${budgetCardTotals.net >= 0 ? 'text-blue-900 dark:text-blue-200' : 'text-amber-900 dark:text-amber-200'}`}>
                £{budgetCardTotals.net.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
            <Activity className="h-5 w-5 text-rose-500" /> Recent Activity
          </h3>
          <div className="mt-4 space-y-3 text-sm">
            {personalTracking.fitness.activities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="rounded-lg border border-gray-100 px-3 py-2">
                <p className="font-medium text-gray-900">{activity.type}</p>
                <p className="text-xs text-gray-500">
                  {formatShortDate(activity.date)} • {activity.duration} mins • {activity.intensity}
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

      <section className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
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

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
            <Utensils className="h-5 w-5 text-green-500" /> Meal plan highlights
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            {upcomingMeals.map((meal) => (
              <li key={meal.date} className="rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="font-medium text-gray-900 dark:text-slate-100">{meal.name || 'Family meal'}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{formatShortDate(meal.date)}</p>
              </li>
            ))}
            {upcomingMeals.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-slate-400">No meals planned yet. Add one using the quick actions.</p>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
            <ShoppingBag className="h-5 w-5 text-orange-500 dark:text-orange-300" /> Shopping lists
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            {lists.map((list) => (
              <li key={list.id} className="rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <p className="font-medium text-gray-900 dark:text-slate-100">{list.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {list.items.length} items • Est. £{list.estimatedTotal.toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <UpcomingContractorVisits />
      </section>
    </div>
  );
};
