import { calculateAreaValuation, type PricePaidRecord } from '../propertyValuationService';

const sale = (overrides: Partial<PricePaidRecord>): PricePaidRecord => ({
  transactionId: 'tx',
  sourceUrl: 'https://landregistry.data.gov.uk/data/ppi/transaction/tx/current',
  price: 500_000,
  date: 'Mon, 01 Jun 2026',
  postcode: 'SE20 7UA',
  propertyType: 'T',
  newBuild: false,
  tenure: 'F',
  paon: '1',
  street: 'TREMAINE ROAD',
  town: 'LONDON',
  district: 'BROMLEY',
  county: 'GREATER LONDON',
  ...overrides,
});

describe('property valuation evidence', () => {
  test('retains the exact lowest and highest transactions and orders the date range chronologically', () => {
    const result = calculateAreaValuation([
      sale({ transactionId: 'latest', price: 700_000, date: 'Tue, 07 Jul 2026' }),
      sale({ transactionId: 'oldest', price: 525_000, date: 'Wed, 14 Aug 2024' }),
      sale({ transactionId: 'highest', price: 925_000, date: 'Fri, 13 Jun 2025' }),
    ], 'T');

    expect(result?.lowestSale.transactionId).toBe('oldest');
    expect(result?.highestSale.transactionId).toBe('highest');
    expect(result?.period).toEqual({ from: 'Wed, 14 Aug 2024', to: 'Tue, 07 Jul 2026' });
  });
});
