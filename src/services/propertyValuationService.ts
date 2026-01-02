/**
 * Property Valuation Service
 *
 * Integrates with HM Land Registry Price Paid Data API to fetch
 * comparable property sales and estimate valuations.
 *
 * API Documentation: https://landregistry.data.gov.uk/app/root/doc/ppd
 * Data is FREE under Open Government Licence (OGL)
 */

import { PropertyValueEntry } from '@/types/property.types';

// Land Registry JSON-LD API endpoint
const LAND_REGISTRY_API = 'https://landregistry.data.gov.uk/data/ppi/transaction-record.json';
const LAND_REGISTRY_PAGE_SIZE = 200;
const COMPARABLE_MONTHS = 24;

interface PricePaidRecord {
  transactionId: string;
  price: number;
  date: string;
  postcode: string;
  propertyType: 'D' | 'S' | 'T' | 'F' | 'O';
  newBuild: boolean;
  tenure: 'F' | 'L';
  paon: string;
  saon?: string;
  street: string;
  locality?: string;
  town: string;
  district: string;
  county: string;
}

interface AreaValuationResult {
  averagePrice: number;
  medianPrice: number;
  transactions: number;
  priceRange: { min: number; max: number };
  period: { from: string; to: string };
  comparables: PricePaidRecord[];
}

type ComparableScope = 'area' | 'street' | 'nearby' | 'streets';

// Postcode to district mapping for Land Registry lookups
const POSTCODE_DISTRICTS: Record<string, string> = {
  'SE20': 'BROMLEY',
  'SE6': 'LEWISHAM',
  'SE9': 'GREENWICH',
  'SE12': 'LEWISHAM',
  'SE26': 'LEWISHAM',
  'BR1': 'BROMLEY',
  'BR2': 'BROMLEY',
  'BR3': 'BROMLEY',
  'BR4': 'BROMLEY',
  'BR5': 'BROMLEY',
  'BR6': 'BROMLEY',
  'BR7': 'BROMLEY',
};

/**
 * Parse postcode to get the outward code (area)
 */
function getPostcodeArea(postcode: string): string {
  const normalized = postcode.toUpperCase().replace(/\s+/g, '');
  return normalized.slice(0, -3).trim();
}

/**
 * Get district for a postcode
 */
function getDistrictForPostcode(postcode: string): string {
  const area = getPostcodeArea(postcode);
  // Check exact match first
  if (POSTCODE_DISTRICTS[area]) {
    return POSTCODE_DISTRICTS[area];
  }
  // Try prefix match (e.g., SE2 matches SE20, SE26)
  for (const [prefix, district] of Object.entries(POSTCODE_DISTRICTS)) {
    if (area.startsWith(prefix.replace(/\d+$/, ''))) {
      return district;
    }
  }
  return 'LONDON'; // Default fallback
}

/**
 * Map Land Registry property type to code
 */
function mapPropertyType(type: { _about?: string; label?: Array<{ _value: string }> }): 'D' | 'S' | 'T' | 'F' | 'O' {
  const about = type?._about?.toLowerCase() || '';
  const label = type?.label?.[0]?._value?.toLowerCase() || '';

  if (about.includes('detached') || label.includes('detached')) return 'D';
  if (about.includes('semi') || label.includes('semi')) return 'S';
  if (about.includes('terraced') || label.includes('terraced') || label.includes('terrace')) return 'T';
  if (about.includes('flat') || label.includes('flat')) return 'F';
  return 'O';
}

const mapLandRegistryItem = (item: Record<string, unknown>): PricePaidRecord => {
  const addr = item.propertyAddress as Record<string, string>;
  const transaction = item.hasTransaction as string || '';
  const transactionDate = item.transactionDate as string;

  return {
    transactionId: transaction.split('/').pop() || '',
    price: item.pricePaid as number || 0,
    date: transactionDate || new Date().toISOString().split('T')[0],
    postcode: addr?.postcode || '',
    propertyType: mapPropertyType(item.propertyType as { _about?: string; label?: Array<{ _value: string }> }),
    newBuild: item.newBuild as boolean || false,
    tenure: (item.estateType as { _about?: string })?._about?.includes('leasehold') ? 'L' as const : 'F' as const,
    paon: addr?.paon || '',
    saon: addr?.saon,
    street: addr?.street || '',
    locality: addr?.locality,
    town: addr?.town || '',
    district: addr?.district || '',
    county: addr?.county || '',
  };
};

const fetchLandRegistryRecords = async (url: string): Promise<PricePaidRecord[]> => {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    console.error('Land Registry API error:', response.status, await response.text());
    return [];
  }

  const data = await response.json();
  const items = data?.result?.items || [];

  return items.map((item: Record<string, unknown>) => mapLandRegistryItem(item));
};

