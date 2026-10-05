import { refreshedProductDetails, savedSupplierLink } from '../productRefresh';
import type { SourcedProduct } from '@/types/sourcing.types';
import type { StonewaterDraft } from '../stonewaterImport';

const product: SourcedProduct = { id: 'manual-mirror', name: 'My mirror', supplier: 'Your shop', price: 140, url: '', imageUrl: '', dimensions: {}, components: [], stock: 'UNKNOWN', stockEvidence: 'Unconfirmed', lastChecked: '', description: 'Mirror: https://www.stonewaterbathrooms.com/products/example-mirror.' };
const draft: StonewaterDraft = { name: 'Real mirror', url: 'https://www.stonewaterbathrooms.com/products/example-mirror', selectedVariant: '10', images: ['https://cdn.shopify.com/mirror.jpg'], description: 'Width: 600mm; Height: 800mm', variants: [{ id: '10', name: 'Default Title', sku: 'M10', price: 160, available: true, imageUrl: 'https://cdn.shopify.com/mirror.jpg' }] };

test('old links in notes are recovered without allowing credentials, external sites or tracking parameters', () => {
  expect(savedSupplierLink(product)).toBe(draft.url);
  expect(savedSupplierLink({ ...product, description: '', url: `${draft.url}?_pos=2&variant=10` })).toBe(`${draft.url}?variant=10`);
  expect(savedSupplierLink({ ...product, description: '', url: 'https://stonewaterbathrooms.com.evil.example/products/mirror' })).toBeUndefined();
  expect(savedSupplierLink({ ...product, description: '', url: 'https://user:pass@www.stonewaterbathrooms.com/products/mirror' })).toBeUndefined();
});
test('refresh patches only photo, supplier metadata and explicit dimensions, retaining prices and selections', () => {
  const update = refreshedProductDetails(product, draft, '10');
  expect(update).toMatchObject({ imageUrl: draft.images[0], dimensions: { widthMm: 600, heightMm: 800 }, sku: 'M10' });
  for (const key of ['id', 'name', 'price', 'components', 'stock', 'lastChecked', 'requirementIds']) expect(update).not.toHaveProperty(key);
  expect({ ...product, ...update }.price).toBe(140);
  expect(() => refreshedProductDetails(product, draft, 'unknown')).toThrow('Choose the supplier variant');
  expect(() => refreshedProductDetails({ ...product, sku: 'OLD' }, draft, '10')).toThrow('different supplier code');
});
