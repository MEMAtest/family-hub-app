import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/property/bin-collection
 *
 * Fetches bin collection days for a given address in Bromley.
 * Uses the Bromley Council waste collection lookup.
 *
 * Query params:
 * - postcode: Required. UK postcode (e.g., "SE20 7UA")
 * - address: Optional. Street address for more accurate lookup
 */

interface BinCollection {
  type: 'refuse' | 'recycling' | 'food' | 'garden';
  label: string;
  nextCollection: string;
  frequency: string;
  binColor: string;
  icon: string;
}

interface BinCollectionResponse {
  success: boolean;
  postcode: string;
  address?: string;
  resolvedAddress?: string;
  collections: BinCollection[];
  council: string;
  lookupUrl: string;
  scheduleUrl?: string;
  lastUpdated: string;
  source: 'bromley' | 'fallback';
}

const BROMLEY_WASTE_URL = 'https://recyclingservices.bromley.gov.uk/waste';

// Bromley Council bin collection schedule
// In a production environment, this would scrape or call the council API
// For now, we provide accurate generic information for SE20

function calculateNextCollectionDay(dayOfWeek: number, weekType: 'weekly' | 'fortnightly' | 'A' | 'B'): string {
  const now = new Date();
  const today = now.getDay();

  // Calculate days until next collection
  let daysUntil = dayOfWeek - today;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  // For fortnightly collections, check if we need to add a week
  if (weekType === 'fortnightly' || weekType === 'A' || weekType === 'B') {
    const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
    const isWeekA = weekNumber % 2 === 0;

    if (weekType === 'A' && !isWeekA) {
      daysUntil += 7;
    } else if (weekType === 'B' && isWeekA) {
      daysUntil += 7;
    }
  }

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);

  return nextDate.toISOString().split('T')[0];
}

function formatCollectionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }
}

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const cleanHtmlText = (value?: string): string =>
  decodeEntities((value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCollectionText = (value: string): string => {
  const cleaned = cleanHtmlText(value);
  const withoutNote = cleaned.split(' (')[0]?.trim();
  return withoutNote.replace(/,?\s*at\s+\d.*$/i, '').trim();
};

const parseBromleyAddressOptions = (html: string): Array<{ id: string; label: string }> => {
  const options: Array<{ id: string; label: string }> = [];
  const matches = html.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g);
  for (const match of matches) {
    options.push({ id: match[1], label: decodeEntities(match[2]).trim() });
  }
  return options;
};

const selectBromleyAddress = (options: Array<{ id: string; label: string }>, address: string) => {
  if (!address) return null;
  const addressLine1 = address.split(',')[0]?.trim() || address.trim();
  const candidates = [addressLine1, address].map((value) => normalizeText(value)).filter(Boolean);

  for (const candidate of candidates) {
    const match = options.find((option) => normalizeText(option.label).startsWith(candidate));
    if (match) return match;
  }

  for (const candidate of candidates) {
    const match = options.find((option) => normalizeText(option.label).includes(candidate));
    if (match) return match;
  }

  return null;
};

const mapBromleyService = (serviceName: string): Omit<BinCollection, 'nextCollection' | 'frequency'> | null => {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes('mixed recycling')) {
    return {
      type: 'recycling',
      label: serviceName,
      binColor: 'green',
      icon: '♻️',
    };
  }
  if (normalized.includes('paper') || normalized.includes('cardboard')) {
    return {
      type: 'recycling',
      label: serviceName,
      binColor: 'black',
      icon: '📄',
    };
  }
  if (normalized.includes('food')) {
    return {
      type: 'food',
      label: serviceName,
      binColor: 'brown',
      icon: '🍎',
    };
  }
  if (normalized.includes('garden')) {
    return {
      type: 'garden',
      label: serviceName,
      binColor: 'brown',
      icon: '🌿',
    };
  }
  if (normalized.includes('refuse') || normalized.includes('non-recyclable')) {
    return {
      type: 'refuse',
      label: serviceName,
      binColor: 'black',
      icon: '🗑️',
    };
  }
  return null;
};

const parseBromleyCollections = (html: string): BinCollection[] => {
  const collections: BinCollection[] = [];
  const blocks = html.matchAll(
    /<h3 class="govuk-heading-m waste-service-name">([\s\S]*?)<\/h3>[\s\S]*?<dl class="govuk-summary-list">([\s\S]*?)<\/dl>/g
  );

  for (const block of blocks) {
    const serviceName = cleanHtmlText(block[1]);
    const summaryHtml = block[2];
    const frequencyMatch = summaryHtml.match(/Frequency<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/);
    const nextMatch = summaryHtml.match(/Next collection<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/);
    const frequency = frequencyMatch ? cleanHtmlText(frequencyMatch[1]) : '';
    const nextCollection = nextMatch ? normalizeCollectionText(nextMatch[1]) : '';
    const mapped = mapBromleyService(serviceName);

    if (!mapped || !nextCollection) {
      continue;
    }

    collections.push({
      ...mapped,
      nextCollection,
      frequency: frequency || 'See council schedule',
    });
  }

  return collections;
};

