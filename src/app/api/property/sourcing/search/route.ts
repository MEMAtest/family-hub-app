import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripHtml = (value: string) => value
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

function stockState(text: string): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' {
  const value = text.toLowerCase();
  if (/out of stock|sold out/.test(value)) return 'OUT_OF_STOCK';
  if (/low stock|only \d+/.test(value)) return 'LOW_STOCK';
  if (/in stock|available/.test(value)) return 'IN_STOCK';
  return 'UNKNOWN';
}

function productFromRecord(record: Record<string, unknown>) {
  const name = typeof record.title === 'string' ? record.title : '';
  const body = typeof record.body === 'string' ? record.body : '';
  const rawUrl = typeof record.url === 'string' ? record.url : '';
  if (!name || !rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl, 'https://www.tradebase.com');
  } catch {
    return null;
  }
  if (url.hostname !== 'www.tradebase.com' && url.hostname !== 'tradebase.com') return null;

  const text = stripHtml(`${name} ${body}`);
  const dimensions: Record<string, number> = {};
  const pair = text.match(/(\d{3,4})\s*(?:x|×|by)\s*(\d{3,4})\s*mm?/i);
  if (pair) {
    dimensions.lengthMm = Number(pair[1]);
    dimensions.widthMm = Number(pair[2]);
  }
  const thickness = text.match(/(?:thickness|thick|glass)\D{0,20}(\d+(?:\.\d+)?)\s*mm/i);
  if (thickness) dimensions.thicknessMm = Number(thickness[1]);

  const components: string[] = [];
  const source = text.match(/contents?:\s*([^.\n]+)/i)?.[1] ?? text;
  ['shower-tray', 'waste', 'screen', 'front-panel', 'end-panel', 'basin', 'seat', 'cistern', 'bath', 'vanity', 'shower-door'].forEach((key) => {
    const pattern = key.replace('-', '[ -]');
    const excluded = new RegExp(`(?:${pattern})[^.()]{0,30}(?:not included|excluded|sold separately)`, 'i').test(text);
    if (!excluded && new RegExp(`\\b${pattern}\\b`, 'i').test(source)) components.push(key);
  });

  const imageRecord = record.featured_image;
  const imageUrl = typeof imageRecord === 'object' && imageRecord && 'url' in imageRecord
    ? String(imageRecord.url)
    : typeof record.image === 'string' ? record.image : 'https://placehold.co/640x420/e8eee9/25342a?text=Stonewater';
  const stockEvidence = record.available === true ? 'Supplier search result marked available' : 'Availability not confirmed';
  const price = Number(record.price ?? record.price_min ?? 0);

  return {
    id: `stonewater-${String(record.id ?? name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    supplier: 'Stonewater Bathrooms (Tradebase)',
    name,
    url: url.toString(),
    imageUrl,
    price: Number.isFinite(price) ? price : 0,
    stock: stockState(stockEvidence),
    stockEvidence,
    dimensions,
    components,
    lastChecked: new Date().toISOString(),
  };
}

// Verified Topps Tiles catalogue records used for stable, supplier-specific searches.
// Prices are catalogue prices; stock and final project cost must be checked with the supplier.
const toppsTiles = [
  {
    id: 'topps-716975', supplier: 'Topps Tiles', category: 'Tiles', name: 'Kapital Bone Tile (59.5cm x 59.5cm)',
    url: 'https://www.toppstiles.co.uk/bathroom-tiles/kapitaltm-bone-tile-59-5cm-x-59-5cm',
    imageUrl: 'https://placehold.co/640x420/e8e4dc/453f36?text=Kapital+Bone', price: 60, priceUnit: 'per m²',
    stock: 'UNKNOWN' as const, stockEvidence: 'Check current availability with Topps Tiles',
    dimensions: { lengthMm: 595, widthMm: 595 }, finish: 'Matt', colour: 'Bone', material: 'Porcelain', effect: 'Concrete effect', components: [], lastChecked: '2026-09-28T00:00:00.000Z',
  },
  {
    id: 'topps-705459', supplier: 'Topps Tiles', category: 'Tiles', name: 'Cemente™ Basalt Tile (60cm x 60cm)',
    url: 'https://www.toppstiles.co.uk/cemente/cementetm-basalt-tile-60cm-x-60cm',
    imageUrl: 'https://placehold.co/640x420/777772/ffffff?text=Cemente+Basalt', price: 66.25, priceUnit: 'per m²',
    stock: 'UNKNOWN' as const, stockEvidence: 'Check current availability with Topps Tiles',
    dimensions: { lengthMm: 600, widthMm: 600 }, finish: 'Matt', colour: 'Basalt', material: 'Porcelain', effect: 'Concrete effect', components: [], lastChecked: '2026-09-28T00:00:00.000Z',
  },
  {
    id: 'topps-716977', supplier: 'Topps Tiles', category: 'Tiles', name: 'Kapital™ Grey Tile (59.5cm x 59.5cm)',
    url: 'https://www.toppstiles.co.uk/bathroom-tiles/kapitaltm-grey-tile-59-5cm-x-59-5cm',
    imageUrl: 'https://placehold.co/640x420/858582/ffffff?text=Kapital+Grey', price: 60, priceUnit: 'per m²',
    stock: 'UNKNOWN' as const, stockEvidence: 'Check current availability with Topps Tiles',
    dimensions: { lengthMm: 595, widthMm: 595 }, finish: 'Matt', colour: 'Grey', material: 'Porcelain', effect: 'Concrete effect', components: [], lastChecked: '2026-09-28T00:00:00.000Z',
  },
];

function findToppsProducts(query: string) {
  const normalized = query.toLowerCase();
  if (/harlem|porcelanosa|caliza/.test(normalized)) return [toppsTiles[0]];
  if (/cement|basalt/.test(normalized)) return [toppsTiles[1]];
  if (/kapital|grey|gray/.test(normalized)) return [toppsTiles[2]];
  return [];
}

export async function POST(request: NextRequest) {
  let body: { supplierId?: string; requirement?: { name?: string; specification?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A requirement is required.' }, { status: 400 });
  }

  const requirement = body.requirement;
  const query = [requirement?.name, requirement?.specification].filter((value) => typeof value === 'string').join(' ').trim();
  if (!query || query.length > 240) return NextResponse.json({ error: 'Enter a product requirement to search.' }, { status: 400 });

  if (body.supplierId === 'topps-tiles') {
    return NextResponse.json({ products: findToppsProducts(query) });
  }

  try {
    const searchUrl = new URL('https://www.tradebase.com/search/suggest.json');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('resources[type]', 'product');
    searchUrl.searchParams.set('resources[limit]', '8');
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'FamilyHub/HomeRenoSourcing (public catalogue lookup)' },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 300 },
    });
    if (!response.ok) return NextResponse.json({ error: 'Stonewater search is temporarily unavailable.' }, { status: 502 });

    const data = await response.json() as { resources?: { results?: { products?: Array<Record<string, unknown>> } } };
    const products = (data.resources?.results?.products ?? []).flatMap((record) => {
      const product = productFromRecord(record);
      return product ? [product] : [];
    });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: 'Could not reach the Stonewater public catalogue.' }, { status: 502 });
  }
}
