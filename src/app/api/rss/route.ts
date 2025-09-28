import { NextRequest, NextResponse } from 'next/server';

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid?: string;
  enclosure?: {
    url: string;
    type: string;
  };
}

// Parse RSS XML to extract items
function parseRSSXML(xmlText: string): RSSItem[] {
  try {
    // Simple RSS parsing - in production, consider using a proper XML parser
    const items: RSSItem[] = [];

    // Extract all <item> elements
    const itemMatches = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/g);

    if (!itemMatches) return items;

    for (const itemXML of itemMatches) {
      const item: RSSItem = {
        title: extractTag(itemXML, 'title') || '',
        description: extractTag(itemXML, 'description') || '',
        link: extractTag(itemXML, 'link') || '',
        pubDate: extractTag(itemXML, 'pubDate') || new Date().toISOString(),
        guid: extractTag(itemXML, 'guid') || undefined
      };

      // Extract enclosure (for images)
      const enclosureMatch = itemXML.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']([^"']+)["'][^>]*>/);
      if (enclosureMatch) {
        item.enclosure = {
          url: enclosureMatch[1],
          type: enclosureMatch[2]
        };
      }

      // Clean up description (remove HTML tags)
      item.description = item.description
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();

      if (item.title && item.link) {
        items.push(item);
      }
    }

    return items;
  } catch (error) {
    console.error('Error parsing RSS XML:', error);
    return [];
  }
}

// Extract content from XML tags
function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Family-friendly RSS sources
const TRUSTED_RSS_SOURCES = [
  'https://www.npr.org/rss/rss.php?id=1001',
  'https://www.npr.org/rss/rss.php?id=1013',
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://www.mayoclinic.org/rss/all-mayo-clinic-news',
  'https://www.parents.com/feed/',
  'https://feeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC',
  'https://www.edweek.org/rss/blogs.xml',
  'https://www.scholastic.com/teachers/rss.xml',
  'https://feeds.weather.com/weather/rss/news',
  'https://www.ajc.com/rss/',
  'https://www.11alive.com/rss',
  'https://www.espn.com/espn/rss/news',
  'https://www.pbs.org/newshour/feeds/rss/homepage'
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedUrl = searchParams.get('url');

    if (!feedUrl) {
      return NextResponse.json(
        { error: 'RSS feed URL is required' },
        { status: 400 }
      );
    }

    // Security check: Only allow trusted RSS sources
    if (!TRUSTED_RSS_SOURCES.includes(feedUrl)) {
      return NextResponse.json(
        { error: 'RSS source not allowed' },
        { status: 403 }
      );
    }

    // Fetch the RSS feed
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Family-Hub-App/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      // Cache for 30 minutes
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    const items = parseRSSXML(xmlText);

    // Return parsed RSS items
    return NextResponse.json({
      success: true,
      items: items.slice(0, 20), // Limit to 20 items
      source: feedUrl,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('RSS fetch error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch RSS feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}