/**
 * @jest-environment node
 */
import {
  applyTileSizeGuard,
  parseTileReviews,
  parseTileSizes,
  pickVariant,
  reviewTiles,
  searchUkTiles,
  tileFromShopify,
  tileQueries,
  tileShopStock,
  TILE_STORES,
} from '../tileSearch';

const harlem = {
  id: 'tile-harlem-caliza-equivalent',
  name: 'Equivalent for Harlem Caliza',
  specification: 'Porcelanosa Harlem Caliza · matt beige concrete-effect porcelain',
  size: '59.6 × 59.6cm',
  constraints: { lengthMm: 596, widthMm: 596, colour: 'Bone', finish: 'Matt', effect: 'Concrete effect' },
};
const store = (id: string) => TILE_STORES.find((s) => s.id === id)!;
const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('tileQueries', () => {
  test('colour + effect, effect + material, and the size; supplier colour names become shop words', () => {
    expect(tileQueries(harlem)).toEqual(['beige concrete', 'concrete porcelain', 'beige 60x60']);
    expect(tileQueries({ name: 'Floor', specification: 'Topps Tiles Cemente Basalt dark grey matt porcelain floor tile', constraints: { colour: 'Basalt' } }))
      .toEqual(['dark grey cement', 'cement porcelain']);
    expect(tileQueries({ name: 'Wall tiles', specification: 'Light marble-effect wall tiles with a blue feature tile' }))
      .toEqual(['light marble', 'marble porcelain']);
  });
});

describe('parseTileSizes', () => {
  test('reads cm, mm and decimals as [long, short] mm', () => {
    expect(parseTileSizes('Mica Grey Matt Porcelain Floor Tile 60x60cm')).toEqual([[600, 600]]);
    expect(parseTileSizes('Treviso 59.5 x 59.5cm')).toEqual([[595, 595]]);
    expect(parseTileSizes('Industrial 80x40cm')).toEqual([[800, 400]]);
    expect(parseTileSizes('Slab 600x1200mm')).toEqual([[1200, 600]]);
    expect(parseTileSizes('Foundry Novo Porcelain Beige')).toEqual([]);
  });
});

const capietra = {
  id: 101,
  title: 'Dorset Porcelain Beige',
  type: 'Tiles',
  tags: ['beige'],
  description: '<p>Concrete-effect porcelain, satin.</p>',
  featured_image: '//cdn.shopify.com/dorset.jpg',
  images: ['//cdn.shopify.com/dorset.jpg'],
  variants: [
    { title: 'Beige / Dorset Porcelain Beige 60x30cm', price: 4347, available: true },
    { title: 'Beige / Dorset Porcelain Beige 59.7x59.7cm', price: 5051, available: true },
    { title: 'Beige / Dorset Porcelain Beige Full Tile Sample', price: 100, available: true },
  ],
};

describe('pickVariant / tileFromShopify', () => {
  test('chooses the size option nearest the quote, never a sample', () => {
    const picked = pickVariant(capietra, [596, 596])!;
    expect(picked.variant.title).toContain('59.7x59.7');
    expect(picked.sizes).toEqual(['60x30cm', '59.7x59.7cm']);
    expect(pickVariant({ ...capietra, variants: [capietra.variants[2]] }, null)).toBeNull();
  });

  test("Ca' Pietra prices per m²", () => {
    const { product, text } = tileFromShopify(store('capietra'), capietra, 'https://www.capietra.com/products/dorset-porcelain-beige', [596, 596])!;
    expect(product).toMatchObject({ id: 'capietra-101', supplier: "Ca' Pietra", price: 50.51, priceUnit: 'per m²', size: '59.7 × 59.7cm', stock: 'TO_ORDER', imageUrl: 'https://cdn.shopify.com/dorset.jpg' });
    expect(text).toContain('chosen size option: Beige / Dorset Porcelain Beige 59.7x59.7cm (59.7x59.7cm)');
  });

  test('Tiles Ahead: one tile at £19.22, 80x40cm, is £60.06 per m² (as its own page says)', () => {
    const { product } = tileFromShopify(store('tilesahead'), { id: 7, title: 'Industrial Concrete Effect Beige Tile 80x40cm', variants: [{ title: 'Default Title', price: 1922, available: true }] }, 'https://www.tilesahead.co.uk/products/x', null)!;
    expect(product).toMatchObject({ price: 60.06, priceUnit: 'per m²' });
    expect(product.note).toBe('£19.22 per tile on Tiles Ahead.');
  });

  test('a single tile price with no size stays per tile; box prices stay per box, flagged for the fitter', () => {
    const noSize = tileFromShopify(store('tilesahead'), { id: 8, title: 'Plain grey tile', variants: [{ title: 'Default Title', price: 500, available: true }] }, 'u', null)!;
    expect(noSize.product).toMatchObject({ price: 5, priceUnit: 'per tile' });
    const box = tileFromShopify(store('bertandmay'), { id: 9, title: 'Stonewash Cement Porcelain', variants: [{ title: 'Box', price: 6563, available: false }, { title: 'Sample', price: 100, available: true }] }, 'u', null)!;
    expect(box.product).toMatchObject({ price: 65.63, priceUnit: 'per box', stock: 'OUT_OF_STOCK' });
    expect(box.product.note).toMatch(/Confirm how many boxes/);
  });
});

