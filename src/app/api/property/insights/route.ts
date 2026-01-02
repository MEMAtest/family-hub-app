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

    if (!postcode) {
      return NextResponse.json({ error: 'Postcode is required' }, { status: 400 });
    }

    const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode.trim())) {
      return NextResponse.json({ error: 'Invalid UK postcode format' }, { status: 400 });
    }

    const normalizedPostcode = postcode.toUpperCase().trim();
    const encodedPostcode = encodeURIComponent(normalizedPostcode);

    const insights: PropertyInsight[] = [
      {
        id: 'council-tax',
        label: 'Council tax band',
        value: null,
        status: 'external',
        summary: 'Band data must be confirmed via the council register.',
        links: [
          { label: 'Bromley council tax', url: 'https://www.bromley.gov.uk/council-tax' },
          { label: 'GOV.UK band guide', url: 'https://www.gov.uk/council-tax-bands' },
        ],
      },
      {
        id: 'planning-history',
        label: 'Planning history',
        value: null,
        status: 'external',
        summary: 'Search planning applications and decisions near this postcode.',
        links: [
          {
            label: 'Bromley planning portal',
            url: `https://pa.bromley.gov.uk/online-applications/search.do?action=simple&searchType=Application&postcode=${encodedPostcode}`,
          },
        ],
      },
      {
        id: 'schools',
        label: 'Schools nearby',
        value: null,
        status: 'external',
        summary: 'Check nearby schools, Ofsted reports, and performance data.',
        links: [
          {
            label: 'DfE school search',
            url: `https://www.get-information-schools.service.gov.uk/Establishments/EstablishmentSearch?SearchType=Postcode&SearchString=${encodedPostcode}`,
          },
        ],
      },
      {
        id: 'insurance-risk',
        label: 'Insurance risk',
        value: null,
        status: 'external',
        summary: 'Review flood and crime exposure before renewals.',
        links: [
          {
            label: 'Flood risk check',
            url: `https://check-for-flooding.service.gov.uk/postcode?postcode=${encodedPostcode}`,
          },
          {
            label: 'Police crime map',
            url: `https://www.police.uk/pu/your-area/?postcode=${encodedPostcode}`,
          },
          {
            label: 'Insurance guidance',
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
