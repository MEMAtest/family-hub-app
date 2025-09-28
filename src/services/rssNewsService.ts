import { NewsArticle, NewsCategory, NewsSource } from '@/types/news.types';

interface RSSFeed {
  url: string;
  name: string;
  category: NewsCategory;
  familyFriendly: boolean;
  trustScore: number;
  local?: boolean;
}

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category?: string;
  enclosure?: {
    url: string;
    type: string;
  };
  guid?: string;
}

class RSSNewsService {
  private defaultFeeds: RSSFeed[] = [
    // National News - Family Friendly
    {
      url: 'https://www.npr.org/rss/rss.php?id=1001',
      name: 'NPR News',
      category: 'general',
      familyFriendly: true,
      trustScore: 95
    },
    {
      url: 'https://feeds.bbci.co.uk/news/rss.xml',
      name: 'BBC News',
      category: 'general',
      familyFriendly: true,
      trustScore: 90
    },
    {
      url: 'https://www.npr.org/rss/rss.php?id=1013',
      name: 'NPR Education',
      category: 'education',
      familyFriendly: true,
      trustScore: 95
    },

    // Health & Family
    {
      url: 'https://www.mayoclinic.org/rss/all-mayo-clinic-news',
      name: 'Mayo Clinic Health News',
      category: 'health',
      familyFriendly: true,
      trustScore: 98
    },
    {
      url: 'https://www.parents.com/feed/',
      name: 'Parents Magazine',
      category: 'family',
      familyFriendly: true,
      trustScore: 85
    },
    {
      url: 'https://feeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC',
      name: 'WebMD Health News',
      category: 'health',
      familyFriendly: true,
      trustScore: 80
    },

    // Education
    {
      url: 'https://www.edweek.org/rss/blogs.xml',
      name: 'Education Week',
      category: 'education',
      familyFriendly: true,
      trustScore: 90
    },
    {
      url: 'https://www.scholastic.com/teachers/rss.xml',
      name: 'Scholastic Teachers',
      category: 'education',
      familyFriendly: true,
      trustScore: 95
    },

    // Technology - Family Safe
    {
      url: 'https://www.commonsensemedia.org/rss.xml',
      name: 'Common Sense Media',
      category: 'technology',
      familyFriendly: true,
      trustScore: 90
    },

    // Weather
    {
      url: 'https://feeds.weather.com/weather/rss/news',
      name: 'Weather Channel News',
      category: 'weather',
      familyFriendly: true,
      trustScore: 85
    },

    // Local Atlanta News
    {
      url: 'https://www.ajc.com/rss/',
      name: 'Atlanta Journal-Constitution',
      category: 'local',
      familyFriendly: true,
      trustScore: 80,
      local: true
    },
    {
      url: 'https://www.11alive.com/rss',
      name: '11Alive Atlanta',
      category: 'local',
      familyFriendly: true,
      trustScore: 75,
      local: true
    },

    // Sports - Family Friendly
    {
      url: 'https://www.espn.com/espn/rss/news',
      name: 'ESPN News',
      category: 'sports',
      familyFriendly: true,
      trustScore: 75
    },

    // Kids & Entertainment
    {
      url: 'https://www.nickjr.com/rss.xml',
      name: 'Nick Jr.',
      category: 'kids',
      familyFriendly: true,
      trustScore: 85
    },
    {
      url: 'https://www.pbs.org/newshour/feeds/rss/homepage',
      name: 'PBS NewsHour',
      category: 'general',
      familyFriendly: true,
      trustScore: 95
    }
  ];

