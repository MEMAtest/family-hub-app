import { NewsArticle, NewsCategory, NewsPreferences } from '@/types/news.types';

interface NewsAPIConfig {
  apiKey?: string;
  baseUrl: string;
  provider: 'newsapi' | 'google-news' | 'rss' | 'mock';
}

class NewsService {
  private config: NewsAPIConfig;

  constructor(config: NewsAPIConfig) {
    this.config = config;
  }

  // Fetch news articles based on preferences
  async fetchNews(preferences: NewsPreferences): Promise<NewsArticle[]> {
    switch (this.config.provider) {
      case 'newsapi':
        return this.fetchFromNewsAPI(preferences);
      case 'google-news':
        return this.fetchFromGoogleNews(preferences);
      case 'rss':
        return this.fetchFromRSS(preferences);
      default:
        return this.getMockNews(preferences);
    }
  }

  // NewsAPI.org integration
  private async fetchFromNewsAPI(preferences: NewsPreferences): Promise<NewsArticle[]> {
    if (!this.config.apiKey) {
      console.warn('NewsAPI key not provided, falling back to mock data');
      return this.getMockNews(preferences);
    }

    try {
      const params = new URLSearchParams({
        apiKey: this.config.apiKey,
        language: 'en',
        pageSize: preferences.maxArticlesPerDay.toString(),
        sortBy: 'publishedAt'
      });

      // Add location-based query if enabled
      if (preferences.locationBased && preferences.location) {
        params.append('q', preferences.location);
      }

      // Add category filters
      if (preferences.enabledCategories.length > 0) {
        const categoryMapping: Record<NewsCategory, string> = {
          general: 'general',
          local: 'general',
          education: 'general',
          health: 'health',
          safety: 'general',
          family: 'general',
          kids: 'general',
          technology: 'technology',
          weather: 'general',
          sports: 'sports',
          entertainment: 'entertainment'
        };

        const apiCategories = preferences.enabledCategories
          .map(cat => categoryMapping[cat])
          .filter((cat, index, arr) => arr.indexOf(cat) === index)
          .join(',');

        params.append('category', apiCategories);
      }

      const response = await fetch(`${this.config.baseUrl}/top-headlines?${params}`);
      const data = await response.json();

      if (data.status === 'ok') {
        return this.transformNewsAPIResponse(data.articles, preferences);
      } else {
        throw new Error(data.message || 'Failed to fetch news');
      }
    } catch (error) {
      console.error('NewsAPI fetch error:', error);
      return this.getMockNews(preferences);
    }
  }

  // Google News API integration (requires different setup)
  private async fetchFromGoogleNews(preferences: NewsPreferences): Promise<NewsArticle[]> {
    // Google News API implementation would go here
    console.log('Google News API not implemented yet, using mock data');
    return this.getMockNews(preferences);
  }

  // RSS feed integration
  private async fetchFromRSS(preferences: NewsPreferences): Promise<NewsArticle[]> {
    const rssSources = [
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://www.npr.org/rss/rss.php?id=1001'
    ];

    try {
      const articles: NewsArticle[] = [];

      for (const rssUrl of rssSources) {
        // Note: In a real implementation, you'd need a CORS proxy or server-side fetching
        // const response = await fetch(`/api/rss-proxy?url=${encodeURIComponent(rssUrl)}`);
        // For now, return mock data
      }

      return this.getMockNews(preferences);
    } catch (error) {
      console.error('RSS fetch error:', error);
      return this.getMockNews(preferences);
    }
  }

  // Transform NewsAPI response to our format
  private transformNewsAPIResponse(articles: any[], preferences: NewsPreferences): NewsArticle[] {
    return articles.map((article, index) => ({
      id: `newsapi-${Date.now()}-${index}`,
      title: article.title,
      description: article.description || '',
      content: article.content,
      url: article.url,
      imageUrl: article.urlToImage,
      source: article.source.name,
      author: article.author,
      publishedAt: article.publishedAt,
      category: this.categorizeArticle(article, preferences),
      tags: this.extractTags(article),
      isRead: false,
      isSaved: false,
      familyRelevant: this.isFamilyRelevant(article, preferences),
      ageAppropriate: this.isAgeAppropriate(article, preferences),
      summary: this.generateSummary(article.description)
    }));
  }

  // Categorize article based on content
  private categorizeArticle(article: any, preferences: NewsPreferences): NewsCategory {
    const content = `${article.title} ${article.description}`.toLowerCase();

    if (content.includes('school') || content.includes('education') || content.includes('learning')) {
      return 'education';
    }
    if (content.includes('health') || content.includes('medical') || content.includes('wellness')) {
      return 'health';
    }
    if (content.includes('family') || content.includes('parent') || content.includes('child')) {
      return 'family';
    }
    if (content.includes('safety') || content.includes('security') || content.includes('emergency')) {
      return 'safety';
    }
    if (content.includes('weather') || content.includes('forecast') || content.includes('temperature')) {
      return 'weather';
    }
    if (content.includes('sports') || content.includes('game') || content.includes('team')) {
      return 'sports';
    }
    if (content.includes('tech') || content.includes('digital') || content.includes('app')) {
      return 'technology';
    }
    if (preferences.location && content.includes(preferences.location.toLowerCase())) {
      return 'local';
    }

    return 'general';
  }

