import { NextRequest, NextResponse } from 'next/server';
import {
  getPropertyValuation,
  toPropertyValueEntry,
} from '@/services/propertyValuationService';

/**
 * GET /api/property/valuation
 *
 * Fetch property valuation data from Land Registry
 *
 * Query params:
 * - postcode: Required. UK postcode (e.g., "SE20 7UA")
 * - purchasePrice: Optional. Original purchase price for estimation
 * - purchaseDate: Optional. Purchase date (YYYY-MM-DD) for estimation
 * - propertyType: Optional. Filter by type (D/S/T/F/O)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = searchParams.get('postcode');
    const purchasePrice = searchParams.get('purchasePrice');
    const purchaseDate = searchParams.get('purchaseDate');
    const propertyType = searchParams.get('propertyType');

    if (!postcode) {
      return NextResponse.json(
        { error: 'Postcode is required' },
        { status: 400 }
      );
    }

    // Validate UK postcode format (basic check)
    const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode.trim())) {
      return NextResponse.json(
        { error: 'Invalid UK postcode format' },
        { status: 400 }
      );
    }

    const result = await getPropertyValuation(
      postcode,
      purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchaseDate || undefined,
      propertyType || undefined
    );

    // Generate a PropertyValueEntry if we have area stats
    const valueEntry = result.areaStats
      ? toPropertyValueEntry(result.areaStats)
      : null;

    return NextResponse.json({
      success: true,
      postcode: postcode.toUpperCase(),
      areaStatistics: result.areaStats
        ? {
            averagePrice: result.areaStats.averagePrice,
            medianPrice: result.areaStats.medianPrice,
            transactions: result.areaStats.transactions,
            priceRange: result.areaStats.priceRange,
            period: result.areaStats.period,
          }
        : null,
      estimatedValue: result.estimatedValue,
      comparableSales: result.comparables.map((sale) => ({
        address: [sale.paon, sale.street, sale.town, sale.postcode]
          .filter(Boolean)
          .join(', '),
        price: sale.price,
        date: sale.date,
        propertyType: sale.propertyType,
        newBuild: sale.newBuild,
      })),
      valueEntry,
      dataSource: 'HM Land Registry Price Paid Data',
      disclaimer:
        'This is an indicative estimate based on publicly available data. For accurate valuation, please consult a qualified surveyor or estate agent.',
    });
  } catch (error) {
    console.error('Property valuation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch valuation data' },
      { status: 500 }
    );
  }
}
