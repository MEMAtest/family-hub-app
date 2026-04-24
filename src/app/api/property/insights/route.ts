import { NextRequest, NextResponse } from 'next/server';

interface InsightLink {
  label: string;
  url: string;
}

interface PropertyInsight {
  id: string;
  label: string;
  value: string | null;
  status: 'available' | 'external' | 'unknown';
  summary: string;
  links: InsightLink[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = searchParams.get('postcode');
    const address = searchParams.get('address');

    if (!postcode) {
      return NextResponse.json({ error: 'Postcode is required' }, { status: 400 });
    }

    const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode.trim())) {
      return NextResponse.json({ error: 'Invalid UK postcode format' }, { status: 400 });
    }

    const normalizedPostcode = postcode.toUpperCase().trim();
    const encodedPostcode = encodeURIComponent(normalizedPostcode);
    const postcodeArea = normalizedPostcode.replace(/\s+/g, '').slice(0, -3);
    const addressLine = address?.split(',')[0]?.trim() || null;

    const insights: PropertyInsight[] = [
      {
        id: 'property-profile',
        label: 'Saved property profile',
        value: addressLine || normalizedPostcode,
        status: 'available',
        summary: address
          ? `Using ${address} as the in-app lookup basis for valuation, bins, and local context.`
          : 'Using the saved postcode as the in-app lookup basis.',
        links: [],
      },
      {
        id: 'valuation-inputs',
        label: 'Valuation inputs',
        value: 'Address + purchase data',
        status: 'available',
        summary: 'The valuation panel can use your saved address, purchase price, and purchase date without re-entering them.',
        links: [],
      },
      {
        id: 'council-tax',
        label: 'Council tax band',
        value: 'Bromley lookup ready',
        status: 'external',
        summary: `The app has the property address and ${postcodeArea} area. Band data still needs a source check before showing a fixed band.`,
        links: [
          { label: 'Verify Bromley council tax', url: 'https://www.bromley.gov.uk/council-tax' },
          { label: 'Verify GOV.UK band guide', url: 'https://www.gov.uk/council-tax-bands' },
        ],
      },
      {
        id: 'planning-history',
        label: 'Planning history',
        value: normalizedPostcode,
        status: 'external',
        summary: 'Local council updates are shown in-app; use source verification only when you need the official planning record.',
        links: [
          {
            label: 'Verify Bromley planning',
            url: `https://pa.bromley.gov.uk/online-applications/search.do?action=simple&searchType=Application&postcode=${encodedPostcode}`,
          },
        ],
      },
      {
        id: 'schools',
        label: 'Schools nearby',
        value: `${postcodeArea} area`,
        status: 'external',
        summary: 'The family dashboard keeps school dates in-app. Official school records can be checked only when needed.',
        links: [
          {
            label: 'Verify DfE school search',
            url: `https://www.get-information-schools.service.gov.uk/Establishments/EstablishmentSearch?SearchType=Postcode&SearchString=${encodedPostcode}`,
          },
        ],
      },
      {
        id: 'insurance-risk',
        label: 'Insurance risk',
        value: normalizedPostcode,
        status: 'external',
        summary: 'Risk checks are prepared from the saved postcode; verify live flood/crime sources before renewals.',
        links: [
          {
            label: 'Verify flood risk',
            url: `https://check-for-flooding.service.gov.uk/postcode?postcode=${encodedPostcode}`,
          },
          {
            label: 'Verify police crime map',
            url: `https://www.police.uk/pu/your-area/?postcode=${encodedPostcode}`,
          },
          {
            label: 'Verify insurance guidance',
            url: 'https://www.gov.uk/browse/housing-local-services/insurance',
          },
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      postcode: normalizedPostcode,
      insights,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Property insights error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property insights' },
      { status: 500 }
    );
  }
}