const filterByPostcodeArea = (records: PricePaidRecord[], postcodeArea: string) =>
  records.filter((record) => record.postcode.toUpperCase().startsWith(postcodeArea));

const normalizeStreetName = (value?: string): string =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseComparableDate = (value?: string): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const filterRecentSales = (sales: PricePaidRecord[], months: number): PricePaidRecord[] => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return sales.filter((sale) => {
    const timestamp = parseComparableDate(sale.date);
    return timestamp > 0 && timestamp >= cutoff.getTime();
  });
};

const selectComparableSales = (
  sales: PricePaidRecord[],
  street?: string,
  nearbyStreets?: string[]
): {
  comparables: PricePaidRecord[];
  scope: ComparableScope;
  streetsUsed: string[];
} => {
  const streetCandidates = [street, ...(nearbyStreets || [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (streetCandidates.length === 0) {
    return {
      comparables: sales,
      scope: 'area',
      streetsUsed: [],
    };
  }

  const normalizedLookup = new Map<string, string>();
  for (const candidate of streetCandidates) {
    const normalized = normalizeStreetName(candidate);
    if (normalized) {
      normalizedLookup.set(normalized, candidate);
    }
  }

  const filtered = sales.filter((sale) =>
    normalizedLookup.has(normalizeStreetName(sale.street))
  );

  if (filtered.length === 0) {
    return {
      comparables: sales,
      scope: 'area',
      streetsUsed: [],
    };
  }

  const streetsUsedSet = new Set<string>();
  for (const sale of filtered) {
    const normalized = normalizeStreetName(sale.street);
    const label = normalizedLookup.get(normalized);
    if (label) {
      streetsUsedSet.add(label);
    }
  }

  const streetsUsed = streetCandidates.filter((candidate) =>
    streetsUsedSet.has(candidate)
  );
  const normalizedMain = normalizeStreetName(street);
  const normalizedUsed = new Set(streetsUsed.map((value) => normalizeStreetName(value)));

  let scope: ComparableScope = 'nearby';
  if (normalizedMain && normalizedUsed.has(normalizedMain)) {
    scope = streetsUsed.length > 1 ? 'streets' : 'street';
  }

  return {
    comparables: filtered,
    scope,
    streetsUsed,
  };
};

const fetchStreetSales = async (
  postcode: string,
  streets: string[]
): Promise<PricePaidRecord[]> => {
  const postcodeArea = getPostcodeArea(postcode);
  const district = getDistrictForPostcode(postcode);
  const seen = new Set<string>();
  const results: PricePaidRecord[] = [];

  for (const street of streets) {
    const trimmed = street.trim();
    if (!trimmed) {
      continue;
    }

    const url = `${LAND_REGISTRY_API}?_pageSize=${LAND_REGISTRY_PAGE_SIZE}&propertyAddress.district=${encodeURIComponent(district)}&propertyAddress.street=${encodeURIComponent(trimmed)}&_sort=-transactionDate`;
    const records = await fetchLandRegistryRecords(url);
    const filtered = filterByPostcodeArea(records, postcodeArea);

    for (const record of filtered) {
      if (!seen.has(record.transactionId)) {
        results.push(record);
        seen.add(record.transactionId);
      }
    }
  }

  return results;
};

/**
 * Fetch recent property sales from Land Registry JSON API
 */
export async function fetchAreaSales(
  postcode: string,
  months: number = 24
): Promise<PricePaidRecord[]> {
  const postcodeArea = getPostcodeArea(postcode);
  const district = getDistrictForPostcode(postcode);

  try {
    // Fetch sales from the district
    const url = `${LAND_REGISTRY_API}?_pageSize=${LAND_REGISTRY_PAGE_SIZE}&propertyAddress.district=${encodeURIComponent(district)}&_sort=-transactionDate`;
    const records = await fetchLandRegistryRecords(url);
    const filtered = filterByPostcodeArea(records, postcodeArea);
    const recent = filterRecentSales(filtered, months);
    return recent.length > 0 ? recent : filtered;
  } catch (error) {
    console.error('Failed to fetch Land Registry data:', error);
    return [];
  }
}

/**
 * Get property type label
 */
export function getPropertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'D': 'Detached',
    'S': 'Semi-detached',
    'T': 'Terraced',
    'F': 'Flat/Maisonette',
    'O': 'Other',
  };
  return labels[type] || 'Unknown';
}

/**
 * Calculate area valuation statistics
 */
export function calculateAreaValuation(
  sales: PricePaidRecord[],
  propertyType?: string
): AreaValuationResult | null {
  const filtered = propertyType
    ? sales.filter(s => s.propertyType === propertyType)
    : sales;

  if (filtered.length === 0) {
    return null;
  }

  const prices = filtered.map(s => s.price).sort((a, b) => a - b);
  const sum = prices.reduce((acc, p) => acc + p, 0);

  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 !== 0
    ? prices[mid]
    : (prices[mid - 1] + prices[mid]) / 2;

  const dates = filtered.map(s => s.date).filter(Boolean).sort();

  return {
    averagePrice: Math.round(sum / prices.length),
    medianPrice: Math.round(median),
    transactions: filtered.length,
    priceRange: {
      min: prices[0],
      max: prices[prices.length - 1],
    },
    period: {
      from: dates[0] || new Date().toISOString().split('T')[0],
      to: dates[dates.length - 1] || new Date().toISOString().split('T')[0],
    },
    comparables: filtered.slice(0, 10),
  };
}

/**
 * Estimate current property value
 */
export function estimateCurrentValue(
  purchasePrice: number,
  purchaseDate: string,
  areaValuation: AreaValuationResult | null
): number {
  const purchaseDateObj = new Date(purchaseDate);
  const now = new Date();
  const monthsHeld = Math.round(
    (now.getTime() - purchaseDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // If we have area data, use it to adjust estimation
  if (areaValuation && areaValuation.medianPrice > 0) {
    // Use a blend of growth rate and area median
    const annualGrowthRate = 0.04; // 4% annual growth
    const baseEstimate = purchasePrice * (1 + (annualGrowthRate * (monthsHeld / 12)));

    // Weight between growth estimate and area median (70/30)
    return Math.round(baseEstimate * 0.7 + areaValuation.medianPrice * 0.3);
  }

  // Simple growth-based estimate
  const annualGrowthRate = 0.04;
  return Math.round(purchasePrice * (1 + (annualGrowthRate * (monthsHeld / 12))));
}

/**
 * Convert to PropertyValueEntry format
 */
export function toPropertyValueEntry(
  valuation: AreaValuationResult,
  source: 'land_registry' | 'house_price_index' = 'land_registry'
): PropertyValueEntry {
  return {
    id: `val-${source}-${new Date().toISOString().split('T')[0]}`,
    date: new Date().toISOString().split('T')[0],
    value: valuation.medianPrice,
    source,
    notes: `Based on ${valuation.transactions} comparable sales in area`,
  };
}

/**
 * Full property valuation workflow
 */
export async function getPropertyValuation(
  postcode: string,
  purchasePrice?: number,
  purchaseDate?: string,
  propertyType?: string,
  street?: string,
  nearbyStreets?: string[]
): Promise<{
  areaStats: AreaValuationResult | null;
  areaStatsScope: 'property_type' | 'all';
  estimatedValue: number | null;
  comparables: PricePaidRecord[];
  comparableScope: ComparableScope;
  streetsUsed: string[];
}> {
  const sales = await fetchAreaSales(postcode, 36); // 3 years of data
  let areaStats = calculateAreaValuation(sales, propertyType);
  let areaStatsScope: 'property_type' | 'all' = 'property_type';
  if (!areaStats && propertyType) {
    areaStats = calculateAreaValuation(sales);
    areaStatsScope = 'all';
  }

  let estimatedValue: number | null = null;
  if (purchasePrice && purchaseDate) {
    estimatedValue = estimateCurrentValue(purchasePrice, purchaseDate, areaStats);
  }

  const streetCandidates = [street, ...(nearbyStreets || [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  let rawComparables: PricePaidRecord[] = [];
  let scope: ComparableScope = 'area';
  let streetsUsed: string[] = [];

  if (streetCandidates.length > 0) {
    const streetSales = await fetchStreetSales(postcode, streetCandidates);
    if (streetSales.length > 0) {
      const selected = selectComparableSales(streetSales, street, nearbyStreets);
      rawComparables = selected.comparables;
      scope = selected.scope;
      streetsUsed = selected.streetsUsed;
    }
  }

  if (rawComparables.length === 0) {
    const selected = selectComparableSales(sales, street, nearbyStreets);
    rawComparables = selected.comparables;
    scope = selected.scope;
    streetsUsed = selected.streetsUsed;
  }
  if (propertyType) {
    const typeMatches = rawComparables.filter((sale) => sale.propertyType === propertyType);
    if (typeMatches.length > 0) {
      rawComparables = typeMatches;
    }
  }
  const recentComparables = filterRecentSales(rawComparables, COMPARABLE_MONTHS);
  const sortedComparables = (recentComparables.length > 0 ? recentComparables : rawComparables)
    .slice()
    .sort((a, b) => parseComparableDate(b.date) - parseComparableDate(a.date));

  return {
    areaStats,
    areaStatsScope,
    estimatedValue,
    comparables: sortedComparables.slice(0, 20),
    comparableScope: scope,
    streetsUsed,
  };
}

export default {
  fetchAreaSales,
  calculateAreaValuation,
  estimateCurrentValue,
  getPropertyValuation,
  toPropertyValueEntry,
  getPropertyTypeLabel,
};