describe('searchUkTiles', () => {
  test('searches every shop, drops non-tiles, samples and duplicates, and reads each product', async () => {
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('/search/suggest.json')) {
        return json({ resources: { results: { products: [
          { title: 'Dorset Porcelain Beige', url: '/products/dorset?_pos=1', type: 'Tiles' },
          { title: 'Kerakoll Silicone Colour Cement', url: '/products/silicone', type: 'Tiles' },
          { title: 'Outdoor Porcelain Slab 60x90cm', url: '/products/slab', type: 'Outdoor Tiles' },
          { title: 'ClickLux Luxury Vinyl Tiles', url: '/products/lvt', type: 'Tile' },
        ] } } });
      }
      if (url.endsWith('/products/dorset.js')) return json(capietra);
      return json(null, false);
    });
    const { queries, results } = await searchUkTiles(harlem, fetchImpl as unknown as typeof fetch);
    expect(queries).toHaveLength(3);
    // 4 shops x 3 queries
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).includes('suggest.json'))).toHaveLength(12);
    const productReads = fetchImpl.mock.calls.filter(([url]) => String(url).endsWith('.js')).map(([url]) => String(url));
    expect(productReads.every((url) => url.endsWith('/products/dorset.js'))).toBe(true);
    expect(productReads).toHaveLength(4); // one per shop, never the silicone, slab or vinyl
    expect(results.map((r) => r.product.supplier).sort()).toEqual(['Bert & May', "Ca' Pietra", 'Tiles Ahead', 'Walltiles']);
  });

  test('a shop that is down just gives nothing', async () => {
    const fetchImpl = jest.fn(async () => { throw new Error('ECONNRESET'); });
    expect((await searchUkTiles(harlem, fetchImpl as unknown as typeof fetch)).results).toEqual([]);
  });
});

describe('AI verdicts', () => {
  test('parses only known ids and verdicts, first entry wins', () => {
    const reviews = parseTileReviews('```json\n{"reviews":[{"id":"a","verdict":"close","reason":"beige 60x60"},{"id":"a","verdict":"not_similar"},{"id":"b","verdict":"great"},{"id":"zz","verdict":"close"}]}\n```', ['a', 'b'], 'm');
    expect([...reviews.keys()]).toEqual(['a']);
    expect(reviews.get('a')).toEqual({ verdict: 'close', reason: 'beige 60x60', model: 'm' });
  });

  test('size guard: a tile more than 20mm off the quoted size cannot be close', () => {
    const tile = tileFromShopify(store('tilesahead'), { id: 1, title: 'Loft Ash Porcelain Tile 30x60cm', variants: [{ title: 'Default Title', price: 611, available: true }] }, 'u', null)!.product;
    const guarded = applyTileSizeGuard([595, 595], tile, { verdict: 'close', reason: 'grey matt', model: 'm' });
    expect(guarded.verdict).toBe('similar');
    expect(guarded.reason).toMatch(/^60 × 30cm vs the quoted 59.5 × 59.5cm/);
    const near = { ...tile, dimensions: { lengthMm: 597, widthMm: 597 } };
    expect(applyTileSizeGuard([596, 596], near, { verdict: 'close', reason: '', model: 'm' }).verdict).toBe('close');
  });

  test('a refused or unusable reply moves to the fallback model once', async () => {
    const { product, text } = tileFromShopify(store('capietra'), capietra, 'u', [596, 596])!;
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(json({ choices: [{ finish_reason: 'content_filter', message: { content: '{"reviews":[{"' } }] }))
      .mockResolvedValueOnce(json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reviews: [{ id: product.id, verdict: 'close', reason: 'beige concrete 59.7cm' }] }) } }] }));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reviews = await reviewTiles(harlem, [{ product, text }], { apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).model).toBe('z-ai/glm-5.3-flash');
    expect(reviews.get(product.id)).toMatchObject({ verdict: 'close', model: 'z-ai/glm-5.3-flash' });
  });
});

describe('tileShopStock', () => {
  test('reads availability for a tile shop product, and ignores other sites', async () => {
    const fetchImpl = jest.fn(async (_url: string) => json(capietra));
    expect(await tileShopStock('https://www.capietra.com/products/dorset-porcelain-beige', fetchImpl as unknown as typeof fetch))
      .toEqual({ stock: 'TO_ORDER', stockEvidence: "Available to buy on Ca' Pietra" });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://www.capietra.com/products/dorset-porcelain-beige.js');
    expect(await tileShopStock('https://www.toppstiles.co.uk/products/x', fetchImpl as unknown as typeof fetch)).toBeNull();
  });
});
