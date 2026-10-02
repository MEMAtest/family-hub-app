// Search UK tile shops for tiles like a quote item (e.g. an equivalent for a
// Porcelanosa tile the fitter priced), and have a cheap AI say how close each is.
//
// Topps Tiles blocks automated lookups, so its tiles stay hand-curated in the seed.
// These shops run Shopify and allow catalogue search (their robots.txt does not
// disallow /search). Porcelain Superstore and Mandarin Stone do disallow it, so
// they are not here.
//
// Prices: shops price differently, and a wrong total is worse than none.
// Ca' Pietra sells by the m²; Tiles Ahead prices one tile, which we turn into a
// price per m² from the tile size; Walltiles and Bert & May price a box, whose
// coverage is not machine-readable, so those stay "per box" for the fitter.

import type { SourcedProduct, SourcingStock } from '@/types/sourcing.types';

export interface TileStore {
  id: string;
  name: string;
  host: string;
  pricing: 'per m²' | 'per tile' | 'per box';
}

export const TILE_STORES: TileStore[] = [
  { id: 'capietra', name: "Ca' Pietra", host: 'www.capietra.com', pricing: 'per m²' },
  { id: 'tilesahead', name: 'Tiles Ahead', host: 'www.tilesahead.co.uk', pricing: 'per tile' },
  { id: 'walltiles', name: 'Walltiles', host: 'www.walltiles.co.uk', pricing: 'per box' },
  { id: 'bertandmay', name: 'Bert & May', host: 'www.bertandmay.com', pricing: 'per box' },
];

export interface TileRequirement {
  id?: string;
  name: string;
  specification: string;
  size?: string;
  constraints?: Record<string, number | string>;
}

const USER_AGENT = 'FamilyHub/HomeRenoSourcing (public catalogue lookup)';
const COLOURS = ['dark grey', 'light grey', 'white', 'light', 'cream', 'beige', 'ivory', 'sand', 'taupe', 'grey', 'charcoal', 'anthracite', 'black', 'blue', 'green'];
const EFFECTS = ['marble', 'concrete', 'cement', 'stone', 'slate', 'terrazzo', 'limestone', 'travertine', 'wood'];
// Supplier colour names that shops don't use.
const COLOUR_ALIASES: Record<string, string> = { basalt: 'dark grey', caliza: 'beige', bone: 'beige' };
// Search hits that are not a wall or floor tile for a bathroom.
const NOT_A_TILE = /adhesive|grout|trim|sealant|silicone|levelling|compound|primer|outdoor|paving|slab|klinker|sample|skirting|decking|tool|vinyl|\blvt\b|laminate|click.?fit|bead|border|dado/i;
const MAX_CANDIDATES = 16;

/** Two or three short shop searches for the quote item: colour + effect, effect + material, and the size when stated. */
export function tileQueries(requirement: TileRequirement): string[] {
  let text = `${requirement.specification} ${Object.values(requirement.constraints ?? {}).join(' ')}`.toLowerCase();
  Object.entries(COLOUR_ALIASES).forEach(([from, to]) => { text = text.replace(new RegExp(`\\b${from}\\b`, 'g'), to); });
  const colour = COLOURS.find((c) => new RegExp(`\\b${c}\\b`).test(text)) ?? '';
  const effect = EFFECTS.find((e) => text.includes(e)) ?? '';
  const queries = [`${colour} ${effect}`, `${effect || colour} porcelain`];
  const length = Number(requirement.constraints?.lengthMm);
  const width = Number(requirement.constraints?.widthMm);
  if (length && width) queries.push(`${colour} ${Math.round(length / 10)}x${Math.round(width / 10)}`);
  return Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
}

/** Tile sizes written in a title or option, as [long, short] in mm: "60x60cm", "59.5 x 59.5", "600x600mm". */
export function parseTileSizes(text: string): Array<[number, number]> {
  return Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*(?:cm|mm)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(cm|mm)?/gi), (m) => {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const factor = m[3]?.toLowerCase() === 'mm' || a >= 150 ? 1 : 10;
    const sides = [Math.round(a * factor), Math.round(b * factor)].sort((x, y) => y - x);
    return [sides[0], sides[1]] as [number, number];
  });
}

