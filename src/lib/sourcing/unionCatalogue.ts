import type { SourcedProduct } from '@/types/sourcing.types';

// Supplier catalogue checked 5 October 2026. Availability is not a live stock guarantee.
export const unionWcOptions: SourcedProduct[] = [
  {
    id: 'sw-14169111', name: 'Fairford Union 500mm Slimline White WC Unit',
    supplier: 'Stonewater Bathrooms', category: 'Furniture', requirementIds: ['shower-wc-unit'],
    url: 'https://www.stonewaterbathrooms.com/products/fairford-union-500mm-slimline-white-wc-unit',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14169111_-_1_24a1afdc-3f16-43bd-a2f1-80372202d0cb.jpg?v=1757929448',
    price: 298, sku: '14169111', size: '500mm wide x 255mm deep',
    dimensions: { widthMm: 500, depthMm: 255 }, specs: { Width: '500mm', Depth: '255mm', Finish: 'Gloss white' },
    components: ['wc-unit'], stock: 'UNKNOWN', stockEvidence: 'Catalogue option; check live stock before ordering.',
    note: 'Slimline option. Toilet pan, worktop and concealed cistern sold separately. Confirm depth with fitter.',
    lastChecked: '2026-10-05T00:00:00+01:00', source: 'supplier',
  },
  {
    id: 'sw-14169091', name: 'Fairford Union 500mm Full Depth White WC Unit',
    supplier: 'Stonewater Bathrooms', category: 'Furniture', requirementIds: ['shower-wc-unit'],
    url: 'https://www.stonewaterbathrooms.com/products/fairford-union-500mm-full-depth-white-wc-unit',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14169091_-_1_1_7bfe59d3-a1c9-4f56-b509-1a3da1b2286a.jpg?v=1757928803',
    price: 324, sku: '14169091', size: '500W x 864H x 355D mm',
    dimensions: { widthMm: 500, heightMm: 864, depthMm: 355 }, specs: { Width: '500mm', Height: '864mm', Depth: '355mm', Finish: 'Gloss white' },
    components: ['wc-unit'], stock: 'UNKNOWN', stockEvidence: 'Catalogue option; check live stock before ordering.',
    note: 'Full-depth alternative. Toilet pan, worktop and concealed cistern sold separately. Confirm depth with fitter.',
    lastChecked: '2026-10-05T00:00:00+01:00', source: 'supplier',
  },
];
