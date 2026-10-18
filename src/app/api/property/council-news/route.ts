import { NextRequest, NextResponse } from 'next/server';

type CouncilCategory = 'planning' | 'roadworks' | 'events' | 'services' | 'general';

interface CouncilNewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: CouncilCategory;
  url?: string;
  priority: 'low' | 'medium' | 'high';
  source: string;
  reference?: string;
  address?: string;
  status?: string;
  distanceMetres?: number;
  sourceUpdatedAt?: string;
}

interface PlanningApplicationSource {
  id: string;
  lpa_app_no?: string;
  valid_date?: string;
  decision_date?: string;
  last_updated?: string;
  application_type?: string;
  site_number?: string;
  street_name?: string;
  postcode?: string;
  description?: string;
  status?: string;
  decision?: string;
  centroid?: { lat: number | string; lon: number | string };
}

const BROMLEY_REGISTER_URL = 'https://www.bromley.gov.uk/planningaccess';
const LONDON_PLANNING_API = 'https://planningdata.london.gov.uk/api-guest/applications/_search';
const LONDON_PLANNING_HEADER = 'be2rmRnt&';

const isoDate = (value?: string) => {
  if (!value) return '';
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString().slice(0, 10);
};

const distanceMetres = (from: { lat: number; lon: number }, to?: PlanningApplicationSource['centroid']) => {
  if (!to) return undefined;
  const lat = Number(to.lat);
  const lon = Number(to.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  const radius = 6_371_000;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat - from.lat);
  const dLon = radians(lon - from.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const statusExplanation = (application: PlanningApplicationSource) => {
  const status = application.status || application.decision || 'Status not supplied';
  if (/under consideration|pending/i.test(status)) return 'The council has not recorded a decision yet. Open the register if you want to review or comment.';
  if (/approved|granted|not required|no objection/i.test(status)) return 'The council has allowed this proposal or confirmed that formal permission is not required.';
  if (/refused|dismissed/i.test(status)) return 'The council did not allow this proposal in its recorded form.';
  if (/withdrawn|lapsed/i.test(status)) return 'This proposal is not currently progressing under this application.';
  return `Council status: ${status}.`;
};

const applicationAddress = (application: PlanningApplicationSource) =>
  [application.site_number, application.street_name, application.postcode].filter(Boolean).join(' ') || 'Address not supplied';

const toPlanningNewsItem = (
  application: PlanningApplicationSource,
  propertyLocation: { lat: number; lon: number }
): CouncilNewsItem => {
  const address = applicationAddress(application);
  const distance = distanceMetres(propertyLocation, application.centroid);
  const description = (application.description || 'The council record does not include a description.').replace(/\s+/g, ' ').trim();
  return {
    id: application.id,
    title: `${address}: ${application.application_type || 'Planning application'}`,
    summary: `${description}${/[.!?]$/.test(description) ? '' : '.'} ${statusExplanation(application)}`,
    date: isoDate(application.valid_date) || isoDate(application.last_updated) || new Date().toISOString().slice(0, 10),
    category: 'planning',
    url: BROMLEY_REGISTER_URL,
    priority: /under consideration|pending/i.test(application.status || '') && (distance ?? 10_000) <= 500 ? 'high' : 'medium',
    source: 'London Planning Datahub',
    reference: application.lpa_app_no,
    address,
    status: application.status || application.decision,
    distanceMetres: distance,
    sourceUpdatedAt: application.last_updated,
  };
};

const geocodePostcode = async (postcode: string) => {
  const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s/g, ''))}`, {
    next: { revalidate: 86_400 },
  });
  if (!response.ok) throw new Error('Postcode location lookup failed');
  const payload = await response.json();
  const latitude = Number(payload?.result?.latitude);
  const longitude = Number(payload?.result?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Postcode location unavailable');
  return { lat: latitude, lon: longitude };
};

const fetchPlanningApplications = async (postcode: string): Promise<{ items: CouncilNewsItem[]; latestSourceUpdate: string | null }> => {
  const location = await geocodePostcode(postcode);
  const year = new Date().getUTCFullYear() % 100;
  const yearFilters = [year, year - 1, year - 2].map((value) => ({ regexp: { lpa_app_no: `${String(value).padStart(2, '0')}.*` } }));
  const response = await fetch(LONDON_PLANNING_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-AllowRequest': LONDON_PLANNING_HEADER,
    },
    body: JSON.stringify({
      size: 250,
      query: {
        bool: {
          must: [
            { term: { 'lpa_name.raw': 'Bromley' } },
            { geo_distance: { distance: '2km', centroid: location } },
          ],
          should: yearFilters,
          minimum_should_match: 1,
        },
      },
      _source: [
        'id', 'lpa_app_no', 'valid_date', 'decision_date', 'last_updated', 'application_type',
        'site_number', 'street_name', 'postcode', 'description', 'status', 'decision', 'centroid',
      ],
    }),
    next: { revalidate: 21_600 },
  });
  if (!response.ok) throw new Error(`London Planning Datahub returned ${response.status}`);
  const payload = await response.json();
  const applications = ((payload?.hits?.hits || []) as Array<{ _source?: PlanningApplicationSource }>)
    .map((hit) => hit._source)
    .filter((item): item is PlanningApplicationSource => Boolean(item?.id));
  const sorted = applications.sort((a, b) => (isoDate(b.valid_date) || '').localeCompare(isoDate(a.valid_date) || ''));
  const sourceUpdates = applications.map((item) => item.last_updated || '').sort();
  const latestSourceUpdate = sourceUpdates[sourceUpdates.length - 1] || null;
  return {
    items: sorted.slice(0, 8).map((item) => toPlanningNewsItem(item, location)),
    latestSourceUpdate,
  };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postcode = searchParams.get('postcode')?.trim();
  const categories = searchParams.get('categories')?.split(',').map((item) => item.trim().toLowerCase());
  if (!postcode) return NextResponse.json({ error: 'Postcode is required' }, { status: 400 });
  if (!/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(postcode)) {
    return NextResponse.json({ error: 'Invalid UK postcode format' }, { status: 400 });
  }

  try {
    const planning = await fetchPlanningApplications(postcode);
    const news = categories?.length
      ? planning.items.filter((item) => categories.includes(item.category))
      : planning.items;
    return NextResponse.json({
      success: true,
      postcode: postcode.toUpperCase(),
      council: 'Bromley',
      newsCount: news.length,
      news,
      dataFreshness: {
        latestSourceUpdate: planning.latestSourceUpdate,
        checkedAt: new Date().toISOString(),
      },
      sources: {
        council: 'https://www.bromley.gov.uk',
        planning: BROMLEY_REGISTER_URL,
        data: 'https://planninglondondatahub.london.gov.uk/',
      },
    });
  } catch (error) {
    console.error('Council news fetch error:', error);
    return NextResponse.json({
      success: false,
      postcode: postcode.toUpperCase(),
      council: 'Bromley',
      newsCount: 0,
      news: [],
      error: 'Verified planning applications are temporarily unavailable.',
      sources: { planning: BROMLEY_REGISTER_URL },
      lastUpdated: new Date().toISOString(),
    }, { status: 502 });
  }
}
