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
