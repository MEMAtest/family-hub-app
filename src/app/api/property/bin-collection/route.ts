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
  source: 'bromley-ics' | 'bromley' | 'fallback';
}

const BROMLEY_WASTE_URL = 'https://recyclingservices.bromley.gov.uk/waste';

// Known property IDs for reliable ICS calendar lookup
const KNOWN_BROMLEY_PROPERTY_IDS: Record<string, string> = {
  '21 tremaine road': '3670007',
};

// Get property ID from known addresses
function getKnownPropertyId(address: string): string | null {
  if (!address) return null;
  const normalized = address.toLowerCase().trim();
  for (const [key, id] of Object.entries(KNOWN_BROMLEY_PROPERTY_IDS)) {
    if (normalized.includes(key)) return id;
  }
  return null;
}

// Parse ICS calendar from Bromley Council
interface ICSEvent {
  date: string; // YYYYMMDD
  summary: string;
}

function parseICSCalendar(icsText: string): ICSEvent[] {
  const events: ICSEvent[] = [];
  const eventBlocks = icsText.split('BEGIN:VEVENT');

  for (const block of eventBlocks) {
    const dateMatch = block.match(/DTSTART;VALUE=DATE:(\d{8})/);
    const summaryMatch = block.match(/SUMMARY:(.+)/);

    if (dateMatch && summaryMatch) {
      events.push({
        date: dateMatch[1],
        summary: summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim()
      });
    }
  }

  return events;
}

// Map ICS service names to bin types
function mapICSServiceName(summary: string): Omit<BinCollection, 'nextCollection' | 'frequency'> | null {
  const lower = summary.toLowerCase();

  if (lower.includes('non-recyclable') || lower.includes('refuse')) {
    return {
      type: 'refuse',
      label: 'General Waste (Black Bin)',
      binColor: 'black',
      icon: '🗑️',
    };
  }
  if (lower.includes('mixed recycling') || lower.includes('recycling')) {
    return {
      type: 'recycling',
      label: 'Mixed Recycling (Green Box)',
      binColor: 'green',
      icon: '♻️',
    };
  }
  if (lower.includes('food waste') || lower.includes('food')) {
    return {
      type: 'food',
      label: 'Food Waste (Brown Caddy)',
      binColor: 'brown',
      icon: '🍎',
    };
  }
  if (lower.includes('garden')) {
    return {
      type: 'garden',
      label: 'Garden Waste (Brown Bin)',
      binColor: 'brown',
      icon: '🌿',
    };
  }
  return null;
}

// Convert YYYYMMDD to Date
function parseICSDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

// Fetch and parse ICS calendar from Bromley
async function fetchBromleyICS(propertyId: string): Promise<BinCollection[] | null> {
  try {
    const icsUrl = `https://recyclingservices.bromley.gov.uk/waste/${propertyId}/calendar.ics`;
    const response = await fetch(icsUrl, { cache: 'no-store' });

    if (!response.ok) {
      console.log('ICS fetch failed:', response.status);
      return null;
    }

    const icsText = await response.text();
    const events = parseICSCalendar(icsText);

    if (events.length === 0) {
      return null;
    }

    // Group events by bin type and find next collection for each
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const binTypeMap = new Map<string, { events: Date[]; info: Omit<BinCollection, 'nextCollection' | 'frequency'> }>();

    for (const event of events) {
      const mapped = mapICSServiceName(event.summary);
      if (!mapped) continue;

      const eventDate = parseICSDate(event.date);

      if (!binTypeMap.has(mapped.type)) {
        binTypeMap.set(mapped.type, { events: [], info: mapped });
      }
      binTypeMap.get(mapped.type)!.events.push(eventDate);
    }

    const collections: BinCollection[] = [];

    for (const [type, data] of binTypeMap) {
      // Sort dates and find next collection
      const futureDates = data.events
        .filter(d => d >= now)
        .sort((a, b) => a.getTime() - b.getTime());

      if (futureDates.length === 0) continue;

      const nextDate = futureDates[0];

      // Determine frequency by checking gap between collections
      let frequency = 'See schedule';
      if (futureDates.length >= 2) {
        const gap = Math.round((futureDates[1].getTime() - futureDates[0].getTime()) / (1000 * 60 * 60 * 24));
        if (gap <= 8) frequency = 'Weekly';
        else if (gap <= 15) frequency = 'Fortnightly';
        else frequency = 'Monthly';
      }

      collections.push({
        ...data.info,
        nextCollection: formatCollectionDate(nextDate.toISOString().split('T')[0]),
        frequency,
      });
    }

    // Sort by type for consistent display
    const typeOrder = ['refuse', 'recycling', 'food', 'garden'];
    collections.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));

    return collections.length > 0 ? collections : null;
  } catch (error) {
    console.error('ICS fetch error:', error);
    return null;
  }
}

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
  // SE20 7UA is in Bromley - Friday collection day for SE20 7UA area
  // Based on actual Bromley ICS calendar data
  const collectionDay = 5; // Friday = 5

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
    let resolvedAddress: string | undefined;
    let source: 'bromley-ics' | 'bromley' | 'fallback' = 'fallback';

    if (normalizedPostcode.startsWith('SE20') ||
        normalizedPostcode.startsWith('BR') ||
        ['SE6', 'SE9', 'SE12', 'SE26'].some(p => normalizedPostcode.startsWith(p))) {
      council = 'London Borough of Bromley';
      lookupUrl = BROMLEY_WASTE_URL;

      // Try ICS calendar first if we have a known property ID
      const knownPropertyId = getKnownPropertyId(address || '');
      if (knownPropertyId) {
        console.log(`Using known property ID ${knownPropertyId} for address: ${address}`);
        const icsCollections = await fetchBromleyICS(knownPropertyId);
        if (icsCollections && icsCollections.length > 0) {
          collections = icsCollections;
          scheduleUrl = `${BROMLEY_WASTE_URL}/${knownPropertyId}`;
          resolvedAddress = address || undefined;
          source = 'bromley-ics';
        }
      }

      // Fall back to HTML scraping if ICS didn't work
      if (collections.length === 0 && address) {
        console.log('ICS not available, trying HTML scraping...');
        const bromleyData = await fetchBromleyCollections(normalizedPostcode, address);
        if (bromleyData) {
          collections = bromleyData.collections;
          scheduleUrl = bromleyData.lookupUrl;
          resolvedAddress = bromleyData.resolvedAddress;
          source = 'bromley';
        }
      }

      // Final fallback to hardcoded schedule (but now uses Friday for SE20)
      if (collections.length === 0) {
        console.log('Using fallback schedule');
        collections = getBromleyCollectionSchedule(normalizedPostcode);
        source = 'fallback';
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
      resolvedAddress,
      collections,
      council,
      lookupUrl,
      scheduleUrl,
      lastUpdated: new Date().toISOString(),
      source,
    });
  } catch (error) {
    console.error('Bin collection fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bin collection data' },
      { status: 500 }
    );
  }
}