export function wantedSize(requirement: TileRequirement): [number, number] | null {
  const length = Number(requirement.constraints?.lengthMm);
  const width = Number(requirement.constraints?.widthMm);
  return length && width ? ([Math.max(length, width), Math.min(length, width)] as [number, number]) : null;
}

interface ShopifyVariant { title: string; price: number; available: boolean }
interface ShopifyProduct {
  id: number;
  title: string;
  handle?: string;
  type?: string;
  tags?: string[];
  description?: string;
  featured_image?: string;
  images?: string[];
  variants: ShopifyVariant[];
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const absolute = (src: string | undefined) => (!src ? '' : src.startsWith('//') ? `https:${src}` : src);

/** The size option closest to the quote's tile size (or the first real one), never a sample or free cut. */
export function pickVariant(product: ShopifyProduct, wanted: [number, number] | null) {
  const options = product.variants.filter((variant) => !/sample|free cut/i.test(variant.title));
  if (options.length === 0) return null;
  const sizeOf = (variant: ShopifyVariant) => parseTileSizes(variant.title)[0] ?? parseTileSizes(product.title)[0] ?? null;
  const distance = (variant: ShopifyVariant) => {
    const size = sizeOf(variant);
    return wanted && size ? Math.abs(size[0] - wanted[0]) + Math.abs(size[1] - wanted[1]) : 0;
  };
  const variant = [...options].sort((a, b) => distance(a) - distance(b))[0];
  return { variant, size: sizeOf(variant), sizes: Array.from(new Set(options.flatMap((v) => parseTileSizes(v.title)).map(([a, b]) => `${a / 10}x${b / 10}cm`))) };
}

/** Turn a shop product into a sourced product, with an honest price unit. */
export function tileFromShopify(store: TileStore, product: ShopifyProduct, url: string, wanted: [number, number] | null): { product: SourcedProduct; text: string } | null {
  const picked = pickVariant(product, wanted);
  if (!picked) return null;
  const { variant, size } = picked;
  let price = variant.price / 100;
  let priceUnit: string = store.pricing;
  // One tile's price -> price per m², when the tile size is known.
  if (store.pricing === 'per tile' && size) {
    price = Math.round((price / ((size[0] / 1000) * (size[1] / 1000))) * 100) / 100;
    priceUnit = 'per m²';
  }
  const anyAvailable = product.variants.some((v) => v.available && !/sample/i.test(v.title));
  const stock: SourcingStock = anyAvailable ? 'TO_ORDER' : 'OUT_OF_STOCK';
  const description = stripHtml(product.description ?? '');
  const image = absolute(product.featured_image ?? product.images?.[0]);
  const optionLabel = variant.title === 'Default Title' ? '' : variant.title;
  return {
    product: {
      id: `${store.id}-${product.id}`,
      supplier: store.name,
      category: 'Tiles',
      name: product.title,
      size: size ? `${size[0] / 10} × ${size[1] / 10}cm` : undefined,
      url,
      imageUrl: image,
      gallery: (product.images ?? []).slice(0, 4).map(absolute),
      price,
      priceUnit,
      stock,
      stockEvidence: anyAvailable ? `Available to buy on ${store.name}` : `Shown as unavailable on ${store.name}`,
      dimensions: size ? { lengthMm: size[0], widthMm: size[1] } : {},
      components: [],
      description: description.slice(0, 420),
      ...(store.pricing === 'per tile' && size ? { note: `£${(variant.price / 100).toFixed(2)} per tile on ${store.name}.` } : {}),
      ...(store.pricing === 'per box' ? { note: `Priced per box on ${store.name}; box coverage is on the product page. Confirm how many boxes with your fitter.` } : {}),
      lastChecked: new Date().toISOString(),
    },
    text: [
      `type: ${product.type ?? ''} | tags: ${(product.tags ?? []).join(', ').slice(0, 200)}`,
      `chosen size option: ${optionLabel || 'only option'}${size ? ` (${size[0] / 10}x${size[1] / 10}cm)` : ' (size not stated)'}`,
      `other sizes: ${picked.sizes.join(', ') || 'none listed'}`,
      `description: ${description.slice(0, 400)}`,
    ].join('\n'),
  };
}

const getJson = async <T,>(url: string, fetchImpl: typeof fetch): Promise<T | null> => {
  try {
    const response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
};

/** Searches every shop, drops non-tiles and duplicates, then reads each candidate's product data. */
export async function searchUkTiles(requirement: TileRequirement, fetchImpl: typeof fetch = fetch) {
  const queries = tileQueries(requirement);
  const wanted = wantedSize(requirement);
  const hits = (await Promise.all(TILE_STORES.flatMap((store) => queries.map(async (query) => {
    const url = `https://${store.host}/search/suggest.json?q=${encodeURIComponent(query)}&resources%5Btype%5D=product&resources%5Blimit%5D=6`;
    const data = await getJson<{ resources?: { results?: { products?: Array<{ title?: string; url?: string; type?: string }> } } }>(url, fetchImpl);
    return (data?.resources?.results?.products ?? []).map((hit) => ({ store, hit }));
  })))).flat();

  const seen = new Set<string>();
  const candidates = hits.filter(({ store, hit }) => {
    if (!hit.url || !hit.title || NOT_A_TILE.test(`${hit.title} ${hit.type ?? ''}`)) return false;
    const key = `${store.host}${hit.url.split('?')[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_CANDIDATES);

  const results: Array<{ product: SourcedProduct; text: string }> = [];
  let next = 0;
  // A few product reads at a time, so a search doesn't hammer any one shop.
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < candidates.length) {
      const { store, hit } = candidates[next++];
      const url = `https://${store.host}${hit.url!.split('?')[0]}`;
      const data = await getJson<ShopifyProduct>(`${url}.js`, fetchImpl);
      const tile = data?.variants ? tileFromShopify(store, data, url, wanted) : null;
      if (tile) results.push(tile);
    }
  }));
  return { queries, results };
}

