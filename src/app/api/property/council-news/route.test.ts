/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('property council news', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('returns nearby official applications with plain-English status and references', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { latitude: 51.405312, longitude: -0.062353 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hits: {
            hits: [{
              _source: {
                id: 'Bromley-25_00203_FULL6',
                lpa_app_no: '25/00203/FULL6',
                valid_date: '31/01/2025',
                last_updated: '2025-04-04T20:00:27.223Z',
                application_type: 'Householder',
                site_number: '10',
                street_name: 'Marlow Road',
                postcode: 'SE20 7UY',
                description: 'Single storey rear extension',
                status: 'Application Under Consideration',
                centroid: { lat: 51.405595, lon: -0.058254 },
              },
            }],
          },
        }),
      }) as typeof fetch;

    const response = await GET(new NextRequest('http://localhost/api/property/council-news?postcode=SE20%207UA'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.news).toHaveLength(1);
    expect(payload.news[0]).toMatchObject({
      reference: '25/00203/FULL6',
      date: '2025-01-31',
      source: 'London Planning Datahub',
      status: 'Application Under Consideration',
    });
    expect(payload.news[0].summary).toMatch(/not recorded a decision/i);
    expect(payload.news[0].distanceMetres).toBeGreaterThan(0);
  });
});
