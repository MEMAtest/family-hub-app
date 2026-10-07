import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { ProductPriceEvidence } from './stonewaterImport';

const strip = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#x([\da-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();

function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)));
  }
  const ip = address.toLowerCase();
  if (ip.startsWith('::ffff:')) return publicAddress(ip.slice('::ffff:'.length));
  return ip !== '::' && ip !== '::1' && !ip.startsWith('fc') && !ip.startsWith('fd') && !/^fe[89ab]/.test(ip) && !ip.startsWith('::ffff:127.') && !ip.startsWith('::ffff:10.') && !ip.startsWith('::ffff:192.168.');
}

export function assertPublicProductUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Enter a valid product link.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname.length > 253 || url.hostname.endsWith('.local') || url.hostname.endsWith('.localhost') || !url.hostname.includes('.')) throw new Error('Use a public HTTPS product page.');
  const hostname = url.hostname.toLowerCase();
  if (isIP(hostname)) throw new Error('Use a public website link.');
  return url;
}

export async function validatePublicProductUrl(raw: string, lookupHost = lookup) {
  const url = assertPublicProductUrl(raw);
  const hostname = url.hostname.toLowerCase();
  const addresses = await lookupHost(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error('That product link does not resolve to a public website.');
  return url;
}

function metaValue(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
    if ([attr('property'), attr('name'), attr('itemprop')].some((value) => value?.toLowerCase() === key.toLowerCase())) return strip(attr('content') ?? attr('value') ?? '');
  }
  return '';
}

function productNodes(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(productNodes);
  if (!value || typeof value !== 'object') return [];
  const item = value as Record<string, unknown>;
  const type = item['@type'];
  const own = (type === 'Product' || Array.isArray(type) && type.includes('Product')) ? [item] : [];
  return [...own, ...(['@graph', 'mainEntity', 'itemListElement'].flatMap((key) => productNodes(item[key])))];
}

function firstText(value: unknown): string {
  if (typeof value === 'string') return strip(value);
  if (Array.isArray(value)) return firstText(value[0]);
  if (value && typeof value === 'object') return firstText((value as Record<string, unknown>).url ?? (value as Record<string, unknown>).contentUrl ?? (value as Record<string, unknown>).name);
  return '';
}

function labelledVatPrices(html: string) {
  const text = strip(html.replace(/<(script|style|s|del)\b[^>]*>[\s\S]*?<\/\1>/gi, ' '));
  const prices = { gross: new Set<number>(), net: new Set<number>() };
  const amount = '(?:£|GBP)\\s*([\\d,]+(?:\\.\\d{1,2})?)';
  const label = '(inc(?:l(?:uding|usive)?)?\\.?|ex(?:cl(?:uding|usive)?)?\\.?)\\s*(?:of\\s+)?VAT';
  for (const pattern of [new RegExp(`${amount}\\s*(?:GBP\\s*)?\\(?${label}\\)?`, 'gi'), new RegExp(`${label}\\s*[:(]?\\s*${amount}`, 'gi')]) {
    for (const match of text.matchAll(pattern)) {
      const amountFirst = pattern.source.startsWith('(?:£');
      if (!amountFirst && /(?:£|GBP)\s*[\d,.]+\s*(?:GBP\s*)?$/i.test(text.slice(0, match.index))) continue;
      const value = Number(match[amountFirst ? 1 : 2].replace(/,/g, ''));
      if (Number.isFinite(value) && value >= 0 && value <= 100000) prices[/^inc/i.test(match[amountFirst ? 2 : 1]) ? 'gross' : 'net'].add(value);
    }
  }
  return prices;
}

