'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Dialog } from '@headlessui/react';
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
  X,
  Trash2,
  Recycle,
  Leaf,
  Landmark,
  ClipboardCheck,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { tremaineRoadValues } from '@/data/property/tremaineRoad';

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
  scope?: 'property_type' | 'all';
}

interface ValuationData {
  areaStatistics: AreaStatistics | null;
  estimatedValue: number | null;
  estimateBreakdown?: {
    estimatedValue: number | null;
    medianEstimate: number | null;
    growthEstimate: number | null;
    blendedEstimate: number | null;
    areaMedian: number | null;
    modelEstimate: number | null;
    sources: Array<{ id: string; label: string; value: number }>;
    model?: {
      estimate: number | null;
      inputs?: {
        postcode: string;
        outcode: string;
        distanceKm: number;
        hpiIndex: number;
        hpiDate: string | null;
        planningCount12m: number;
        propertyType: string;
        tenure: string;
        newBuild: boolean;
        saleYear: number;
      };
      warnings?: string[];
      meta?: {
        generatedAt: string;
        metrics?: {
          train: { mae: number; rmse: number; mape: number; r2: number };
          test: { mae: number; rmse: number; mape: number; r2: number };
        };
        coverage?: {
          transactions: number;
          minDate: string | null;
          maxDate: string | null;
          radiusKm: number | null;
        };
      };
    };
  };
  comparableSales: AreaSaleRecord[];
  disclaimer: string;
  comparableScope?: 'area' | 'street' | 'nearby' | 'streets';
  streetsUsed?: string[];
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

interface InsightLink {
  label: string;
  url: string;
}

interface PropertyInsight {
  id: string;
  label: string;
  value: string | null;
  status: 'available' | 'external' | 'unknown';
  summary: string;
  links: InsightLink[];
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const ANNUAL_GROWTH_RATE = 0.04;
const COMPARABLE_MONTHS_DISPLAY = 24;

const POSTCODE_REGEX = /[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i;

const extractPostcode = (address?: string): string | null => {
  if (!address) return null;
  const match = address.match(POSTCODE_REGEX);
  return match ? match[0].toUpperCase().replace(/\s+/g, ' ').trim() : null;
};

const formatPostcode = (postcode: string): string => {
  const normalized = postcode.toUpperCase().replace(/\s+/g, '');
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, -3)} ${normalized.slice(-3)}`;
};

const getPostcodeArea = (postcode?: string | null): string | null => {
  if (!postcode) return null;
  const normalized = postcode.replace(/\s+/g, '');
  return normalized.length > 3 ? normalized.slice(0, -3) : normalized;
};

const extractStreetFromAddress = (address?: string): string | null => {
  if (!address) return null;
  const line1 = address.split(',')[0]?.trim() || '';
  const street = line1.replace(/^[0-9A-Z-]+\s+/i, '').trim();
  return street || null;
};

const formatStreetList = (streets?: string[]) => {
  if (!streets || streets.length === 0) return '';
  return streets.join(', ');
};

const insightIconMap: Record<string, typeof Home> = {
  'council-tax': Landmark,
  'planning-history': ClipboardCheck,
  schools: GraduationCap,
  'insurance-risk': ShieldAlert,
};

const getInsightIcon = (id: string) => insightIconMap[id] || Info;

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const formatCurrency = (value: number | null | undefined) => {
  if (!isFiniteNumber(value)) {
    return '—';
  }
  return currencyFormatter.format(value);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const calculateGrowthEstimate = (purchasePrice: number, purchaseDate: string): number | null => {
  const purchaseDateObj = new Date(purchaseDate);
  if (Number.isNaN(purchaseDateObj.getTime())) {
    return null;
  }
  const now = new Date();
  const monthsHeld = Math.round(
    (now.getTime() - purchaseDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const baseEstimate = purchasePrice * (1 + (ANNUAL_GROWTH_RATE * (monthsHeld / 12)));
  return Math.round(baseEstimate);
};

const calculateMedianValue = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(median);
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

const getComparableScopeLabel = (scope?: ValuationData['comparableScope']) => {
  switch (scope) {
    case 'street':
      return 'Street only';
    case 'streets':
      return 'Street + nearby streets';
    case 'nearby':
      return 'Nearby streets';
    default:
      return 'Area-wide';
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
  labelAction,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: typeof TrendingUp;
  trend?: 'up' | 'down' | 'neutral';
  labelAction?: ReactNode;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {label}
          </p>
          {labelAction}
        </div>
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

const statusStyles: Record<PropertyInsight['status'], string> = {
  available: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  external: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  unknown: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300',
};

const InsightCard = ({
  label,
  value,
  summary,
  status,
  links,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  summary: string;
  status: PropertyInsight['status'];
  links: InsightLink[];
  icon: typeof Home;
}) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
          {value || 'Check online'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{summary}</p>
      </div>
      <div className={`rounded-full p-2 ${statusStyles[status]}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
    {links.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            {link.label} <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    )}
  </div>
);

