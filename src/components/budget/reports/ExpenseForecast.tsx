'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ReportFilter } from '@/types/reporting.types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import {
  Brain,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';

interface ExpenseForecastProps {
  filter: ReportFilter;
  incomeList?: any[];
  expenseList?: any[];
}

interface MonthlySummaryPoint {
  monthKey: string;
  label: string;
  total: number;
  categories: Array<{ category: string; amount: number }>;
}

interface ProjectionPoint {
  month: string;
  total: number;
  categories: Array<{ category: string; amount: number }>;
}

interface UpcomingEventSummary {
  id: string;
  title: string;
  date: string;
  cost: number;
  personName: string | null;
  eventType: string;
}

interface ForecastStats {
  averageMonthlySpend: number;
  monthOverMonthChange: number;
  trendDirection: 'up' | 'down' | 'flat';
  latestMonthTotal: number;
  latestIncomeTotal: number;
  growthRate: number;
}

interface ForecastResponse {
  summary: string;
  historicalExpenses: MonthlySummaryPoint[];
  historicalIncome: MonthlySummaryPoint[];
  projection: ProjectionPoint[];
  stats: ForecastStats;
  upcomingEvents: UpcomingEventSummary[];
  metadata: {
    monthsAnalyzed: number;
    generatedAt: string;
    familySize: number;
  };
}

const PERIOD_TO_MONTHS: Record<'3months' | '6months' | '12months', number> = {
  '3months': 3,
  '6months': 6,
  '12months': 12,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatPercentage = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const ExpenseForecastComponent: React.FC<ExpenseForecastProps> = ({
  filter,
}) => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  void filter; // filter can be used for future date range customisation
  const [forecastPeriod, setForecastPeriod] = useState<'3months' | '6months' | '12months'>('6months');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<string>('');
  const [historicalExpenses, setHistoricalExpenses] = useState<MonthlySummaryPoint[]>([]);
  const [projections, setProjections] = useState<ProjectionPoint[]>([]);
  const [stats, setStats] = useState<ForecastStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventSummary[]>([]);
  const [metadata, setMetadata] = useState<ForecastResponse['metadata'] | null>(null);

  const fetchForecast = useCallback(async () => {
    if (!familyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/budget/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
          months: PERIOD_TO_MONTHS[forecastPeriod],
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Unable to load budget forecast');
      }

      const result = (await response.json()) as ForecastResponse;
      setSummary(result.summary || '');
      setHistoricalExpenses(result.historicalExpenses || []);
      setProjections(result.projection || []);
      setStats(result.stats || null);
      setUpcomingEvents(result.upcomingEvents || []);
      setMetadata(result.metadata || null);
    } catch (err) {
      console.error('Error fetching budget forecast:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load budget forecast'
      );
    } finally {
      setIsLoading(false);
    }
  }, [familyId, forecastPeriod]);

  useEffect(() => {
    if (familyId) {
      fetchForecast();
    }
  }, [familyId, forecastPeriod, fetchForecast]);

  const combinedData = useMemo(() => {
    const actual = historicalExpenses.map((entry) => ({
      month: entry.label,
      actual: Number(entry.total.toFixed(2)),
      predicted: null as number | null,
    }));

    const predicted = projections.map((entry) => ({
      month: entry.month,
      actual: null as number | null,
      predicted: Number(entry.total.toFixed(2)),
    }));

    return [...actual, ...predicted];
  }, [historicalExpenses, projections]);

  const categoryForecasts = useMemo(() => {
    if (!historicalExpenses.length) {
      return [] as Array<{
        category: string;
        currentAmount: number;
        predictedAmount: number;
        growth: number;
      }>;
    }

    const latest = historicalExpenses[historicalExpenses.length - 1];
    const nextProjection = projections[0];

    return latest.categories
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)
      .map((category) => {
        const projected = nextProjection?.categories.find(
          (item) => item.category === category.category
        );
        const predictedAmount = projected?.amount ?? category.amount;
        const growth = category.amount > 0
          ? ((predictedAmount - category.amount) / category.amount) * 100
          : 0;

        return {
          category: category.category,
          currentAmount: Number(category.amount.toFixed(2)),
          predictedAmount: Number(predictedAmount.toFixed(2)),
          growth,
        };
      });
  }, [historicalExpenses, projections]);

  const parsedSummary = useMemo(() => {
    if (!summary) return [] as string[];
    return summary
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }, [summary]);

  const renderTrendBadge = () => {
    if (!stats) return null;

    if (stats.trendDirection === 'up') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
          <TrendingUp className="w-3 h-3" /> Spending rising
        </span>
      );
    }

    if (stats.trendDirection === 'down') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
          <TrendingDown className="w-3 h-3" /> Spending easing
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
        <Activity className="w-3 h-3" /> Stable trend
      </span>
    );
  };

  if (!familyId) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
        Connect to a family profile to generate a data-backed forecast.
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Forecast unavailable</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchForecast}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-800"
            >
              Try again →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !historicalExpenses.length) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 flex items-center gap-3 text-gray-600">
        <Loader2 className="w-5 h-5 animate-spin" />
        Preparing your forecast...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-gray-900">Expense Forecasting</h2>
              {renderTrendBadge()}
            </div>
            <p className="text-gray-600 text-sm">
              AI-powered predictions using the last {metadata?.monthsAnalyzed || PERIOD_TO_MONTHS[forecastPeriod]} months of spending.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-700">AI Powered</span>
            </div>
            <div className="flex space-x-2">
              {(['3months', '6months', '12months'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setForecastPeriod(period)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    forecastPeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period === '3months' && '3 Months'}
                  {period === '6months' && '6 Months'}
                  {period === '12months' && '12 Months'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {parsedSummary.length > 0 && (
          <div className="mt-4 grid gap-2 text-sm text-gray-700">
            {parsedSummary.map((line, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-purple-600 flex-shrink-0">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Average monthly spend</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.averageMonthlySpend)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Last month</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.latestMonthTotal)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Month change</p>
              <p className={`text-lg font-semibold ${stats.monthOverMonthChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(stats.monthOverMonthChange)}
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Growth rate</p>
              <p className="text-lg font-semibold text-gray-900">{formatPercentage(stats.growthRate * 100)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Actual vs projected spend</h3>
            {isLoading && (
              <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating forecast
              </span>
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="predicted" stroke="#F97316" strokeWidth={2} strokeDasharray="5 5" dot={{ stroke: '#F97316', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Top categories outlook</h3>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          {categoryForecasts.length === 0 ? (
            <p className="text-sm text-gray-600">
              Add more expenses with categories to unlock category-level forecasts.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryForecasts.map((forecast) => (
                <div key={forecast.category} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{forecast.category}</p>
                    <span className={`text-xs font-medium ${forecast.growth >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercentage(forecast.growth)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                    <span>Current: {formatCurrency(forecast.currentAmount)}</span>
                    <span>Projected: {formatCurrency(forecast.predictedAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Projected monthly totals</h3>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projections.slice(0, 4)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming cost drivers</h3>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-600">
              No upcoming calendar events with costs in the next 60 days.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {event.personName ? ` • ${event.personName}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(event.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseForecastComponent;
