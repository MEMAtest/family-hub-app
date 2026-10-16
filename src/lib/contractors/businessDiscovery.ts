import { createHash } from 'node:crypto';
import { validatePublicProductUrl } from '@/lib/sourcing/publicProductImport';
import type {
  ContractorCandidate,
  ContractorEvidence,
  ContractorEvidenceKind,
  ContractorSpecialty,
} from '@/types/contractor.types';

const FETCH_LIMIT = 1_000_000;
const FETCH_TIMEOUT = 10_000;
const fetchedAt = () => new Date().toISOString();

const decode = (value: string) => value
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#x([\da-f]+);/gi, (_match, number: string) => String.fromCodePoint(parseInt(number, 16)))
  .replace(/&#(\d+);/g, (_match, number: string) => String.fromCodePoint(Number(number)))
  .replace(/\s+/g, ' ')
  .trim();

const absoluteUrl = (value: string, base: string) => {
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};

const candidateId = (...parts: Array<string | undefined>) => createHash('sha256')
  .update(parts.filter(Boolean).join('|').toLowerCase())
  .digest('hex')
  .slice(0, 16);

export function inferContractorSpecialty(value: string): ContractorSpecialty {
  const text = value.toLowerCase();
  const rules: Array<[ContractorSpecialty, RegExp]> = [
    ['roofer', /roof|gutter|fascia|soffit|leadwork|chimney/],
    ['plumber', /plumb|bathroom|bath|shower|toilet|drain/],
    ['electrician', /electric|rewir|eicr|lighting/],
    ['gas_engineer', /gas safe|gas engineer|boiler/],
    ['heating_engineer', /heating|radiator|heat pump/],
    ['builder', /builder|building|extension|renovation|construction/],
    ['decorator', /decorat|paint|wallpaper/],
    ['gardener', /garden|landscap|tree surgeon/],
    ['locksmith', /locksmith|locks|security/],
    ['handyman', /handyman|odd jobs|property maintenance/],
    ['pest_control', /pest|vermin|rodent/],
    ['window_cleaner', /window clean/],
    ['carpet_cleaner', /carpet clean/],
    ['appliance_repair', /appliance|white goods/],
    ['cleaner', /cleaning|cleaner/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? 'other';
}

function sourceKind(url: URL): ContractorEvidenceKind {
  const host = url.hostname.replace(/^www\./, '');
  if (host.endsWith('checkatrade.com')) return 'checkatrade';
  if (host.endsWith('trustpilot.com')) return 'trustpilot';
  if (host.endsWith('eastdulwichforum.co.uk')) return 'community';
  return 'website';
}

function metaValue(html: string, key: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
    if ([attr('property'), attr('name'), attr('itemprop')].some((value) => value?.toLowerCase() === key.toLowerCase())) {
      return decode(attr('content') ?? attr('value') ?? '');
    }
  }
  return '';
}

function businessNodes(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(businessNodes);
  if (!value || typeof value !== 'object') return [];
  const item = value as Record<string, unknown>;
  const types = Array.isArray(item['@type']) ? item['@type'].map(String) : [String(item['@type'] ?? '')];
  const businessTypes = /(?:Business|Organization|Contractor|Plumber|Electrician|Roofing|ProfessionalService)/i;
  const own = types.some((type) => businessTypes.test(type)) ? [item] : [];
  return [...own, ...['@graph', 'mainEntity', 'itemListElement'].flatMap((key) => businessNodes(item[key]))];
}

function firstText(value: unknown): string {
  if (typeof value === 'string') return decode(value);
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return firstText(value[0]);
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return firstText(item.url ?? item.contentUrl ?? item.name ?? item.value);
  }
  return '';
}

function addressText(value: unknown): string {
  if (typeof value === 'string') return decode(value);
  if (!value || typeof value !== 'object') return '';
  const address = value as Record<string, unknown>;
  return ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode']
    .map((key) => firstText(address[key]))
    .filter(Boolean)
    .join(', ');
}

function firstNumber(value: unknown): number | undefined {
  const text = firstText(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

async function readBoundedHtml(rawUrl: string, fetchImpl: typeof fetch = fetch) {
  let url = await validatePublicProductUrl(rawUrl);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetchImpl(url, {
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FamilyHubTradeResearch/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === 3) throw new Error('That page redirects too many times.');
      url = await validatePublicProductUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok || !response.body || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      throw new Error('That company page could not be read. You can still enter it manually.');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > FETCH_LIMIT) throw new Error('That company page is too large to read safely.');
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    return { html: Buffer.concat(chunks).toString('utf8'), url: url.toString() };
  }
  throw new Error('That company page could not be read.');
}

export async function discoverBusinessFromUrl(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<ContractorCandidate> {
  const page = await readBoundedHtml(rawUrl, fetchImpl);
  const pageUrl = new URL(page.url);
  const scripts = Array.from(page.html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi), (match) => {
    try { return JSON.parse(match[1].replace(/<!--[\s\S]*?-->/g, '')); } catch { return null; }
  });
  const business = scripts.flatMap(businessNodes)[0];
  const title = firstText(business?.name)
    || metaValue(page.html, 'og:title')
    || decode(page.html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    || pageUrl.hostname.replace(/^www\./, '');
  const description = (firstText(business?.description) || metaValue(page.html, 'og:description') || metaValue(page.html, 'description')).slice(0, 1000);
  const phone = firstText(business?.telephone) || decode(page.html.match(/href=["']tel:([^"']+)/i)?.[1] ?? '');
  const email = firstText(business?.email) || decode(page.html.match(/href=["']mailto:([^"'?]+)/i)?.[1] ?? '');
  const canonicalWebsite = absoluteUrl(firstText(business?.url), page.url) || page.url;
  const imageUrl = absoluteUrl(firstText(business?.image) || firstText(business?.logo) || metaValue(page.html, 'og:image'), page.url);
  const aggregate = business?.aggregateRating && typeof business.aggregateRating === 'object'
    ? business.aggregateRating as Record<string, unknown>
    : undefined;
  const rating = firstNumber(aggregate?.ratingValue);
  const reviewCount = firstNumber(aggregate?.reviewCount ?? aggregate?.ratingCount);
  const address = addressText(business?.address);
  const serviceArea = firstText(business?.areaServed);
  const links = Array.from(page.html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({ url: absoluteUrl(match[1], page.url), title: decode(match[2]) }))
    .filter((item) => item.url && new URL(item.url).hostname === pageUrl.hostname && /project|portfolio|gallery|our work|case stud/i.test(`${item.title} ${item.url}`))
    .filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index)
    .slice(0, 5);
  const kind = sourceKind(pageUrl);
  const evidence: ContractorEvidence = {
    kind,
    title: kind === 'website' ? 'Company website' : title.slice(0, 120),
    url: page.url,
    summary: description || undefined,
    rating,
    reviewCount: reviewCount === undefined ? undefined : Math.round(reviewCount),
    fetchedAt: fetchedAt(),
  };
  return {
    candidateId: candidateId(title, canonicalWebsite, phone),
    name: title.slice(0, 200),
    company: title.slice(0, 200),
    phone: phone || undefined,
    email: email || undefined,
    address: address || undefined,
    website: canonicalWebsite,
    imageUrl: imageUrl || undefined,
    serviceArea: serviceArea || undefined,
    specialty: inferContractorSpecialty(`${title} ${description}`),
    summary: description || undefined,
    rating,
    reviewCount: reviewCount === undefined ? undefined : Math.round(reviewCount),
    previousWork: links,
    evidence: [evidence],
    matchReason: 'Details read from the shared page. Confirm them before saving.',
  };
}

export function parseCompaniesHouseResults(html: string, query: string): ContractorCandidate[] {
  const items = Array.from(html.matchAll(/<li\b[^>]*class=["'][^"']*type-company[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi));
  return items.slice(0, 8).flatMap((match) => {
    const block = match[1];
    const link = block.match(/href=["']\/company\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) return [];
    const companyNumber = decode(link[1]);
    const name = decode(link[2]);
    const paragraphs = Array.from(block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi), (paragraph) => decode(paragraph[1]));
    const address = paragraphs.find((paragraph) => !paragraph.includes(companyNumber)) || '';
    const meta = paragraphs.find((paragraph) => paragraph.includes(companyNumber)) || companyNumber;
    const url = `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`;
    const evidence: ContractorEvidence = {
      kind: 'companies_house',
      title: 'Companies House record',
      url,
      summary: meta,
      fetchedAt: fetchedAt(),
    };
    return [{
      candidateId: candidateId('companies-house', companyNumber),
      name,
      company: name,
      address: address || undefined,
      companyNumber,
      companyStatus: /dissolved/i.test(meta) ? 'dissolved' : 'registered',
      specialty: inferContractorSpecialty(`${name} ${query}`),
      summary: meta,
      evidence: [evidence],
      matchReason: 'Possible registered-company match. Check the address and company number.',
    }];
  });
}

export async function searchCompaniesHouse(query: string, fetchImpl: typeof fetch = fetch) {
  const url = `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}`;
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'FamilyHubTradeResearch/1.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!response.ok) throw new Error('Companies House search is temporarily unavailable.');
  const html = await response.text();
  if (Buffer.byteLength(html) > FETCH_LIMIT) throw new Error('Companies House returned too much data.');
  return parseCompaniesHouseResults(html, query);
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  types?: string[];
};

export async function searchGooglePlaces(input: { query: string; location?: string; specialty?: string }, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<ContractorCandidate[]> {
  const textQuery = [input.query, input.specialty, input.location].filter(Boolean).join(' ');
  const response = await fetchImpl('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.businessStatus,places.types',
    },
    body: JSON.stringify({ textQuery, pageSize: 6, languageCode: 'en', regionCode: 'GB' }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!response.ok) throw new Error('Google business search is temporarily unavailable.');
  const payload = await response.json() as { places?: GooglePlace[] };
  return (payload.places ?? []).map((place) => {
    const name = place.displayName?.text?.trim() || 'Unnamed business';
    const sourceUrl = place.googleMapsUri || place.websiteUri || 'https://www.google.com/maps';
    const evidence: ContractorEvidence = {
      kind: 'google',
      title: 'Google business listing',
      url: sourceUrl,
      summary: place.businessStatus ? `Business status: ${place.businessStatus.replace(/_/g, ' ').toLowerCase()}` : undefined,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      fetchedAt: fetchedAt(),
    };
    return {
      candidateId: candidateId('google', place.id, name, place.formattedAddress),
      name,
      company: name,
      phone: place.internationalPhoneNumber,
      address: place.formattedAddress,
      website: place.websiteUri,
      serviceArea: input.location,
      companyStatus: place.businessStatus?.toLowerCase(),
      specialty: inferContractorSpecialty(`${input.specialty ?? ''} ${name} ${(place.types ?? []).join(' ')}`),
      rating: place.rating,
      reviewCount: place.userRatingCount,
      evidence: [evidence],
      matchReason: 'Local business match. Confirm the address before saving.',
    } satisfies ContractorCandidate;
  });
}

export async function discoverBusinesses(input: { query?: string; url?: string; location?: string; specialty?: string }, fetchImpl: typeof fetch = fetch) {
  if (input.url) {
    const safeUrl = (await validatePublicProductUrl(input.url)).toString();
    try {
      return { candidates: [await discoverBusinessFromUrl(safeUrl, fetchImpl)], providers: { link: 'ok' as const } };
    } catch {
      const pageUrl = new URL(safeUrl);
      const name = pageUrl.hostname.replace(/^www\./, '');
      const kind = sourceKind(pageUrl);
      return {
        candidates: [{
          candidateId: candidateId('shared-link', safeUrl),
          name,
          website: safeUrl,
          specialty: inferContractorSpecialty(`${name} ${input.specialty ?? ''}`),
          evidence: [{
            kind,
            title: 'Shared link',
            url: safeUrl,
            summary: 'This site prevented automatic reading. Open the source and confirm the company details.',
            fetchedAt: fetchedAt(),
          }],
          matchReason: 'Link saved for review because this site prevented automatic reading.',
        }],
        providers: { link: 'unavailable' as const },
      };
    }
  }
  const query = input.query?.trim() ?? '';
  if (query.length < 2) throw new Error('Enter at least two characters of the company name.');
  const providers: Record<string, 'ok' | 'unavailable' | 'not_configured'> = {};
  const searches: Array<Promise<ContractorCandidate[]>> = [];
  searches.push(searchCompaniesHouse(query, fetchImpl).then((items) => { providers.companiesHouse = 'ok'; return items; }).catch(() => { providers.companiesHouse = 'unavailable'; return []; }));
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleKey) searches.push(searchGooglePlaces({ query, location: input.location, specialty: input.specialty }, googleKey, fetchImpl).then((items) => { providers.google = 'ok'; return items; }).catch(() => { providers.google = 'unavailable'; return []; }));
  else providers.google = 'not_configured';
  const candidates = (await Promise.all(searches)).flat();
  const unique = candidates.filter((candidate, index, all) => all.findIndex((item) => item.candidateId === candidate.candidateId) === index);
  return { candidates: unique.slice(0, 12), providers };
}
