import type { SourcedProduct } from '@/types/sourcing.types';
import { inferComponentEvidence } from './productMatching';

export const STONEWATER = 'https://www.stonewaterbathrooms.com';

export const stripHtml = (value: string) => value
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();


export function isStonewaterUrl(raw: string) {
  try {
    const url = new URL(raw, STONEWATER);
    return /(^|\.)stonewaterbathrooms\.com$|(^|\.)tradebase\.com$/.test(url.hostname) && url.pathname.startsWith('/products/');
  } catch {
    return false;
  }
}

/** Product URL on the current domain, without search-tracking parameters. */
export function cleanProductUrl(raw: string) {
  return `${STONEWATER}${new URL(raw, STONEWATER).pathname}`;
}


export function productFromRecord(record: Record<string, unknown>): SourcedProduct | null {
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
    dimensions.widthMm = Number(width[1]);
  }

  const componentEvidence = inferComponentEvidence(`${name}; ${text}`);
  const components = Object.keys(componentEvidence).filter((part) => componentEvidence[part].state === 'included');

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
    componentEvidence,
    description: text.slice(0, 420),
    lastChecked: new Date().toISOString(),
  };
}
