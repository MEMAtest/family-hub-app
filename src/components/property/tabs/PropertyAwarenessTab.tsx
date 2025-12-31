'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Home,
  MapPin,
  Newspaper,
  RefreshCw,
  AlertTriangle,
  Building2,
  ExternalLink,
  Calendar,
  PoundSterling,
  BarChart3,
  Info,
  Trash2,
  Recycle,
  Leaf,
} from 'lucide-react';
import { PropertyValueEntry } from '@/types/property.types';
import { useFamilyStore } from '@/store/familyStore';
import { tremaineRoadBaseline, tremaineRoadValues } from '@/data/property/tremaineRoad';

interface AreaSaleRecord {
  address: string;
  price: number;
  date: string;
  propertyType: string;
  newBuild: boolean;
}

interface AreaStatistics {
  averagePrice: number;
  medianPrice: number;
  transactions: number;
  priceRange: { min: number; max: number };
  period: { from: string; to: string };
}

interface ValuationData {
  areaStatistics: AreaStatistics | null;
  estimatedValue: number | null;
  comparableSales: AreaSaleRecord[];
  disclaimer: string;
}

interface CouncilNewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: 'planning' | 'roadworks' | 'events' | 'services' | 'general';
  url?: string;
  priority: 'low' | 'medium' | 'high';
  source?: string;
}

interface BinCollection {
  type: 'refuse' | 'recycling' | 'food' | 'garden';
  label: string;
  nextCollection: string;
  frequency: string;
  binColor: string;
  icon: string;
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getPropertyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    D: 'Detached',
    S: 'Semi-detached',
    T: 'Terraced',
    F: 'Flat',
    O: 'Other',
  };
  return labels[type] || type;
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'planning':
      return Building2;
    case 'roadworks':
      return AlertTriangle;
    case 'events':
      return Calendar;
    default:
      return Newspaper;
  }
};

// Mock council news - in production would come from Bromley Council API
const mockCouncilNews: CouncilNewsItem[] = [
  {
    id: 'news-1',
    title: 'Planning Application: Rear Extension at 45 Tremaine Road',
    summary: 'Application for single-storey rear extension submitted. Public consultation open until 15 January 2025.',
    date: '2024-12-20',
    category: 'planning',
    url: 'https://pa.bromley.gov.uk',
    priority: 'medium',
  },
  {
    id: 'news-2',
    title: 'Road Resurfacing: Tremaine Road & Surrounding Streets',
    summary: 'Scheduled roadworks from 6-10 January 2025. Expect delays and limited parking during work hours.',
    date: '2024-12-18',
    category: 'roadworks',
    priority: 'high',
  },
  {
    id: 'news-3',
    title: 'Council Tax 2025/26 Consultation',
    summary: 'Bromley Council seeking views on proposed council tax rates for the upcoming financial year.',
    date: '2024-12-15',
    category: 'services',
    url: 'https://www.bromley.gov.uk/consultations',
    priority: 'low',
  },
  {
    id: 'news-4',
    title: 'New Recycling Collection Schedule for SE20',
    summary: 'Changes to recycling collection days starting February 2025. Check your new collection day online.',
    date: '2024-12-10',
    category: 'services',
    url: 'https://www.bromley.gov.uk/waste',
    priority: 'medium',
  },
];