export function parsePublicProduct(html: string, pageUrl: string, supplierTaxRule?: unknown) {
  const scripts = Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi), (match) => {
    try { return JSON.parse(match[1].replace(/<!--[\s\S]*?-->/g, '')); } catch { return null; }
  });
  const product = scripts.flatMap(productNodes)[0];
  const rawOffers = product?.offers;
  const offers = rawOffers ? (Array.isArray(rawOffers) ? rawOffers[0] : rawOffers) as Record<string, unknown> : undefined;
  const title = firstText(product?.name) || metaValue(html, 'og:title') || metaValue(html, 'twitter:title') || strip(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  if (!title) throw new Error('This page does not expose a product name. Enter the details manually.');
  const description = firstText(product?.description) || metaValue(html, 'og:description') || metaValue(html, 'description');
  let image = firstText(product?.image) || metaValue(html, 'og:image') || metaValue(html, 'twitter:image');
  try { if (image.startsWith('//')) image = `https:${image}`; else if (image) image = new URL(image, pageUrl).toString(); } catch { image = ''; }
  try { if (new URL(image).protocol !== 'https:') image = ''; } catch { image = ''; }
  const currency = String(offers?.priceCurrency ?? metaValue(html, 'product:price:currency') ?? '').toUpperCase();
  const rawPrice = offers?.price ?? offers?.lowPrice ?? metaValue(html, 'product:price:amount');
  let price = typeof rawPrice === 'number' ? rawPrice : typeof rawPrice === 'string' ? Number(rawPrice.replace(/[^\d.]/g, '')) : NaN;
  if (currency && currency !== 'GBP' || !currency && !/£/.test(`${rawPrice ?? ''} ${metaValue(html, 'product:price:amount')}`)) price = NaN;
  if (!Number.isFinite(price) || price < 0 || price > 100000) price = 0;
  let priceEvidence: ProductPriceEvidence = { basis: 'unknown', source: 'unlabelled' };
  const labelled = labelledVatPrices(html);
  if ((!currency || currency === 'GBP') && labelled.gross.size === 1) {
    price = [...labelled.gross][0];
    priceEvidence = { basis: 'inc-vat', grossPrice: price, ...(labelled.net.size === 1 ? { netPrice: [...labelled.net][0] } : {}), source: 'page-label' };
  } else if (labelled.net.size === 1 && labelled.gross.size === 0) {
    priceEvidence = { basis: 'ex-vat', netPrice: [...labelled.net][0], source: 'page-label' };
    price = 0;
  }
  // This supplier's public widget calculates the displayed gross price from a tax rule.
  // Only accept a single active, unrestricted rule; never guess a tax rate.
  if (isExtractorDualPricePage(html, pageUrl) && priceEvidence.basis !== 'inc-vat') {
    const data = supplierTaxRule as { settings?: Record<string, unknown>; rules?: Array<Record<string, unknown>> } | undefined;
    const active = Array.isArray(data?.rules) ? data.rules.filter((rule) => String(rule.status) === '1') : [];
    const rule = active.length === 1 ? active[0] : undefined;
    const rate = Number(rule?.tax_price);
    const net = priceEvidence.netPrice ?? price;
    const unrestricted = rule && ['allproducts', 'allusers', 'allcountries'].every((key) => String(rule[key]) === '1') && ['products', 'collections', 'usertags', 'countries', 'product_tags', 'vendors'].every((key) => !rule[key]);
    if (String(data?.settings?.status) === '1' && data?.settings?.shop_name === 'extractor-fan-world.myshopify.com' && rule?.shop_name === 'extractor-fan-world.myshopify.com' && unrestricted && String(rule.base_price_type) === '0' && rule.tax_price_type === 'percentage' && /^inc\s+VAT$/i.test(String(rule.text_after_taxIncluded_price)) && /^ex\s+VAT$/i.test(String(rule.text_after_taxExcluded_price)) && Number.isFinite(rate) && rate >= 0 && rate <= 100 && net > 0 && labelled.gross.size === 0) {
      const gross = Math.round(net * (1 + rate / 100) * 100) / 100;
      if (gross <= 100000) { price = gross; priceEvidence = { basis: 'inc-vat', netPrice: net, grossPrice: gross, taxRate: rate, source: 'supplier-tax-rule' }; }
    } else {
      priceEvidence = { basis: 'unknown', ...(net > 0 ? { netPrice: net } : {}), source: 'unlabelled' };
      price = 0;
    }
  }
  const sku = firstText(product?.sku).slice(0, 100);
  return { name: title.slice(0, 200), url: pageUrl, selectedVariant: 'public-page', images: image ? [image] : [], description: description.slice(0, 1000), variants: [{ id: 'public-page', name: 'Listed product', sku, price, priceEvidence, available: true, imageUrl: image }] };
}

function isExtractorDualPricePage(html: string, pageUrl: string) {
  return ['www.extractorfanworld.co.uk', 'extractorfanworld.co.uk'].includes(new URL(pageUrl).hostname) && /<script\b[^>]*src=["']https:\/\/cdn\.shopify\.com\/extensions\/[^"']+\/new-dual-price-script\.js["']/i.test(html);
}

export async function readPublicProduct(rawUrl: string, fetchImpl: typeof fetch = fetch) {
  let url = await validatePublicProductUrl(rawUrl);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetchImpl(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FamilyHubProductPreview/1.0)', Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === 3) throw new Error('This product page redirects too many times.');
      url = await validatePublicProductUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok || !response.body || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) throw new Error('This supplier page could not be read. Add the product photo and details manually.');
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 1_000_000) throw new Error('This supplier page is too large to read.'); chunks.push(part.value); } } finally { await reader.cancel(); }
    const html = Buffer.concat(chunks).toString('utf8');
    let taxRule: unknown;
    if (isExtractorDualPricePage(html, url.toString())) {
      try {
        const config = await fetchImpl('https://dual-pricing.enhancemerchants.com/api/emdpr-fetch-rules?shopName=extractor-fan-world.myshopify.com&lang=en', { redirect: 'error', signal: AbortSignal.timeout(5000), cache: 'no-store' });
        if (config.ok) {
          const text = await config.text();
          if (text.length <= 50000) taxRule = JSON.parse(text);
        }
      } catch { /* Keep the price unverified when supplier tax evidence is unavailable. */ }
    }
    return parsePublicProduct(html, url.toString(), taxRule);
  }
  throw new Error('This supplier page could not be read.');
}
