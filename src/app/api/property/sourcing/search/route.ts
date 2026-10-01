import { NextRequest, NextResponse } from 'next/server';
import type { SourcedProduct, SourcingStock } from '@/types/sourcing.types';
import { bathroomSourcingSeed } from '@/lib/sourcing/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STONEWATER = 'https://www.stonewaterbathrooms.com';
const USER_AGENT = 'FamilyHub/HomeRenoSourcing (public catalogue lookup)';

const stripHtml = (value: string) => value
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

function stockFromText(text: string | null): SourcingStock {
  if (!text) return 'UNKNOWN';
  const value = text.toLowerCase();
  if (/out of stock|sold out/.test(value)) return 'OUT_OF_STOCK';
  if (/low stock|only \d+ left/.test(value)) return 'LOW_STOCK';
  if (/in stock/.test(value)) return 'IN_STOCK';
  if (/available to order/.test(value)) return 'TO_ORDER';
  return 'UNKNOWN';
}

function isStonewaterUrl(raw: string) {
  try {
    const url = new URL(raw, STONEWATER);
    return /(^|\.)stonewaterbathrooms\.com$|(^|\.)tradebase\.com$/.test(url.hostname) && url.pathname.startsWith('/products/');
  } catch {
    return false;
  }
}

/** Product URL on the current domain, without search-tracking parameters. */
function cleanProductUrl(raw: string) {
  return `${STONEWATER}${new URL(raw, STONEWATER).pathname}`;
}

async function fetchStockLine(productUrl: string) {
  const response = await fetch(productUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!response.ok) return null;
  const html = await response.text();
  const lines = Array.from(html.matchAll(/color: rgb\(var\(--color-accent-\d\)\)">([^<]+)</g), (match) => match[1].trim());
  return lines.find((line) => /stock|order/i.test(line)) ?? null;
}

/**
 * Reads the stock line Stonewater prints beside the price, e.g. "In stock. Delivery from Fri 2nd Oct."
 * Under load the page is sometimes served without that line, so try once more before giving up.
 */
async function readStonewaterStock(productUrl: string) {
  return (await fetchStockLine(productUrl)) ?? fetchStockLine(productUrl);
}

/** Runs `task` over `items` with at most `limit` in flight, so a search does not hammer the supplier. */
async function forEachLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await task(items[next++]);
  }));
}

function productFromRecord(record: Record<string, unknown>): SourcedProduct | null {
  const name = typeof record.title === 'string' ? record.title : '';
  const rawUrl = typeof record.url === 'string' ? record.url : '';
  if (!name || !rawUrl || !isStonewaterUrl(rawUrl)) return null;
  const text = stripHtml(typeof record.body === 'string' ? record.body : '');

  const dimensions: Record<string, number> = {};
  const pair = name.match(/(\d{3,4})\s*(?:mm)?\s*(?:x|×)\s*(\d{3,4})\s*mm?/i);
  const width = name.match(/(\d{3,4})\s*mm/i);
  if (pair) {
    dimensions.lengthMm = Number(pair[1]);
    dimensions.widthMm = Number(pair[2]);
  } else if (width) {
    dimensions.maxWidthMm = Number(width[1]);
  }

  const components: string[] = [];
  ['shower-tray', 'waste', 'screen', 'basin', 'seat', 'cistern', 'bath', 'vanity', 'shower-door', 'side-panel', 'towel-rail', 'valves'].forEach((key) => {
    const pattern = key.replace('-', '[ -]');
    const excluded = new RegExp(`(?:${pattern})[^.()]{0,30}(?:not included|excluded|sold separately)`, 'i').test(text);
    if (!excluded && new RegExp(`\\b${pattern}\\b`, 'i').test(name)) components.push(key);
  });

  const image = typeof record.image === 'string' ? record.image
    : typeof record.featured_image === 'object' && record.featured_image && 'url' in record.featured_image ? String(record.featured_image.url) : '';
  const price = Number(record.price ?? record.price_min ?? 0);

  return {
    id: `sw-${String(record.id ?? name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    supplier: 'Stonewater Bathrooms',
    name,
    size: pair ? `${pair[1]} × ${pair[2]}mm` : width ? `${width[1]}mm` : undefined,
    url: cleanProductUrl(rawUrl),
    imageUrl: image,
    gallery: image ? [image] : [],
    price: Number.isFinite(price) ? price : 0,
    stock: 'UNKNOWN',
    stockEvidence: 'Stock could not be checked',
    dimensions,
    components,
    description: text.slice(0, 420),
    lastChecked: new Date().toISOString(),
  };
}

function findToppsProducts(query: string) {
  const normalized = query.toLowerCase();
  const tiles = bathroomSourcingSeed.products.filter((product) => product.supplier === 'Topps Tiles');
  const pick = (id: string) => tiles.filter((tile) => tile.id === id);
  if (/harlem|porcelanosa|caliza|bone/.test(normalized)) return pick('topps-716975');
  if (/cement|basalt|dark grey/.test(normalized)) return pick('topps-705459');
  if (/kapital|grey|gray/.test(normalized)) return pick('topps-716977');
  return [];
}

export async function POST(request: NextRequest) {
  let body: { action?: string; url?: string; supplierId?: string; requirement?: { name?: string; specification?: string; size?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A requirement is required.' }, { status: 400 });
  }

  if (body.action === 'stock') {
    if (!body.url || !isStonewaterUrl(body.url)) return NextResponse.json({ error: 'Live stock checks are available for Stonewater products.' }, { status: 400 });
    try {
      const stockEvidence = await readStonewaterStock(cleanProductUrl(body.url));
      return NextResponse.json({ stock: stockFromText(stockEvidence), stockEvidence: stockEvidence ?? 'Stock not shown on supplier page', lastChecked: new Date().toISOString() });
    } catch {
      return NextResponse.json({ error: 'Could not reach Stonewater to check stock.' }, { status: 502 });
    }
  }

  const requirement = body.requirement;
  const query = [requirement?.name, requirement?.size]
    .filter((value): value is string => typeof value === 'string' && value !== '—')
    .join(' ')
    .replace(/[×(),+·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!query || query.length > 240) return NextResponse.json({ error: 'Enter a product requirement to search.' }, { status: 400 });

  if (body.supplierId === 'topps-tiles') {
    return NextResponse.json({ products: findToppsProducts(`${query} ${requirement?.specification ?? ''}`) });
  }

  try {
    const searchUrl = new URL(`${STONEWATER}/search/suggest.json`);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('resources[type]', 'product');
    searchUrl.searchParams.set('resources[limit]', '8');
    const response = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000), next: { revalidate: 300 } });
    if (!response.ok) return NextResponse.json({ error: 'Stonewater search is temporarily unavailable.' }, { status: 502 });

    const data = await response.json() as { resources?: { results?: { products?: Array<Record<string, unknown>> } } };
    const products = (data.resources?.results?.products ?? []).flatMap((record) => {
      const product = productFromRecord(record);
      return product ? [product] : [];
    });
    // The search feed only says whether a product can be bought; the product page says whether it is held in stock.
    await forEachLimited(products, 3, async (product) => {
      try {
        const evidence = await readStonewaterStock(product.url);
        product.stock = stockFromText(evidence);
        product.stockEvidence = evidence ?? 'Stock not shown on supplier page';
      } catch {
        // Keep the "could not be checked" wording.
      }
    });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: 'Could not reach the Stonewater catalogue.' }, { status: 502 });
  }
}
