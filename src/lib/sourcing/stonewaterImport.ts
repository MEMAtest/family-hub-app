import { z } from 'zod';

export function stonewaterLink(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
    !['stonewaterbathrooms.com', 'www.stonewaterbathrooms.com'].includes(url.hostname) ||
    !/^\/products\/[a-z0-9-]+\/?$/.test(url.pathname)) throw new Error('Paste a Stonewater product page link.');
  const variant = url.searchParams.get('variant');
  if (variant && !/^\d+$/.test(variant)) throw new Error('Invalid product variant.');
  return { url: `https://www.stonewaterbathrooms.com${url.pathname.replace(/\/$/, '')}`, variant };
}
const imageLink = z.string().transform((value) => value.startsWith('//') ? `https:${value}` : value).refine((value) => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ['cdn.shopify.com', 'www.stonewaterbathrooms.com'].includes(url.hostname); } catch { return false; }
});
const catalogue = z.object({ title: z.string().min(1).max(200), description: z.string().max(200000).default(''), images: z.array(imageLink).max(100),
  variants: z.array(z.object({ id: z.number().int().positive(), title: z.string().max(200), sku: z.string().max(100).nullable().optional(),
    price: z.number().int().min(0).max(10000000), available: z.boolean(), featured_image: z.object({ src: imageLink }).nullable().optional() })).min(1).max(200) });
export function parseStonewaterProduct(raw: unknown, link: string) {
  const location = stonewaterLink(link);
  const data = catalogue.parse(raw);
  if (location.variant && !data.variants.some((item) => String(item.id) === location.variant)) throw new Error('This variant is no longer listed.');
  return { name: data.title, url: location.url, selectedVariant: location.variant ?? (data.variants.length === 1 ? String(data.variants[0].id) : ''),
    images: data.images.slice(0, 8), description: data.description.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 1000),
    variants: data.variants.map((item) => ({ id: String(item.id), name: item.title, sku: item.sku ?? '', price: item.price / 100, available: item.available, imageUrl: item.featured_image?.src ?? data.images[0] ?? '' })) };
}
export type ProductPriceEvidence = { basis: 'inc-vat' | 'ex-vat' | 'unknown'; netPrice?: number; grossPrice?: number; taxRate?: number; source: 'page-label' | 'supplier-tax-rule' | 'unlabelled' };
export type StonewaterDraft = Omit<ReturnType<typeof parseStonewaterProduct>, 'variants'> & {
  variants: Array<ReturnType<typeof parseStonewaterProduct>['variants'][number] & { priceEvidence?: ProductPriceEvidence }>;
};
export async function readStonewaterProduct(link: string) {
  const location = stonewaterLink(link);
  const response = await fetch(`${location.url}.js`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok || !response.body) throw new Error('Stonewater could not provide this product. You can enter it manually.');
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) { const result = await reader.read(); if (result.done) break; bytes += result.value.byteLength;
      if (bytes > 500000) throw new Error('The catalogue response is too large.'); chunks.push(result.value); }
  } finally { await reader.cancel(); }
  return parseStonewaterProduct(JSON.parse(Buffer.concat(chunks).toString('utf8')), link);
}
