import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/property/council-news
 *
 * Fetches local council news and updates for a given postcode area.
 * Sources:
 * - Bromley Council website
 * - Planning portal
 * - Roadworks notifications
 *
 * Query params:
 * - postcode: Required. UK postcode (e.g., "SE20 7UA")
 * - categories: Optional. Comma-separated list of categories to filter
 */

interface CouncilNewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: 'planning' | 'roadworks' | 'events' | 'services' | 'general';
  url?: string;
  priority: 'low' | 'medium' | 'high';
  source: string;
}

// Bromley Council RSS/API endpoints
const BROMLEY_SOURCES = {
  news: 'https://www.bromley.gov.uk/news',
  planning: 'https://pa.bromley.gov.uk/online-applications/',
  roadworks: 'https://one.network/',
};

/**
 * Fetch planning applications near a postcode
 * Note: In production, this would use the Planning Portal API
 */
async function fetchPlanningNews(postcode: string): Promise<CouncilNewsItem[]> {
  // The Planning Portal doesn't have a simple public API
  // In production, you'd use their API or scrape the results page
  // For now, return placeholder data based on the postcode

  const postcodeArea = postcode.split(' ')[0];

  // Mock data - in production, fetch from planning portal
  return [
    {
      id: `planning-${postcodeArea}-1`,
      title: `Planning Applications in ${postcodeArea}`,
      summary: `View current planning applications within 500m of ${postcode}. Check for extensions, new builds, and change of use applications that may affect your area.`,
      date: new Date().toISOString().split('T')[0],
      category: 'planning',
      url: `${BROMLEY_SOURCES.planning}search.do?action=simple&searchType=Application&postcode=${encodeURIComponent(postcode)}`,
      priority: 'medium',
      source: 'Bromley Planning Portal',
    },
  ];
}

/**
 * Fetch roadworks information near a postcode
 * Uses the one.network API (national roadworks data)
 */
async function fetchRoadworksNews(postcode: string): Promise<CouncilNewsItem[]> {
  // one.network provides roadworks data
  // In production, use their API with postcode lookup

  return [
    {
      id: `roadworks-${postcode.replace(/\s/g, '')}-1`,
      title: 'Check Local Roadworks',
      summary: `View planned and current roadworks in the ${postcode} area. Includes utility works, resurfacing, and traffic management information.`,
      date: new Date().toISOString().split('T')[0],
      category: 'roadworks',
      url: `${BROMLEY_SOURCES.roadworks}?postcode=${encodeURIComponent(postcode)}`,
      priority: 'medium',
      source: 'one.network',
    },
  ];
}

/**
 * Fetch general council news
 * Note: Bromley Council doesn't have a public API for news
 * In production, you'd parse their RSS feed or scrape the news page
 */
async function fetchCouncilNews(): Promise<CouncilNewsItem[]> {
  // In production, fetch and parse Bromley Council RSS/news
  // For now, return useful static links

  return [
    {
      id: 'bromley-council-tax',
      title: 'Council Tax Information',
      summary: 'View your council tax band, payment options, and any discounts you may be eligible for.',
      date: new Date().toISOString().split('T')[0],
      category: 'services',
      url: 'https://www.bromley.gov.uk/council-tax',
      priority: 'low',
      source: 'Bromley Council',
    },
    {
      id: 'bromley-waste',
      title: 'Waste Collection & Recycling',
      summary: 'Check your bin collection days, report missed collections, and find recycling information.',
      date: new Date().toISOString().split('T')[0],
      category: 'services',
      url: 'https://www.bromley.gov.uk/waste-recycling',
      priority: 'low',
      source: 'Bromley Council',
    },
    {
      id: 'bromley-parking',
      title: 'Parking Permits & Restrictions',
      summary: 'Apply for resident parking permits, view parking zones, and check restrictions in your area.',
      date: new Date().toISOString().split('T')[0],
      category: 'services',
      url: 'https://www.bromley.gov.uk/parking',
      priority: 'low',
      source: 'Bromley Council',
    },
  ];
}

/**
 * Fetch environment/flood alerts for an area
 */
async function fetchEnvironmentAlerts(postcode: string): Promise<CouncilNewsItem[]> {
  // Environment Agency flood alerts API
  // In production, use: https://environment.data.gov.uk/flood-monitoring/

  return [
    {
      id: 'env-flood-check',
      title: 'Flood Risk Information',
      summary: `Check flood risk and alerts for ${postcode}. View current warnings and long-term flood risk assessment.`,
      date: new Date().toISOString().split('T')[0],
      category: 'general',
      url: `https://check-for-flooding.service.gov.uk/postcode?postcode=${encodeURIComponent(postcode)}`,
      priority: 'medium',
      source: 'Environment Agency',
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postcode = searchParams.get('postcode');
    const categoriesParam = searchParams.get('categories');

    if (!postcode) {
      return NextResponse.json(
        { error: 'Postcode is required' },
        { status: 400 }
      );
    }

    // Validate UK postcode format
    const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode.trim())) {
      return NextResponse.json(
        { error: 'Invalid UK postcode format' },
        { status: 400 }
      );
    }

    // Determine council based on postcode
    // SE20 is in Bromley
    const normalizedPostcode = postcode.toUpperCase();
    const council = normalizedPostcode.startsWith('SE20') ||
                    normalizedPostcode.startsWith('BR') ||
                    normalizedPostcode.startsWith('SE') &&
                    ['SE6', 'SE9', 'SE12', 'SE20', 'SE26'].some(p => normalizedPostcode.startsWith(p))
      ? 'Bromley'
      : 'Unknown';

    // Fetch news from all sources in parallel
    const [planningNews, roadworksNews, councilNews, envAlerts] = await Promise.all([
      fetchPlanningNews(postcode),
      fetchRoadworksNews(postcode),
      fetchCouncilNews(),
      fetchEnvironmentAlerts(postcode),
    ]);

    let allNews: CouncilNewsItem[] = [
      ...planningNews,
      ...roadworksNews,
      ...councilNews,
      ...envAlerts,
    ];

    // Filter by categories if specified
    if (categoriesParam) {
      const categories = categoriesParam.split(',').map(c => c.trim().toLowerCase());
      allNews = allNews.filter(item => categories.includes(item.category));
    }

    // Sort by priority (high first) then date
    allNews.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return NextResponse.json({
      success: true,
      postcode: normalizedPostcode,
      council,
      newsCount: allNews.length,
      news: allNews,
      sources: {
        council: BROMLEY_SOURCES.news,
        planning: BROMLEY_SOURCES.planning,
        roadworks: BROMLEY_SOURCES.roadworks,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Council news fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch council news' },
      { status: 500 }
    );
  }
}