  private cache: Map<string, { data: RSSItem[]; timestamp: number }> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  // Fetch RSS feed through our API endpoint
  async fetchRSSFeed(feedUrl: string): Promise<RSSItem[]> {
    try {
      // Check cache first
      const cached = this.cache.get(feedUrl);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.data;
      }

      // Call our API endpoint to fetch RSS
      const response = await fetch(`/api/rss?url=${encodeURIComponent(feedUrl)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.items) {
        // Transform API response to our RSSItem format
        const rssItems: RSSItem[] = data.items.map((item: any) => ({
          title: item.title || '',
          description: item.description || '',
          link: item.link || '',
          pubDate: item.pubDate || new Date().toISOString(),
          source: this.defaultFeeds.find(f => f.url === feedUrl)?.name || 'Unknown',
          enclosure: item.enclosure
        }));

        // Cache the results
        this.cache.set(feedUrl, {
          data: rssItems,
          timestamp: Date.now()
        });

        return rssItems;
      } else {
        throw new Error(data.error || 'Failed to fetch RSS data');
      }
    } catch (error) {
      console.error('Error fetching RSS feed:', error);

      // Fallback to mock data if API fails
      const mockRSSData = this.getMockRSSData(feedUrl);

      // Cache the mock data with shorter timeout
      this.cache.set(feedUrl, {
        data: mockRSSData,
        timestamp: Date.now() - (this.cacheTimeout / 2) // Shorter cache for fallback data
      });

      return mockRSSData;
    }
  }

  // Get all news from enabled RSS feeds
  async getAllNews(enabledSources?: string[]): Promise<NewsArticle[]> {
    const feedsToFetch = enabledSources
      ? this.defaultFeeds.filter(feed => enabledSources.includes(feed.url))
      : this.defaultFeeds;

    const allArticles: NewsArticle[] = [];

    for (const feed of feedsToFetch) {
      try {
        const rssItems = await this.fetchRSSFeed(feed.url);
        const articles = this.transformRSSItems(rssItems, feed);
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Error fetching from ${feed.name}:`, error);
      }
    }

    // Sort by publication date (newest first)
    return allArticles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  // Transform RSS items to our NewsArticle format
  private transformRSSItems(rssItems: RSSItem[], feed: RSSFeed): NewsArticle[] {
    return rssItems.map((item, index) => ({
      id: `rss-${feed.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${index}`,
      title: item.title,
      description: item.description || '',
      url: item.link,
      imageUrl: item.enclosure?.url,
      source: feed.name,
      publishedAt: item.pubDate,
      category: feed.category,
      tags: this.extractTagsFromContent(item.title + ' ' + item.description),
      isRead: false,
      isSaved: false,
      familyRelevant: this.isFamilyRelevant(item, feed),
      ageAppropriate: feed.familyFriendly,
      summary: this.generateSummary(item.description || item.title)
    }));
  }

  // Extract relevant tags from article content
  private extractTagsFromContent(content: string): string[] {
    const lowerContent = content.toLowerCase();
    const allTags = [
      'family', 'education', 'health', 'safety', 'technology', 'weather',
      'sports', 'atlanta', 'school', 'children', 'parents', 'community',
      'kids', 'learning', 'parenting', 'nutrition', 'exercise', 'science',
      'reading', 'math', 'activities', 'fun', 'weekend', 'holiday'
    ];

    return allTags.filter(tag => lowerContent.includes(tag));
  }

  // Check if article is family relevant
  private isFamilyRelevant(item: RSSItem, feed: RSSFeed): boolean {
    if (feed.category === 'family' || feed.category === 'kids' || feed.category === 'education') {
      return true;
    }

    const content = (item.title + ' ' + item.description).toLowerCase();
    const familyKeywords = [
      'family', 'parent', 'child', 'school', 'education', 'kid',
      'learning', 'parenting', 'children', 'student', 'teacher'
    ];

    return familyKeywords.some(keyword => content.includes(keyword));
  }

  // Generate article summary
  private generateSummary(text: string): string {
    if (!text) return '';

    // Remove HTML tags
    const cleanText = text.replace(/<[^>]*>/g, '');

    // Get first sentence or first 150 characters
    const sentences = cleanText.split('.').filter(s => s.trim().length > 0);
    if (sentences.length > 0 && sentences[0].length < 150) {
      return sentences[0] + '.';
    }

    return cleanText.substring(0, 150) + (cleanText.length > 150 ? '...' : '');
  }

  // Get available RSS sources
  getAvailableSources(): NewsSource[] {
    return this.defaultFeeds.map(feed => ({
      id: feed.url,
      name: feed.name,
      url: feed.url,
      category: feed.category,
      isEnabled: true,
      trustScore: feed.trustScore,
      familyFriendly: feed.familyFriendly
    }));
  }

  // Get news by category
  async getNewsByCategory(category: NewsCategory): Promise<NewsArticle[]> {
    const categoryFeeds = this.defaultFeeds.filter(feed => feed.category === category);
    const articles: NewsArticle[] = [];

    for (const feed of categoryFeeds) {
      const rssItems = await this.fetchRSSFeed(feed.url);
      const feedArticles = this.transformRSSItems(rssItems, feed);
      articles.push(...feedArticles);
    }

    return articles.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  // Mock RSS data for development (simulates what real RSS feeds would return)
  private getMockRSSData(feedUrl: string): RSSItem[] {
    const feed = this.defaultFeeds.find(f => f.url === feedUrl);
    if (!feed) return [];

    const mockItems: Record<string, RSSItem[]> = {
      'https://www.npr.org/rss/rss.php?id=1013': [
        {
          title: 'New Study Shows Benefits of Family Reading Time',
          description: 'Research indicates that families who read together show improved academic performance and stronger family bonds.',
          link: 'https://example.com/family-reading-study',
          pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          source: 'NPR Education',
          enclosure: {
            url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
            type: 'image/jpeg'
          }
        }
      ],
      'https://www.mayoclinic.org/rss/all-mayo-clinic-news': [
        {
          title: 'Healthy Family Meal Planning: Tips for Busy Parents',
          description: 'Expert nutritionists share strategies for planning nutritious meals that work for the whole family.',
          link: 'https://example.com/healthy-family-meals',
          pubDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          source: 'Mayo Clinic',
          enclosure: {
            url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
            type: 'image/jpeg'
          }
        }
      ],
      'https://www.ajc.com/rss/': [
        {
          title: 'Atlanta Public Schools Announces Summer Reading Program',
          description: 'Free summer reading initiative launches across Atlanta to support student learning during break.',
          link: 'https://example.com/atlanta-summer-reading',
          pubDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          source: 'Atlanta Journal-Constitution',
          enclosure: {
            url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
            type: 'image/jpeg'
          }
        }
      ],
      'https://feeds.weather.com/weather/rss/news': [
        {
          title: 'Perfect Weather This Weekend for Family Outdoor Activities',
          description: 'Sunny skies and mild temperatures make this weekend ideal for parks and outdoor family fun.',
          link: 'https://example.com/weekend-weather',
          pubDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          source: 'Weather Channel',
          enclosure: {
            url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
            type: 'image/jpeg'
          }
        }
      ]
    };

    return mockItems[feedUrl] || [
      {
        title: `Sample Article from ${feed.name}`,
        description: `This is a sample article from ${feed.name} in the ${feed.category} category.`,
        link: `https://example.com/sample-${feed.category}`,
        pubDate: new Date().toISOString(),
        source: feed.name,
        enclosure: {
          url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800',
          type: 'image/jpeg'
        }
      }
    ];
  }
}

export const rssNewsService = new RSSNewsService();
export default RSSNewsService;