// --- AI: how close is each tile to the quote item? ---------------------------

export type TileVerdict = 'close' | 'similar' | 'not_similar';

export const tileAiModel = () => process.env.TILE_AI_MODEL || 'openai/gpt-6-luna';
export const tileAiFallbackModel = () => process.env.TILE_AI_FALLBACK_MODEL || 'z-ai/glm-5.3-flash';

const TILE_SYSTEM = `You compare tiles from UK shops against one tile item from a bathroom quote.
Decide from each candidate's own title, type, tags, size options and description only; never assume facts that are not written.
Verdicts:
- "close": same look (colour family, effect such as marble/concrete/stone, finish when stated) AND a suitable size: when the quote gives a tile size, within 20mm of it; when it gives only an area (m²), any standard format for that use (floor tiles: 30cm or more on the short side is typical; small brick or mosaic formats are "similar" at most for floors).
- If the quote also mentions a feature or accent tile, judge against the MAIN tile; a candidate in the accent colour is "similar" (a feature-tile option); say so.
- "similar": same look, but the size, finish or exact shade differs or is not stated. Say what differs.
- "not_similar": a different colour family or effect, outdoor or paving, mosaic or decor only, vinyl/LVT/laminate, or not a tile.
Reply with JSON only: {"reviews":[{"id":"...","verdict":"close|similar|not_similar","reason":"max 18 words, quote the evidence"}]}. Include every candidate exactly once.`;

export interface TileReview { verdict: TileVerdict; reason: string; model: string }

export function parseTileReviews(raw: string, ids: string[], model: string): Map<string, TileReview> {
  const reviews = new Map<string, TileReview>();
  const cleaned = raw.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return reviews;
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return reviews;
  }
  const known = new Set(ids);
  const list = Array.isArray((parsed as { reviews?: unknown })?.reviews) ? (parsed as { reviews: unknown[] }).reviews : [];
  list.forEach((item) => {
    const entry = item as { id?: unknown; verdict?: unknown; reason?: unknown };
    if (typeof entry.id !== 'string' || !known.has(entry.id) || reviews.has(entry.id)) return;
    if (entry.verdict !== 'close' && entry.verdict !== 'similar' && entry.verdict !== 'not_similar') return;
    reviews.set(entry.id, { verdict: entry.verdict, reason: typeof entry.reason === 'string' ? entry.reason.trim().slice(0, 200) : '', model });
  });
  return reviews;
}