  // Extract relevant tags from article
  private extractTags(article: any): string[] {
    const content = `${article.title} ${article.description}`.toLowerCase();
    const commonTags = [
      'family', 'education', 'health', 'safety', 'technology', 'weather',
      'sports', 'atlanta', 'school', 'children', 'parents', 'community'
    ];

    return commonTags.filter(tag => content.includes(tag));
  }

  // Check if article is family relevant
  private isFamilyRelevant(article: any, preferences: NewsPreferences): boolean {
    const content = `${article.title} ${article.description}`.toLowerCase();
    const familyKeywords = [
      'family', 'parent', 'child', 'school', 'education', 'safety',
      'health', 'community', 'kids', 'learning', 'development'
    ];

    return familyKeywords.some(keyword => content.includes(keyword)) ||
           preferences.keywords.some(keyword => content.includes(keyword.toLowerCase()));
  }

  // Check if article is age appropriate
  private isAgeAppropriate(article: any, preferences: NewsPreferences): boolean {
    if (!preferences.ageFiltering) return true;

    const content = `${article.title} ${article.description}`.toLowerCase();
    const inappropriateKeywords = [
      'violence', 'crime', 'death', 'inappropriate', 'adult', 'explicit'
    ];

    return !inappropriateKeywords.some(keyword => content.includes(keyword)) &&
           !preferences.blockedKeywords.some(keyword => content.includes(keyword.toLowerCase()));
  }

  // Generate article summary
  private generateSummary(description: string): string {
    if (!description) return '';

    const sentences = description.split('.').filter(s => s.trim().length > 0);
    return sentences.length > 0 ? sentences[0] + '.' : description;
  }

  // Mock news data for development/fallback
  private getMockNews(preferences: NewsPreferences): NewsArticle[] {
    const mockArticles: NewsArticle[] = [
      {
        id: 'mock-1',
        title: 'Atlanta Public Schools Announces New Family Engagement Program',
        description: 'APS launches innovative program to increase parent involvement in education with digital tools and community events.',
        url: 'https://example.com/news/aps-family-program',
        imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800',
        source: 'Atlanta Journal-Constitution',
        author: 'Sarah Johnson',
        publishedAt: new Date().toISOString(),
        category: 'education',
        tags: ['education', 'family', 'atlanta', 'schools'],
        isRead: false,
        isSaved: false,
        familyRelevant: true,
        ageAppropriate: true,
        summary: 'New program aims to bridge gap between home and school through technology.'
      },
      {
        id: 'mock-2',
        title: 'Weekend Weather Perfect for Family Outdoor Activities',
        description: 'Sunny skies and mild temperatures make this weekend ideal for parks, playgrounds, and outdoor family fun.',
        url: 'https://example.com/weather/weekend-forecast',
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        source: 'Weather Channel',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        category: 'weather',
        tags: ['weather', 'weekend', 'family', 'outdoor'],
        isRead: false,
        isSaved: false,
        familyRelevant: true,
        ageAppropriate: true,
        summary: 'Perfect weather conditions for outdoor family activities this weekend.'
      }
    ];

    // Filter based on preferences
    return mockArticles.filter(article => {
      if (preferences.enabledCategories.length > 0 &&
          !preferences.enabledCategories.includes(article.category)) {
        return false;
      }
      if (preferences.ageFiltering && !article.ageAppropriate) {
        return false;
      }
      return true;
    }).slice(0, preferences.maxArticlesPerDay);
  }

  // Get news by category
  async getNewsByCategory(category: NewsCategory, preferences: NewsPreferences): Promise<NewsArticle[]> {
    const allNews = await this.fetchNews(preferences);
    return allNews.filter(article => article.category === category);
  }

  // Search news articles
  async searchNews(query: string, preferences: NewsPreferences): Promise<NewsArticle[]> {
    const allNews = await this.fetchNews(preferences);
    const lowerQuery = query.toLowerCase();

    return allNews.filter(article =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.description.toLowerCase().includes(lowerQuery) ||
      article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

// Default service instance
export const newsService = new NewsService({
  baseUrl: 'https://newsapi.org/v2',
  provider: 'mock' // Change to 'newsapi' when you have an API key
});

// For NewsAPI.org integration, use:
// export const newsService = new NewsService({
//   baseUrl: 'https://newsapi.org/v2',
//   provider: 'newsapi',
//   apiKey: process.env.NEXT_PUBLIC_NEWS_API_KEY
// });

export default NewsService;