const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: typeof TrendingUp;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{value}</p>
        {subtext && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{subtext}</p>}
      </div>
      <div
        className={`rounded-full p-2 ${
          trend === 'up'
            ? 'bg-green-50 text-green-600 dark:bg-green-500/20 dark:text-green-400'
            : trend === 'down'
            ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400'
            : 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export const PropertyAwarenessTab = () => {
  const propertyValues = useFamilyStore((state) => state.propertyValues);
  const addPropertyValue = useFamilyStore((state) => state.addPropertyValue);

  const [valuationData, setValuationData] = useState<ValuationData | null>(null);
  const [councilNews, setCouncilNews] = useState<CouncilNewsItem[]>([]);
  const [binCollections, setBinCollections] = useState<BinCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isLoadingBins, setIsLoadingBins] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use static values if store is empty
  const displayValues = propertyValues.length > 0 ? propertyValues : tremaineRoadValues;
  const purchasePrice = tremaineRoadBaseline.purchasePrice || 750000;
  const purchaseDate = tremaineRoadBaseline.purchaseDate || '2024-03-01';
  const postcode = 'SE20 7UA';

  // Calculate value change
  const latestValue = valuationData?.estimatedValue || displayValues[displayValues.length - 1]?.value || purchasePrice;
  const valueChange = latestValue - purchasePrice;
  const valueChangePercent = ((valueChange / purchasePrice) * 100).toFixed(1);

  const fetchValuation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        postcode,
        purchasePrice: purchasePrice.toString(),
        purchaseDate,
        propertyType: 'T', // Terraced
      });

      const response = await fetch(`/api/property/valuation?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch valuation data');
      }

      const data = await response.json();
      setValuationData(data);
      setLastUpdated(new Date());

      // Add new valuation to store if we got area stats
      if (data.valueEntry) {
        addPropertyValue(data.valueEntry);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [postcode, purchasePrice, purchaseDate, addPropertyValue]);

  const fetchCouncilNews = useCallback(async () => {
    setIsLoadingNews(true);

    try {
      const response = await fetch(`/api/property/council-news?postcode=${encodeURIComponent(postcode)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch council news');
      }

      const data = await response.json();
      setCouncilNews(data.news || []);
    } catch (err) {
      console.error('Council news fetch error:', err);
      // Don't show error for news - just use empty array
    } finally {
      setIsLoadingNews(false);
    }
  }, [postcode]);

  const fetchBinCollections = useCallback(async () => {
    setIsLoadingBins(true);

    try {
      const response = await fetch(`/api/property/bin-collection?postcode=${encodeURIComponent(postcode)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bin collection data');
      }

      const data = await response.json();
      setBinCollections(data.collections || []);
    } catch (err) {
      console.error('Bin collection fetch error:', err);
    } finally {
      setIsLoadingBins(false);
    }
  }, [postcode]);

  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchValuation(), fetchCouncilNews(), fetchBinCollections()]);
  }, [fetchValuation, fetchCouncilNews, fetchBinCollections]);

  // Auto-fetch data on mount
  useEffect(() => {
    if (councilNews.length === 0 && !isLoadingNews) {
      fetchCouncilNews();
    }
    if (binCollections.length === 0 && !isLoadingBins) {
      fetchBinCollections();
    }
  }, [councilNews.length, isLoadingNews, fetchCouncilNews, binCollections.length, isLoadingBins, fetchBinCollections]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Tremaine Road Awareness
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            House prices, area insights, and local council updates for SE20
          </p>
        </div>
        <button
          onClick={fetchAllData}
          disabled={isLoading || isLoadingNews || isLoadingBins}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading || isLoadingNews || isLoadingBins ? 'animate-spin' : ''}`} />
          {isLoading || isLoadingNews || isLoadingBins ? 'Fetching...' : 'Refresh Data'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}

      {/* Property Value Summary */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-blue-600 p-2 text-white">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">
              21 Tremaine Road, London SE20 7UA
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Victorian Terraced House
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Purchase Price"
            value={formatCurrency(purchasePrice)}
            subtext={`Purchased ${formatDate(purchaseDate)}`}
            icon={PoundSterling}
          />
          <StatCard
            label="Estimated Value"
            value={formatCurrency(latestValue)}
            subtext={valuationData ? 'Based on area sales' : 'Based on growth estimate'}
            icon={TrendingUp}
            trend={valueChange > 0 ? 'up' : valueChange < 0 ? 'down' : 'neutral'}
          />
          <StatCard
            label="Value Change"
            value={`${valueChange >= 0 ? '+' : ''}${formatCurrency(valueChange)}`}
            subtext={`${valueChange >= 0 ? '+' : ''}${valueChangePercent}% since purchase`}
            icon={valueChange >= 0 ? TrendingUp : TrendingDown}
            trend={valueChange > 0 ? 'up' : valueChange < 0 ? 'down' : 'neutral'}
          />
          <StatCard
            label="Area Median"
            value={
              valuationData?.areaStatistics
                ? formatCurrency(valuationData.areaStatistics.medianPrice)
                : '—'
            }
            subtext={
              valuationData?.areaStatistics
                ? `${valuationData.areaStatistics.transactions} sales in area`
                : 'Click Refresh to load'
            }
            icon={BarChart3}
          />
        </div>
      </div>

      {/* Bin Collection Days */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-green-600" />
            Bin Collection Days
          </h3>
          <a
            href="https://www.bromley.gov.uk/collection-calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Full Calendar <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {isLoadingBins ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-green-600" />
            <span className="ml-2 text-sm text-gray-500">Loading bin days...</span>
          </div>
        ) : binCollections.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {binCollections.map((bin) => {
              const getBinIcon = () => {
                switch (bin.type) {
                  case 'recycling': return <Recycle className="h-5 w-5" />;
                  case 'garden': return <Leaf className="h-5 w-5" />;
                  default: return <Trash2 className="h-5 w-5" />;
                }
              };
              const getBinColorClass = () => {
                switch (bin.binColor) {
                  case 'green': return 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300';
                  case 'brown': return 'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300';
                  case 'blue': return 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300';
                  default: return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
                }
              };
              const isToday = bin.nextCollection === 'Today';
              const isTomorrow = bin.nextCollection === 'Tomorrow';

              return (
                <div
                  key={bin.type}
                  className={`rounded-lg border p-4 ${
                    isToday
                      ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                      : isTomorrow
                      ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`rounded-full p-2 ${getBinColorClass()}`}>
                      {getBinIcon()}
                    </div>
                    <span className="text-lg">{bin.icon}</span>
                  </div>
                  <h4 className="font-medium text-sm text-gray-900 dark:text-slate-100">
                    {bin.label}
                  </h4>
                  <p className={`text-lg font-bold mt-1 ${
                    isToday
                      ? 'text-red-600 dark:text-red-400'
                      : isTomorrow
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-900 dark:text-slate-100'
                  }`}>
                    {bin.nextCollection}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {bin.frequency}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
            Click Refresh Data to load bin collection days
          </p>
        )}

        <p className="mt-4 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Based on typical Bromley Council collection patterns. Verify at bromley.gov.uk for exact dates.
        </p>
      </div>

      {/* Area Statistics */}
      {valuationData?.areaStatistics && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            SE20 Area Statistics
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {formatCurrency(valuationData.areaStatistics.averagePrice)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Average Price</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {formatCurrency(valuationData.areaStatistics.medianPrice)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Median Price</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {formatCurrency(valuationData.areaStatistics.priceRange.min)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Lowest Sale</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {formatCurrency(valuationData.areaStatistics.priceRange.max)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Highest Sale</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-slate-400 text-center">
            Based on {valuationData.areaStatistics.transactions} transactions from{' '}
            {formatDate(valuationData.areaStatistics.period.from)} to{' '}
            {formatDate(valuationData.areaStatistics.period.to)}
          </p>
        </div>
      )}

      {/* Comparable Sales */}
      {valuationData?.comparableSales && valuationData.comparableSales.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            Recent Sales Nearby
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Address
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {valuationData.comparableSales.slice(0, 10).map((sale, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-slate-100">
                      {sale.address}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-slate-100">
                      {formatCurrency(sale.price)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">
                      {formatDate(sale.date)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">
                      {getPropertyTypeLabel(sale.propertyType)}
                      {sale.newBuild && (
                        <span className="ml-1 text-xs text-blue-600">(New)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bromley Council News */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-blue-600" />
            Local Council Updates
          </h3>
          <a
            href="https://www.bromley.gov.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Bromley Council <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="space-y-3">
          {isLoadingNews && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">Loading council updates...</span>
            </div>
          )}
          {!isLoadingNews && (councilNews.length > 0 ? councilNews : mockCouncilNews).map((item) => {
            const CategoryIcon = getCategoryIcon(item.category);
            return (
              <div
                key={item.id}
                className={`rounded-lg border p-4 ${
                  item.priority === 'high'
                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      item.priority === 'high'
                        ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                    }`}
                  >
                    <CategoryIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-slate-100">
                        {item.title}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(item.date)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                      {item.summary}
                    </p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        View details <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
          <Info className="h-3 w-3" />
          {councilNews.length > 0
            ? 'Live council updates from Bromley Council and local sources.'
            : 'Showing sample updates. Click Refresh Data for live council news.'}
        </p>
      </div>

      {/* Disclaimer */}
      {valuationData?.disclaimer && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {valuationData.disclaimer}
          </p>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
          Data last refreshed: {lastUpdated.toLocaleString('en-GB')}
        </p>
      )}
    </div>
  );
};
