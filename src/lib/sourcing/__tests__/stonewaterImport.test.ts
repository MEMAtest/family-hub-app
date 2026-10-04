import { parseStonewaterProduct, stonewaterLink } from '../stonewaterImport';
const link = 'https://www.stonewaterbathrooms.com/products/test-bath';
const product = { title: 'Bath', description: '<p>Panels sold separately</p>', images: ['//cdn.shopify.com/bath.jpg'], variants: [{ id: 12, title: 'Default Title', price: 53600, available: true, sku: 'BATH' }] };
describe('Stonewater import', () => {
  it.each(['http://www.stonewaterbathrooms.com/products/bath', 'https://stonewaterbathrooms.com.evil.test/products/bath', 'https://user@stonewaterbathrooms.com/products/bath', 'https://stonewaterbathrooms.com:444/products/bath', 'https://127.0.0.1/products/bath', 'https://stonewaterbathrooms.com/products/../admin', 'https://stonewaterbathrooms.com/products/a?variant=bad'])('rejects unsafe link %s', (url) => expect(() => stonewaterLink(url)).toThrow());
  it('imports price in pounds, photos, SKU and plain text without inferring stock or included parts', () => {
    const result = parseStonewaterProduct(product, link);
    expect(result.variants[0]).toMatchObject({ price: 536, sku: 'BATH' });
    expect(result.images[0]).toBe('https://cdn.shopify.com/bath.jpg');
    expect(result.description).toBe('Panels sold separately');
    expect(result.selectedVariant).toBe('12');
  });
  it('requires a choice for multiple variants and honours a linked variant', () => {
    const data = { ...product, variants: [...product.variants, { ...product.variants[0], id: 13, title: 'Right hand', price: 55000 }] };
    expect(parseStonewaterProduct(data, link).selectedVariant).toBe('');
    expect(parseStonewaterProduct(data, `${link}?variant=13`).selectedVariant).toBe('13');
    expect(() => parseStonewaterProduct(data, `${link}?variant=99`)).toThrow();
  });
  it('rejects missing and invalid prices rather than silently using zero', () => {
    expect(() => parseStonewaterProduct({ ...product, variants: [{ id: 1, title: 'Bath', available: true }] }, link)).toThrow();
    expect(() => parseStonewaterProduct({ ...product, images: ['https://evil.test/image'] }, link)).toThrow();
  });
});
