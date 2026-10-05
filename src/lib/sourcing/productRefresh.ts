import type { SourcedProduct } from '@/types/sourcing.types';
import { stonewaterLink, type StonewaterDraft } from './stonewaterImport';
import { labelledDimensions } from './dimensions';

export function savedSupplierLink(product: SourcedProduct): string | undefined {
  const candidates = [product.url, ...(product.description ?? '').match(/https:\/\/[^\s<>"']+/g) ?? []];
  for (const candidate of candidates) {
    try {
      const location = stonewaterLink(candidate.replace(/[).,;]+$/, ''));
      return `${location.url}${location.variant ? `?variant=${location.variant}` : ''}`;
    } catch { /* Other suppliers remain manual options. */ }
  }
}

export function refreshedProductDetails(product: SourcedProduct, draft: StonewaterDraft, variantId: string): Partial<SourcedProduct> {
  const variant = draft.variants.find((entry) => entry.id === variantId);
  if (!variant) throw new Error('Choose the supplier variant.');
  if (product.sku && variant.sku !== product.sku) throw new Error('This variant has a different supplier code. Add it as an alternative option instead.');
  const imageUrl = variant.imageUrl || draft.images[0] || product.imageUrl;
  return {
    url: `${stonewaterLink(draft.url).url}?variant=${variant.id}`,
    supplier: 'Stonewater Bathrooms', imageUrl,
    gallery: [...new Set([imageUrl, ...draft.images].filter(Boolean))].slice(0, 8),
    sku: variant.sku || product.sku,
    dimensions: { ...product.dimensions, ...labelledDimensions(draft.description) },
    // Existing labels, prices, included parts, stock evidence and selections are user-owned.
  };
}
