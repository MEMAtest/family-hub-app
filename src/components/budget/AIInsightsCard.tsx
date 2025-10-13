'use client'

import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Loader2,
  BarChart3,
  Scale,
} from 'lucide-react';

interface AIInsightsCardProps {
  familyId: string;
  month?: number;
  year?: number;
}

interface BenchmarkComparison {
  category: string;
  actual: number;
  benchmark: number | null;
  difference: number | null;
  status: 'above' | 'below' | 'at-par' | 'no-benchmark';
}

interface BenchmarkResult {
  analysis: string;
  comparisons: BenchmarkComparison[];
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  familyId,
  month,
  year
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [benchmarkMetadata, setBenchmarkMetadata] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'benchmark'>('insights');

  const renderFormattedLines = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const cleaned = line.replace(/^\*+\s*/, '').replace(/\*\*/g, '').trim();
      if (!cleaned) {
        return null;
      }

      if (/^[\d\-•]/.test(cleaned)) {
        return (
          <div key={`${line}-${idx}`} className="flex gap-2">
            <span className="text-purple-600 flex-shrink-0">•</span>
            <span>{cleaned.replace(/^[\d\-•]\s*\.?\s*/, '')}</span>
          </div>
        );
      }

      if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
        return (
          <div key={`${line}-${idx}`} className="font-semibold text-purple-800 mt-2">
            {cleaned}
          </div>
        );
      }

      return <div key={`${line}-${idx}`}>{cleaned}</div>;
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(amount);

  const getComparisonStatusStyles = (status: BenchmarkComparison['status']) => {
    switch (status) {
      case 'above':
        return 'bg-red-100 text-red-700';
      case 'below':
        return 'bg-green-100 text-green-700';
      case 'at-par':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getComparisonStatusLabel = (comparison: BenchmarkComparison) => {
    if (comparison.status === 'no-benchmark') {
      return 'No benchmark data';
    }
    if (comparison.difference === null) {
      return 'No variance';
    }
    if (comparison.difference === 0) {
      return 'On par with UK average';
    }
    if (comparison.difference > 0) {
      return `£${Math.abs(comparison.difference).toFixed(0)} above UK average`;
    }
    return `£${Math.abs(comparison.difference).toFixed(0)} below UK average`;
  };

  const renderInsightsPanel = () => (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border border-purple-200 rounded-lg p-4 md:p-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            Smart Spending Insights
            {data && (
              <span className="text-xs font-normal text-gray-600">
                {data.monthName} • Family of {data.familySize}
              </span>
            )}
          </h3>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your spending patterns...
            </div>
          ) : insights ? (
            <>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                {renderFormattedLines(insights)}
              </div>

              {data && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 mb-1">Income</p>
                    <p className="font-bold text-green-700">£{data.totalIncome.toLocaleString()}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 mb-1">Expenses</p>
                    <p className="font-bold text-red-700">£{data.totalExpenses.toLocaleString()}</p>
                  </div>
                  <div className="bg-white bg-opacity-60 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 mb-1">Net</p>
                    <p className={`font-bold ${data.totalIncome - data.totalExpenses >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      £{(data.totalIncome - data.totalExpenses).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">No insights available yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderBenchmarkPanel = () => (
    <div className="bg-white border border-blue-200 rounded-lg p-4 md:p-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
          <Scale className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">How you compare to UK averages</h3>
              {benchmarkMetadata && (
                <p className="text-xs text-gray-500 mt-1">
                  Based on the latest {benchmarkMetadata.monthsAnalyzed}-month spending • Family of {benchmarkMetadata.familySize}
                </p>
              )}
            </div>
            <button
              onClick={() => fetchBenchmark()}
              disabled={isBenchmarkLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BarChart3 className="w-3 h-3" />
              Refresh comparison
            </button>
          </div>

          {isBenchmarkLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Comparing your spending to UK households...
            </div>
          ) : benchmarkError ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">
              {benchmarkError}
            </div>
          ) : benchmarkResult ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                {renderFormattedLines(benchmarkResult.analysis)}
              </div>

              <div className="grid gap-3">
                {benchmarkResult.comparisons.length > 0 ? (
                  benchmarkResult.comparisons.map((comparison) => (
                    <div
                      key={comparison.category}
                      className="rounded-lg border border-gray-200 p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{comparison.category}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Your spend: {formatCurrency(comparison.actual)}
                            {comparison.benchmark !== null && (
                              <>
                                {' '}• UK average: {formatCurrency(comparison.benchmark)}
                              </>
                            )}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getComparisonStatusStyles(comparison.status)}`}>
                          {getComparisonStatusLabel(comparison)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">
                    We could not match your categories to UK benchmarks yet. Add more classified expenses to unlock this view.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No benchmark data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  const fetchBenchmark = async () => {
    if (!familyId) return;

    setIsBenchmarkLoading(true);
    setBenchmarkError(null);

    try {
      const response = await fetch('/api/ai/budget/benchmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
          months: 3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch benchmark insights');
      }

      const result = await response.json();
      setBenchmarkResult({
        analysis: result.analysis,
        comparisons: Array.isArray(result.comparisons) ? result.comparisons : [],
      });
      setBenchmarkMetadata(result.metadata);
    } catch (err) {
      console.error('Error fetching benchmark insights:', err);
      setBenchmarkError(err instanceof Error ? err.message : 'Failed to load benchmark insights');
    } finally {
      setIsBenchmarkLoading(false);
    }
  };

  const fetchInsights = async () => {
    if (!familyId) return;

    setActiveTab('insights');
    setIsLoading(true);
    setError(null);
    setBenchmarkError(null);
    setBenchmarkResult(null);
    setBenchmarkMetadata(null);

    try {
      const response = await fetch('/api/ai/budget/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
          month,
          year,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch insights');
      }

      const result = await response.json();
      setInsights(result.insights);
      setRecommendations(result.recommendations);
      setData(result.data);

      await fetchBenchmark();
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't auto-fetch - user clicks button to get insights
  // useEffect removed - insights are opt-in

  // Show initial state - no insights yet
  if (!insights && !isLoading && !error) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border border-purple-200 rounded-lg p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">Smart Spending Insights</h3>
            <p className="text-sm text-gray-700 mb-4">
              Get personalized insights about your spending patterns, compare to UK averages, and receive tailored recommendations.
            </p>
            <button
              onClick={fetchInsights}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Get Insights
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Insights Unavailable</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchInsights}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasBenchmarkContent = Boolean(
    benchmarkResult || benchmarkError || isBenchmarkLoading
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex rounded-lg border border-purple-200 overflow-hidden bg-white">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'insights'
                ? 'bg-purple-600 text-white'
                : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            Spending insights
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            disabled={!hasBenchmarkContent}
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-purple-200 ${
              activeTab === 'benchmark'
                ? 'bg-purple-600 text-white'
                : 'text-purple-700 hover:bg-purple-50'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            UK benchmarks
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Refresh insights
          </button>
          {hasBenchmarkContent && (
            <button
              onClick={() => {
                setActiveTab('benchmark');
                fetchBenchmark();
              }}
              disabled={isBenchmarkLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BarChart3 className="w-4 h-4" />
              Refresh benchmarks
            </button>
          )}
        </div>
      </div>

      {activeTab === 'insights' ? renderInsightsPanel() : renderBenchmarkPanel()}

      {activeTab === 'insights' && !isLoading && recommendations && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 md:p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">
                Budget Recommendations
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                {renderFormattedLines(recommendations)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