export const PropertyAwarenessTab = () => {
  const propertyProfile = useFamilyStore((state) => state.propertyProfile);
  const propertyValues = useFamilyStore((state) => state.propertyValues);
  const addPropertyValue = useFamilyStore((state) => state.addPropertyValue);

  const [valuationData, setValuationData] = useState<ValuationData | null>(null);
  const [councilNews, setCouncilNews] = useState<CouncilNewsItem[]>([]);
  const [binCollections, setBinCollections] = useState<BinCollection[]>([]);
  const [insights, setInsights] = useState<PropertyInsight[]>([]);
  const [binCollectionMeta, setBinCollectionMeta] = useState<{
    council: string;
    lookupUrl: string;
    postcode: string;
    address?: string;
    resolvedAddress?: string;
    scheduleUrl?: string;
    source?: 'bromley-ics' | 'bromley' | 'fallback';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isLoadingBins, setIsLoadingBins] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastLookupKey, setLastLookupKey] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use static values if store is empty
  const displayValues = propertyValues.length > 0 ? propertyValues : tremaineRoadValues;
  const address = propertyProfile.address?.trim() || '';
  const postcode = address ? extractPostcode(address) : null;
  const formattedPostcode = postcode ? formatPostcode(postcode) : '';
  const postcodeArea = getPostcodeArea(formattedPostcode);
  const propertyType = propertyProfile.propertyType || 'T';
  const nearbyStreets = propertyProfile.nearbyStreets || [];
  const street = extractStreetFromAddress(address);
  const purchasePrice = propertyProfile.purchasePrice ?? null;
  const purchaseDate = propertyProfile.purchaseDate ?? null;
  const lookupKey = `${formattedPostcode || 'no-postcode'}::${address || 'no-address'}::${propertyType}::${nearbyStreets.join('|')}`;
  const propertyTypeLabel = getPropertyTypeLabel(propertyType);
  const hasPurchaseData = isFiniteNumber(purchasePrice) && Boolean(purchaseDate);
  const estimateBreakdown = valuationData?.estimateBreakdown;
  const modelEstimate = estimateBreakdown?.modelEstimate ?? null;
  const areaMedian = estimateBreakdown?.areaMedian ?? valuationData?.areaStatistics?.medianPrice ?? null;
  const growthEstimate = estimateBreakdown?.growthEstimate ?? (hasPurchaseData
    ? calculateGrowthEstimate(purchasePrice, purchaseDate as string)
    : null);
  const blendedEstimate = estimateBreakdown?.blendedEstimate ??
    (isFiniteNumber(growthEstimate) && isFiniteNumber(areaMedian)
      ? Math.round(growthEstimate * 0.7 + areaMedian * 0.3)
      : growthEstimate);
  const estimateSources = estimateBreakdown?.sources?.length
    ? estimateBreakdown.sources
    : [
        ...(isFiniteNumber(modelEstimate) ? [{ id: 'model', label: 'Local price model', value: modelEstimate }] : []),
        ...(isFiniteNumber(areaMedian) ? [{ id: 'area-median', label: 'Area median', value: areaMedian }] : []),
        ...(isFiniteNumber(growthEstimate) ? [{ id: 'growth', label: 'Purchase growth', value: growthEstimate }] : []),
      ];
  const estimateMedian = estimateBreakdown?.medianEstimate ??
    calculateMedianValue(estimateSources.map((source) => source.value));
  const estimatedValue = valuationData?.estimatedValue ?? estimateMedian ?? blendedEstimate;
  const estimateSubtext = estimateSources.length >= 2
    ? 'Median of available sources'
    : isFiniteNumber(modelEstimate)
    ? 'Local model estimate'
    : areaMedian
    ? 'Area median for this postcode'
    : 'Growth estimate from purchase price';

  // Calculate value change
  const latestValue =
    estimatedValue ??
    areaMedian ??
    displayValues[displayValues.length - 1]?.value ??
    purchasePrice;
  const valueChange =
    isFiniteNumber(latestValue) && isFiniteNumber(purchasePrice)
      ? latestValue - purchasePrice
      : null;
  const valueChangePercent =
    isFiniteNumber(valueChange) && isFiniteNumber(purchasePrice) && purchasePrice > 0
      ? ((valueChange / purchasePrice) * 100).toFixed(1)
      : null;
  const valueTrend = isFiniteNumber(valueChange)
    ? valueChange > 0
      ? 'up'
      : valueChange < 0
      ? 'down'
      : 'neutral'
    : 'neutral';

  const markUpdated = useCallback(() => {
    setLastUpdated(new Date());
    setJustUpdated(true);
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      setJustUpdated(false);
    }, 4000);
  }, []);

  const fetchValuation = useCallback(async () => {
    if (!formattedPostcode) {
      setError('Add a valid UK postcode to the property address to fetch valuation data.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ postcode: formattedPostcode });
      if (isFiniteNumber(purchasePrice) && purchasePrice > 0) {
        params.set('purchasePrice', purchasePrice.toString());
      }
      if (purchaseDate) {
        params.set('purchaseDate', purchaseDate);
      }
      params.set('propertyType', propertyType);
      if (address) {
        params.set('address', address);
      }
      if (street) {
        params.set('street', street);
      }
      nearbyStreets.forEach((value) => params.append('nearbyStreets', value));

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
  }, [formattedPostcode, purchasePrice, purchaseDate, propertyType, address, street, nearbyStreets, addPropertyValue]);

  const fetchCouncilNews = useCallback(async () => {
    if (!formattedPostcode) {
      return;
    }

    setIsLoadingNews(true);

    try {
      const response = await fetch(`/api/property/council-news?postcode=${encodeURIComponent(formattedPostcode)}`);

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
  }, [formattedPostcode]);

  const fetchBinCollections = useCallback(async () => {
    if (!formattedPostcode) {
      return;
    }

    setIsLoadingBins(true);

    try {
      const params = new URLSearchParams({ postcode: formattedPostcode });
      if (address) {
        params.set('address', address);
      }
      const response = await fetch(`/api/property/bin-collection?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bin collection data');
      }

      const data = await response.json();
      setBinCollections(data.collections || []);
      setBinCollectionMeta({
        council: data.council || 'Unknown Council',
        lookupUrl: data.lookupUrl || 'https://www.gov.uk/bin-collection-find-your-council',
        postcode: data.postcode || formattedPostcode,
        address: data.address,
        resolvedAddress: data.resolvedAddress,
        scheduleUrl: data.scheduleUrl,
        source: data.source,
      });
    } catch (err) {
      console.error('Bin collection fetch error:', err);
    } finally {
      setIsLoadingBins(false);
    }
  }, [formattedPostcode, address]);

  const fetchInsights = useCallback(async () => {
    if (!formattedPostcode) {
      return;
    }

    setIsLoadingInsights(true);

    try {
      const params = new URLSearchParams({ postcode: formattedPostcode });
      if (address) {
        params.set('address', address);
      }
      const response = await fetch(`/api/property/insights?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch property insights');
      }

      const data = await response.json();
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Property insights fetch error:', err);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [formattedPostcode, address]);

  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchValuation(), fetchCouncilNews(), fetchBinCollections(), fetchInsights()]);
    markUpdated();
  }, [fetchValuation, fetchCouncilNews, fetchBinCollections, fetchInsights, markUpdated]);

  // Auto-fetch data on mount
  useEffect(() => {
    if (!formattedPostcode) {
      return;
    }

    if (lastLookupKey !== lookupKey && !isLoading && !isLoadingNews && !isLoadingBins && !isLoadingInsights) {
      setLastLookupKey(lookupKey);
      fetchAllData();
    }
  }, [
    formattedPostcode,
    lookupKey,
    lastLookupKey,
    isLoading,
    isLoadingNews,
    isLoadingBins,
    isLoadingInsights,
    fetchAllData,
  ]);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {propertyProfile.propertyName || 'Property Awareness'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            House prices, area insights, and local council updates for {postcodeArea || 'your area'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            onClick={fetchAllData}
            disabled={isLoading || isLoadingNews || isLoadingBins || isLoadingInsights}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isLoadingNews || isLoadingBins || isLoadingInsights ? 'animate-spin' : ''}`} />
            {isLoading || isLoadingNews || isLoadingBins || isLoadingInsights ? 'Fetching...' : 'Refresh Data'}
          </button>
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <span className={`h-2 w-2 rounded-full ${justUpdated ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'}`} />
              {justUpdated ? 'Updated just now' : `Updated ${lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
            </div>
          )}
        </div>
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
              {address || 'Add your property address'}
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
            subtext={purchaseDate ? `Purchased ${formatDate(purchaseDate)}` : 'Add purchase date for estimates'}
            icon={PoundSterling}
          />
          <StatCard
            label="Estimated Value"
            value={isFiniteNumber(estimatedValue) ? formatCurrency(estimatedValue) : '—'}
            subtext={estimateSubtext}
            icon={TrendingUp}
            trend={valueTrend}
            labelAction={
              <div className="flex items-center gap-1">
                {justUpdated && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    Updated
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsAnalysisOpen(true)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  title="View valuation analysis"
                  aria-label="View valuation analysis"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
            }
          />
          <StatCard
            label="Value Change"
            value={
              isFiniteNumber(valueChange)
                ? `${valueChange >= 0 ? '+' : ''}${formatCurrency(valueChange)}`
                : '—'
            }
            subtext={
              valueChangePercent && valueChange !== null
                ? `${valueChange >= 0 ? '+' : ''}${valueChangePercent}% since purchase`
                : 'Add purchase price to compare'
            }
            icon={isFiniteNumber(valueChange) && valueChange < 0 ? TrendingDown : TrendingUp}
            trend={valueTrend}
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
                ? `${valuationData.areaStatistics.transactions} sales (${valuationData.areaStatistics.scope === 'all' ? 'all property types' : propertyTypeLabel})`
                : 'Click Refresh to load'
            }
            icon={BarChart3}
          />
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
          Estimated value uses the median of available sources (local model, purchase growth, and Land Registry area median).
          If no matching property-type sales exist, the median falls back to all property types.
        </p>
      </div>

      {/* Property Intelligence */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Property Intelligence
          </h3>
          {isLoadingInsights && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading insights...
            </div>
          )}
        </div>
        {insights.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight) => {
              const InsightIcon = getInsightIcon(insight.id);
              return (
                <InsightCard
                  key={insight.id}
                  label={insight.label}
                  value={insight.value}
                  summary={insight.summary}
                  status={insight.status}
                  links={insight.links}
                  icon={InsightIcon}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
            Click Refresh Data to load property insights
          </p>
        )}
      </div>

      {/* Bin Collection Days */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-green-600" />
            Bin Collection Days
          </h3>
          <a
            href={binCollectionMeta?.lookupUrl || 'https://www.gov.uk/bin-collection-find-your-council'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {binCollectionMeta?.council ? `${binCollectionMeta.council} waste services` : 'Waste services'}{' '}
            <ExternalLink className="h-3 w-3" />
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
                  key={`${bin.type}-${bin.label}`}
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
          {binCollectionMeta?.source === 'bromley'
            ? `Pulled from Bromley waste services for ${binCollectionMeta.resolvedAddress || binCollectionMeta.address || formattedPostcode}.`
            : binCollectionMeta?.council
            ? `Based on typical ${binCollectionMeta.council} collection patterns.`
            : 'Based on typical council collection patterns.'}{' '}
          Verify at your council site for exact dates.
        </p>
      </div>

      {/* Area Statistics */}
      {valuationData?.areaStatistics && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {postcodeArea || 'Area'} Statistics
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
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
            {valuationData.streetsUsed && valuationData.streetsUsed.length > 0
              ? `Showing sales on ${formatStreetList(valuationData.streetsUsed)}.`
              : `Showing ${postcodeArea || 'area'} sales.`}
          </p>
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

      <Dialog open={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Estimated value analysis
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setIsAnalysisOpen(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close analysis"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Current estimate
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">
                  {isFiniteNumber(estimatedValue) ? formatCurrency(estimatedValue) : '—'}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Source: HM Land Registry Price Paid Data + internal growth model.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Inputs
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Purchase price</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {formatCurrency(purchasePrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Purchase date</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {purchaseDate ? formatDate(purchaseDate) : 'Missing'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Annual growth</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {(ANNUAL_GROWTH_RATE * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Area median</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {isFiniteNumber(areaMedian) ? formatCurrency(areaMedian) : '—'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {valuationData?.areaStatistics
                        ? `Scope: ${valuationData.areaStatistics.scope === 'all' ? 'all property types' : propertyTypeLabel}.`
                        : 'Area median unavailable for this property type.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Calculations
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Growth estimate</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {isFiniteNumber(growthEstimate) ? formatCurrency(growthEstimate) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Blended estimate</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {isFiniteNumber(blendedEstimate) ? formatCurrency(blendedEstimate) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Median (available sources)</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {isFiniteNumber(estimateMedian) ? formatCurrency(estimateMedian) : '—'}
                      </span>
                    </div>
                    {!hasPurchaseData && (
                      <p className="text-xs text-amber-600 dark:text-amber-300">
                        Add purchase price + date to unlock estimates.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Comparable sales
                </p>
                <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Scope</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {getComparableScopeLabel(valuationData?.comparableScope)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Records used</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {valuationData?.comparableSales?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Streets</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {valuationData?.streetsUsed && valuationData.streetsUsed.length > 0
                        ? formatStreetList(valuationData.streetsUsed)
                        : 'Postcode area'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Recent sales from the last {COMPARABLE_MONTHS_DISPLAY} months when available.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  External sources
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                  Zoopla and Rightmove estimates require licensed API access. Share API keys or a data provider and we can include them in the median.
                </p>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};