const fetchBromleyCollections = async (
  postcode: string,
  address?: string
): Promise<{ collections: BinCollection[]; resolvedAddress: string; lookupUrl: string } | null> => {
  if (!address) return null;

  const postcodeResponse = await fetch(BROMLEY_WASTE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ postcode }).toString(),
    cache: 'no-store',
  });

  if (!postcodeResponse.ok) {
    return null;
  }

  const cookieHeader =
    typeof (postcodeResponse.headers as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (postcodeResponse.headers as { getSetCookie: () => string[] }).getSetCookie().join('; ')
      : postcodeResponse.headers.get('set-cookie') || '';
  const sessionMatch = cookieHeader.match(/fixmystreet_app_session=([^;]+);/i);
  const sessionCookie = sessionMatch ? `fixmystreet_app_session=${sessionMatch[1]}` : '';
  const postcodeHtml = await postcodeResponse.text();
  const options = parseBromleyAddressOptions(postcodeHtml);
  const selected = selectBromleyAddress(options, address);

  if (!selected || !sessionCookie) {
    return null;
  }

  const scheduleResponse = await fetch(`${BROMLEY_WASTE_URL}/${selected.id}?page_loading=1`, {
    headers: {
      Cookie: sessionCookie,
    },
    cache: 'no-store',
  });

  if (!scheduleResponse.ok) {
    return null;
  }

  const scheduleHtml = await scheduleResponse.text();
  const collections = parseBromleyCollections(scheduleHtml);

  if (collections.length === 0) {
    return null;
  }

  return {
    collections,
    resolvedAddress: selected.label,
    lookupUrl: `${BROMLEY_WASTE_URL}/${selected.id}`,
  };
};

/**
 * Get bin collection schedule for SE20 area
 * Based on Bromley Council collection patterns
 */
function getBromleyCollectionSchedule(postcode: string): BinCollection[] {
  // SE20 7UA is in Bromley - Tuesday collection day for most of SE20
  // This is based on typical Bromley collection patterns
  const collectionDay = 2; // Tuesday = 2

  return [
    {
      type: 'refuse',
      label: 'General Waste (Black Bin)',
      nextCollection: formatCollectionDate(calculateNextCollectionDay(collectionDay, 'fortnightly')),
      frequency: 'Fortnightly',
      binColor: 'black',
      icon: '🗑️',
    },
    {
      type: 'recycling',
      label: 'Mixed Recycling (Green Box)',
      nextCollection: formatCollectionDate(calculateNextCollectionDay(collectionDay, 'weekly')),
      frequency: 'Weekly',
      binColor: 'green',
      icon: '♻️',
    },
    {
      type: 'food',
      label: 'Food Waste (Brown Caddy)',
      nextCollection: formatCollectionDate(calculateNextCollectionDay(collectionDay, 'weekly')),
      frequency: 'Weekly',
      binColor: 'brown',
      icon: '🍎',
    },
    {
      type: 'garden',
      label: 'Garden Waste (Brown Bin)',
      nextCollection: formatCollectionDate(calculateNextCollectionDay(collectionDay, 'fortnightly')),
      frequency: 'Fortnightly (subscription)',
      binColor: 'brown',
      icon: '🌿',
    },
  ];
}

export async function GET(request: NextRequest): Promise<NextResponse<BinCollectionResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = searchParams.get('postcode');
    const address = searchParams.get('address');

    if (!postcode) {
      return NextResponse.json(
        { error: 'Postcode is required' },
        { status: 400 }
      );
    }

    // Validate UK postcode format
    const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode.trim())) {
      return NextResponse.json(
        { error: 'Invalid UK postcode format' },
        { status: 400 }
      );
    }

    const normalizedPostcode = postcode.toUpperCase().trim();

    // Determine council based on postcode
    let council = 'Unknown';
    let collections: BinCollection[] = [];
    let lookupUrl = '';
    let scheduleUrl: string | undefined;
    let bromleyData: { collections: BinCollection[]; resolvedAddress: string; lookupUrl: string } | null = null;

    if (normalizedPostcode.startsWith('SE20') ||
        normalizedPostcode.startsWith('BR') ||
        ['SE6', 'SE9', 'SE12', 'SE26'].some(p => normalizedPostcode.startsWith(p))) {
      council = 'London Borough of Bromley';
      bromleyData = await fetchBromleyCollections(normalizedPostcode, address || undefined);
      if (bromleyData) {
        collections = bromleyData.collections;
        lookupUrl = BROMLEY_WASTE_URL;
        scheduleUrl = bromleyData.lookupUrl;
      } else {
        collections = getBromleyCollectionSchedule(normalizedPostcode);
        lookupUrl = BROMLEY_WASTE_URL;
      }
    } else {
      // Generic response for unsupported areas
      council = 'Unknown Council';
      lookupUrl = 'https://www.gov.uk/bin-collection-find-your-council';
    }

    return NextResponse.json({
      success: true,
      postcode: normalizedPostcode,
      address: address || undefined,
      resolvedAddress: bromleyData?.resolvedAddress,
      collections,
      council,
      lookupUrl,
      scheduleUrl,
      lastUpdated: new Date().toISOString(),
      source: bromleyData ? 'bromley' : 'fallback',
    });
  } catch (error) {
    console.error('Bin collection fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bin collection data' },
      { status: 500 }
    );
  }
}