/** A stated tile size more than 20mm off the quote's can't be "close", whatever the model said. */
export function applyTileSizeGuard(wanted: [number, number] | null, product: SourcedProduct, review: TileReview): TileReview {
  const length = Number(product.dimensions.lengthMm);
  const width = Number(product.dimensions.widthMm);
  if (review.verdict !== 'close' || !wanted || !length || !width) return review;
  if (Math.max(Math.abs(length - wanted[0]), Math.abs(width - wanted[1])) <= 20) return review;
  return { ...review, verdict: 'similar', reason: `${length / 10} × ${width / 10}cm vs the quoted ${wanted[0] / 10} × ${wanted[1] / 10}cm. ${review.reason}`.slice(0, 200) };
}

async function askTileModel(model: string, apiKey: string, prompt: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://family-hub-app.vercel.app', 'X-Title': 'Family Hub App' },
    body: JSON.stringify({ model, max_tokens: 3000, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: TILE_SYSTEM }, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'content_filter' || choice?.finish_reason === 'length') throw new Error(`Reply ${choice.finish_reason}`);
  return choice?.message?.content ?? '';
}

export async function reviewTiles(
  requirement: TileRequirement,
  results: Array<{ product: SourcedProduct; text: string }>,
  options: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<Map<string, TileReview>> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('No OpenRouter key configured');
  if (results.length === 0) return new Map();
  const prompt = [
    `Quote item: ${requirement.name}`,
    `What it is: ${requirement.specification}`,
    `Size: ${requirement.size ?? 'not stated'}`,
    `Details: ${JSON.stringify(requirement.constraints ?? {})}`,
    '',
    'Candidates:',
    ...results.flatMap(({ product, text }) => [`- id: ${product.id}`, `  title: ${product.name}`, ...text.split('\n').map((line) => `  ${line}`)]),
  ].join('\n');
  const ids = results.map(({ product }) => product.id);
  const fetchImpl = options.fetchImpl ?? fetch;
  let model = tileAiModel();
  let reviews: Map<string, TileReview>;
  try {
    reviews = parseTileReviews(await askTileModel(model, apiKey, prompt, fetchImpl), ids, model);
    if (reviews.size === 0) throw new Error('No usable verdicts');
  } catch (error) {
    // One go on a second model from a different provider.
    model = tileAiFallbackModel();
    console.warn(`Tile AI failed (${error instanceof Error ? error.message : error}); retrying on ${model}`);
    reviews = parseTileReviews(await askTileModel(model, apiKey, prompt, fetchImpl), ids, model);
  }
  const wanted = wantedSize(requirement);
  results.forEach(({ product }) => {
    const review = reviews.get(product.id);
    if (review) reviews.set(product.id, applyTileSizeGuard(wanted, product, review));
  });
  return reviews;
}

/** The tile shop a product URL belongs to, if it is one we search. */
export const tileStoreFor = (url: string) => {
  try {
    const host = new URL(url).hostname;
    return TILE_STORES.find((store) => store.host === host || store.host === `www.${host}`) ?? null;
  } catch {
    return null;
  }
};

/** Live availability for a tile shop product, from its product data. */
export async function tileShopStock(url: string, fetchImpl: typeof fetch = fetch): Promise<{ stock: SourcingStock; stockEvidence: string } | null> {
  const store = tileStoreFor(url);
  if (!store || !new URL(url).pathname.startsWith('/products/')) return null;
  const data = await getJson<ShopifyProduct>(`https://${store.host}${new URL(url).pathname}.js`, fetchImpl);
  if (!data?.variants) return null;
  const available = data.variants.some((variant) => variant.available && !/sample/i.test(variant.title));
  return available
    ? { stock: 'TO_ORDER', stockEvidence: `Available to buy on ${store.name}` }
    : { stock: 'OUT_OF_STOCK', stockEvidence: `Shown as unavailable on ${store.name}` };
}
