export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  source: string;
  author?: string;
  publishedAt: string;
  category: NewsCategory;
  tags: string[];
  isRead: boolean;
  isSaved: boolean;
  relevanceScore?: number;
  familyRelevant: boolean;
  ageAppropriate: boolean;
  summary?: string;
}

export type NewsCategory =
  | 'general'
  | 'local'
  | 'education'
  | 'health'
  | 'safety'
  | 'family'
  | 'kids'
  | 'technology'
  | 'weather'
  | 'sports'
  | 'entertainment';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: NewsCategory;
  isEnabled: boolean;
  trustScore: number;
  familyFriendly: boolean;
}

export interface NewsPreferences {
  enabledCategories: NewsCategory[];
  sources: NewsSource[];
  locationBased: boolean;
  location?: string;
  ageFiltering: boolean;
  maxArticlesPerDay: number;
  notificationEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'disabled';
  keywords: string[];
  blockedKeywords: string[];
}

export interface NewsDigest {
  id: string;
  date: string;
  articles: NewsArticle[];
  summary: string;
  readTime: number;
  categories: NewsCategory[];
}

export interface NewsAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  category: NewsCategory;
  timestamp: string;
  isRead: boolean;
  actionRequired: boolean;
  relatedArticles: string[];
}

export interface NewsStats {
  totalArticlesRead: number;
  totalReadingTime: number;
  favoriteCategories: NewsCategory[];
  readingStreak: number;
  articlesThisWeek: number;
  averageReadingTime: number;
}