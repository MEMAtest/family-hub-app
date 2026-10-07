import { parsePublicProduct, validatePublicProductUrl } from '../publicProductImport';

test('extracts a product name, GBP price and photo from public product metadata', () => {
  const html = `<html><script type="application/ld+json">{"@type":"Product","name":"Silent Extractor Fan","image":["//cdn.example.com/fan.jpg"],"sku":"FAN-1","offers":{"price":"69.99","priceCurrency":"GBP"}}</script></html>`;
  expect(parsePublicProduct(html, 'https://shop.example.com/fan')).toMatchObject({ name: 'Silent Extractor Fan', images: ['https://cdn.example.com/fan.jpg'], variants: [{ id: 'public-page', sku: 'FAN-1', price: 69.99, imageUrl: 'https://cdn.example.com/fan.jpg' }] });
});

test('uses social product metadata and leaves an unverified price for manual entry', () => {
  const html = `<meta content="Vanity unit" property="og:title"><meta property="og:image" content="/vanity.jpg"><meta property="product:price:amount" content="£350">`;
  expect(parsePublicProduct(html, 'https://shop.example.com/bath/')).toMatchObject({ name: 'Vanity unit', images: ['https://shop.example.com/vanity.jpg'], variants: [{ price: 350 }] });
  expect(parsePublicProduct('<title>Bath</title><meta property="product:price:amount" content="199">', 'https://shop.example.com/bath').variants[0].price).toBe(0);
});

test('rejects non-HTTPS, credentialed and private-network product URLs', async () => {
  const dns = jest.fn().mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
  await expect(validatePublicProductUrl('http://shop.example.com/product', dns)).rejects.toThrow('public HTTPS');
  await expect(validatePublicProductUrl('https://user@shop.example.com/product', dns)).rejects.toThrow('public HTTPS');
  await expect(validatePublicProductUrl('https://shop.example.com/product', dns)).rejects.toThrow('public website');
  expect(dns).toHaveBeenCalledTimes(1);
});

test('rejects mixed public and private DNS results', async () => {
  const dns = jest.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '::1', family: 6 }]);
  await expect(validatePublicProductUrl('https://shop.example.com/product', dns)).rejects.toThrow('public website');
});

const fanUrl = 'https://www.extractorfanworld.co.uk/products/tornado-st100dmevht-silent-dmev-continuous-running-extractor-fan-humidistat-timer';
const fanMetadata = '<script type="application/ld+json">{"@type":"Product","name":"Tornado Silent Fan","image":"https://cdn.example.com/fan.jpg","offers":{"price":"87.40","priceCurrency":"GBP"}}</script>';
const dualPriceScript = '<script src="https://cdn.shopify.com/extensions/example/custom-banners/assets/new-dual-price-script.js" defer></script>';
const taxRule = { settings: { status: 1, shop_name: 'extractor-fan-world.myshopify.com' }, rules: [{ status: 1, shop_name: 'extractor-fan-world.myshopify.com', allproducts: '1', allusers: '1', allcountries: '1', base_price_type: '0', tax_price_type: 'percentage', tax_price: '20', text_after_taxIncluded_price: 'inc VAT', text_after_taxExcluded_price: 'ex VAT' }] };

test('prefers explicit consumer gross labels over net structured metadata', () => {
  const product = parsePublicProduct(`${fanMetadata}<div><span>£104.88 GBP</span> inc VAT <span>£87.40 GBP</span> ex VAT</div>`, fanUrl);
  expect(product.variants[0]).toMatchObject({ price: 104.88, priceEvidence: { basis: 'inc-vat', grossPrice: 104.88, netPrice: 87.40, source: 'page-label' } });
});

test('supports labels before amounts, nested markup and comma-separated GBP values', () => {
  expect(parsePublicProduct(`${fanMetadata}<p>Including VAT: <strong>GBP 1,234.56</strong></p>`, fanUrl).variants[0]).toMatchObject({ price: 1234.56, priceEvidence: { basis: 'inc-vat' } });
});

test('does not infer a VAT rate from an ex-VAT price or treat unrelated VAT text as price evidence', () => {
  expect(parsePublicProduct(`${fanMetadata}<div>£87.40 ex VAT</div>`, fanUrl).variants[0]).toMatchObject({ price: 0, priceEvidence: { basis: 'ex-vat', netPrice: 87.40 } });
  expect(parsePublicProduct(`${fanMetadata}<footer>Company VAT number 123456789</footer>`, fanUrl).variants[0].priceEvidence.basis).toBe('unknown');
});

test('ignores script, stylesheet and struck-through prices; does not choose between conflicting gross amounts', () => {
  const html = `${fanMetadata}<script>const label = '£999 inc VAT';</script><style>/* £888 inc VAT */</style><s>£200 inc VAT</s><p>£104.88 inc VAT</p>`;
  expect(parsePublicProduct(html, fanUrl).variants[0].price).toBe(104.88);
  expect(parsePublicProduct(`${fanMetadata}<p>£104.88 inc VAT</p><p>£50 inc VAT</p>`, fanUrl).variants[0].priceEvidence.basis).toBe('unknown');
});

test('uses the extractor supplier widget explicit net basis and tax rule, retaining the evidence', () => {
  expect(parsePublicProduct(fanMetadata + dualPriceScript, fanUrl, taxRule).variants[0]).toMatchObject({ price: 104.88, priceEvidence: { basis: 'inc-vat', netPrice: 87.4, grossPrice: 104.88, taxRate: 20, source: 'supplier-tax-rule' } });
  const differentRate = { ...taxRule, rules: [{ ...taxRule.rules[0], tax_price: '5' }] };
  expect(parsePublicProduct(fanMetadata + dualPriceScript, fanUrl, differentRate).variants[0].price).toBe(91.77);
});

test.each([
  undefined,
  { ...taxRule, settings: { ...taxRule.settings, status: 0 } },
  { ...taxRule, rules: [{ ...taxRule.rules[0], allproducts: '0' }] },
  { ...taxRule, rules: [{ ...taxRule.rules[0], countries: 'GB' }] },
  { ...taxRule, rules: [{ ...taxRule.rules[0], tax_price: 'invalid' }] },
  { ...taxRule, rules: [taxRule.rules[0], taxRule.rules[0]] },
])('leaves widget prices unset when tax configuration is missing, restricted or ambiguous (%#)', (config) => {
  expect(parsePublicProduct(fanMetadata + dualPriceScript, fanUrl, config).variants[0]).toMatchObject({ price: 0, priceEvidence: { basis: 'unknown' } });
});

test('does not apply supplier-specific tax configuration to other websites or foreign currency', () => {
  expect(parsePublicProduct(fanMetadata + dualPriceScript, 'https://shop.example.com/fan', taxRule).variants[0]).toMatchObject({ price: 87.4, priceEvidence: { basis: 'unknown' } });
  expect(parsePublicProduct(fanMetadata.replace('GBP', 'USD') + dualPriceScript, fanUrl, taxRule).variants[0].price).toBe(0);
});
