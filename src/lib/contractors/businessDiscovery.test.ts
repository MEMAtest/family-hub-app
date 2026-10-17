/** @jest-environment node */

jest.mock('@/lib/sourcing/publicProductImport', () => ({
  validatePublicProductUrl: async (value: string) => new URL(value),
}));

import {
  discoverBusinesses,
  discoverBusinessFromUrl,
  inferContractorSpecialty,
  parseCompaniesHouseResults,
  searchGooglePlaces,
} from './businessDiscovery';

test('infers practical household trade categories', () => {
  expect(inferContractorSpecialty('South London guttering and roof repairs')).toBe('roofer');
  expect(inferContractorSpecialty('Bathroom plumbing and shower installation')).toBe('plumber');
  expect(inferContractorSpecialty('Property maintenance and odd jobs')).toBe('handyman');
  expect(inferContractorSpecialty('Independent PCA damp and timber survey')).toBe('damp_specialist');
  expect(inferContractorSpecialty('CCTV drain survey and drainage repairs')).toBe('drainage_specialist');
});

test('reads a public company page into a source-linked candidate', async () => {
  const html = `<html><head><meta property="og:image" content="/team.jpg"></head><body>
    <script type="application/ld+json">{
      "@type":"RoofingContractor","name":"Dulwich Roof & Gutter","url":"https://trades.example/",
      "telephone":"020 7000 0000","email":"hello@trades.example","address":{"streetAddress":"1 High Street","addressLocality":"London","postalCode":"SE20 1AA"},
      "description":"Roof repairs, leadwork and guttering across South London.",
      "aggregateRating":{"ratingValue":"4.8","reviewCount":"37"}
    }</script><a href="/projects/guttering">Recent guttering projects</a></body></html>`;
  const fetchImpl = jest.fn(async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
  const result = await discoverBusinessFromUrl('https://trades.example/about', fetchImpl);
  expect(result).toMatchObject({
    name: 'Dulwich Roof & Gutter', specialty: 'roofer', phone: '020 7000 0000',
    address: '1 High Street, London, SE20 1AA', rating: 4.8, reviewCount: 37,
    imageUrl: 'https://trades.example/team.jpg',
  });
  expect(result.previousWork).toEqual([{ title: 'Recent guttering projects', url: 'https://trades.example/projects/guttering' }]);
  expect(result.evidence[0]).toMatchObject({ kind: 'website', url: 'https://trades.example/about' });
});

test('preserves a source link when the site blocks automatic reading', async () => {
  const fetchImpl = jest.fn(async () => new Response('blocked', { status: 403, headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch;
  const result = await discoverBusinesses({
    url: 'https://www.eastdulwichforum.co.uk/topic/recommended-roofers',
    specialty: 'roofer',
  }, fetchImpl);
  expect(result.providers.link).toBe('unavailable');
  expect(result.candidates[0]).toMatchObject({
    name: 'eastdulwichforum.co.uk',
    website: 'https://www.eastdulwichforum.co.uk/topic/recommended-roofers',
    specialty: 'roofer',
    matchReason: 'Link saved for review because this site prevented automatic reading.',
  });
  expect(result.candidates[0].evidence[0]).toMatchObject({ kind: 'community' });
});

test('keeps missing ratings unknown instead of inventing a zero score', async () => {
  const fetchImpl = jest.fn(async () => new Response('<html><title>Example Trade</title></html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  })) as unknown as typeof fetch;
  const result = await discoverBusinessFromUrl('https://trade.example', fetchImpl);
  expect(result.rating).toBeUndefined();
  expect(result.reviewCount).toBeUndefined();
  expect(result.evidence[0].rating).toBeUndefined();
});

test('parses Companies House matches without treating them as recommendations', () => {
  const html = `<ul><li class="type-company"><h3><a href="/company/01234567">ACME ROOFING LIMITED</a></h3>
    <p class="meta crumbtrail">01234567 - Incorporated on 1 January 2020</p><p>10 Example Road, London, SE20 1AA</p></li></ul>`;
  const result = parseCompaniesHouseResults(html, 'Acme Roofing');
  expect(result[0]).toMatchObject({ name: 'ACME ROOFING LIMITED', companyNumber: '01234567', companyStatus: 'registered', specialty: 'roofer' });
  expect(result[0].matchReason).toContain('Possible registered-company match');
  expect(result[0].evidence[0].kind).toBe('companies_house');
});

test('maps Google Places ratings to evidence without copying review text', async () => {
  const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ places: [{
    id: 'place-1', displayName: { text: 'Acme Roofing' }, formattedAddress: 'London SE20',
    internationalPhoneNumber: '+44 20 7000 0000', websiteUri: 'https://acme.example', googleMapsUri: 'https://maps.google.test/acme',
    rating: 4.7, userRatingCount: 82, businessStatus: 'OPERATIONAL', types: ['roofing_contractor'],
  }] }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
  const result = await searchGooglePlaces({ query: 'Acme', location: 'SE20', specialty: 'roofer' }, 'test-key', fetchImpl);
  expect(result[0]).toMatchObject({ name: 'Acme Roofing', rating: 4.7, reviewCount: 82, specialty: 'roofer' });
  expect(result[0].evidence[0]).toMatchObject({ kind: 'google', rating: 4.7, reviewCount: 82 });
  expect(fetchImpl).toHaveBeenCalledWith('https://places.googleapis.com/v1/places:searchText', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({
      'X-Goog-Api-Key': 'test-key',
      'X-Goog-FieldMask': expect.stringContaining('places.userRatingCount'),
    }),
    body: JSON.stringify({ textQuery: 'Acme roofer SE20', pageSize: 6, languageCode: 'en', regionCode: 'GB' }),
  }));
});
