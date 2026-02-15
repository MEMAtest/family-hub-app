'use client';

import React, { useState, useEffect } from 'react';
import { NewsArticle, NewsCategory, NewsPreferences, NewsDigest, NewsAlert } from '@/types/news.types';
import { rssNewsService } from '@/services/rssNewsService';
import { NewsSettings } from './NewsSettings';
import {
  Newspaper,
  Clock,
  Bookmark,
  Share2,
  ExternalLink,
  Filter,
  Search,
  Bell,
  Settings,
  Eye,
  Heart,
  MapPin,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Users,
  Zap,
  Globe,
  Home,
  GraduationCap,
  Shield,
  Activity,
  RefreshCw,
  ChevronRight,
  BookOpen,
  Star
} from 'lucide-react';

interface NewsDashboardProps {
  articles?: NewsArticle[];
  preferences?: NewsPreferences;
  onUpdatePreferences?: (preferences: Partial<NewsPreferences>) => void;
}

const NEWS_PREFERENCES_KEY = 'familyHub_newsPreferences_v1';

const mockPreferences: NewsPreferences = {
  enabledCategories: ['general', 'local', 'family', 'education', 'safety'],
  sources: rssNewsService.getAvailableSources(),
  locationBased: true,
  location: 'Atlanta, GA',
  ageFiltering: true,
  maxArticlesPerDay: 20,
  notificationEnabled: true,
  digestFrequency: 'daily',
  keywords: ['family', 'education', 'atlanta', 'parenting'],
  blockedKeywords: ['violence', 'inappropriate']
};

const mockArticles: NewsArticle[] = [
    {
      id: '1',
      title: 'Atlanta Public Schools Announces New Family Engagement Program',
      description: 'APS launches innovative program to increase parent involvement in education with digital tools and community events.',
      content: 'Atlanta Public Schools has unveiled a comprehensive family engagement initiative...',
      url: 'https://example.com/news/aps-family-program',
      imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800',
      source: 'Atlanta Journal-Constitution',
      author: 'Sarah Johnson',
      publishedAt: '2024-01-15T10:00:00Z',
      category: 'education',
      tags: ['education', 'family', 'atlanta', 'schools'],
      isRead: false,
      isSaved: false,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'New program aims to bridge gap between home and school through technology and community involvement.'
    },
    {
      id: '2',
      title: 'Weekend Weather: Perfect for Family Outdoor Activities',
      description: 'Sunny skies and mild temperatures make this weekend ideal for parks, playgrounds, and outdoor family fun.',
      url: 'https://example.com/weather/weekend-forecast',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      source: 'Weather Channel',
      publishedAt: '2024-01-15T08:30:00Z',
      category: 'weather',
      tags: ['weather', 'weekend', 'family', 'outdoor'],
      isRead: true,
      isSaved: true,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'Clear skies and 72°F temperatures perfect for outdoor family activities this weekend.'
    },
    {
      id: '3',
      title: 'New Child Safety Features Rolling Out in Popular Apps',
      description: 'Major tech companies implement enhanced parental controls and safety measures for young users.',
      url: 'https://example.com/tech/child-safety-apps',
      imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800',
      source: 'TechCrunch',
      author: 'Michael Chen',
      publishedAt: '2024-01-14T16:45:00Z',
      category: 'safety',
      tags: ['technology', 'safety', 'children', 'parental controls'],
      isRead: false,
      isSaved: false,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'Enhanced safety features help parents monitor and protect children online.'
    },
    {
      id: '4',
      title: 'Local Community Center Offers Free Family Programming',
      description: 'New initiatives include family game nights, educational workshops, and youth sports programs.',
      url: 'https://example.com/local/community-programs',
      imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
      source: 'Atlanta Community News',
      publishedAt: '2024-01-14T12:00:00Z',
      category: 'local',
      tags: ['community', 'family', 'activities', 'free', 'atlanta'],
      isRead: false,
      isSaved: false,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'Free family programs available at local community centers throughout Atlanta.'
    },
    {
      id: '5',
      title: 'Study: Family Meals Linked to Better Academic Performance',
      description: 'Research shows children who eat regular family meals perform better in school and have stronger social skills.',
      url: 'https://example.com/health/family-meals-study',
      imageUrl: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800',
      source: 'Health & Family Magazine',
      author: 'Dr. Lisa Rodriguez',
      publishedAt: '2024-01-13T14:20:00Z',
      category: 'health',
      tags: ['family', 'health', 'education', 'research', 'meals'],
      isRead: true,
      isSaved: true,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'Regular family dinners contribute to children\'s academic success and emotional development.'
    },
    {
      id: '6',
      title: 'Youth Soccer League Registration Opens for Spring Season',
      description: 'Atlanta Youth Soccer announces registration for spring season with new age divisions and coaching programs.',
      url: 'https://example.com/sports/youth-soccer-registration',
      imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800',
      source: 'Atlanta Sports Network',
      publishedAt: '2024-01-13T11:00:00Z',
      category: 'sports',
      tags: ['sports', 'youth', 'soccer', 'registration', 'atlanta'],
      isRead: false,
      isSaved: false,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'Spring soccer registration now open for children ages 4-16 with improved coaching programs.'
    },
    {
      id: '7',
      title: 'Digital Wellness: Managing Screen Time for the Whole Family',
      description: 'Expert tips on creating healthy technology habits and balancing digital and offline activities.',
      url: 'https://example.com/wellness/family-screen-time',
      imageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
      source: 'Family Digital Wellness',
      author: 'Dr. Amanda Park',
      publishedAt: '2024-01-12T09:15:00Z',
      category: 'health',
      tags: ['technology', 'health', 'family', 'screen time', 'wellness'],
      isRead: false,
      isSaved: false,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'Practical strategies for managing family screen time and promoting digital wellness.'
    },
    {
      id: '8',
      title: 'Atlanta Traffic Alert: Construction Affects School Routes',
      description: 'Major construction on I-285 may impact morning and afternoon school commutes. Alternative routes suggested.',
      url: 'https://example.com/traffic/school-route-alert',
      imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800',
      source: 'Georgia DOT',
      publishedAt: '2024-01-12T06:00:00Z',
      category: 'local',
      tags: ['traffic', 'atlanta', 'schools', 'construction', 'commute'],
      isRead: true,
      isSaved: false,
      familyRelevant: true,
      ageAppropriate: true,
      summary: 'I-285 construction may delay school commutes; alternative routes available.'
    }
];

export const NewsDashboard: React.FC<NewsDashboardProps> = ({
  articles: initialArticles,
  preferences: initialPreferences,
  onUpdatePreferences
}) => {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles || mockArticles);
  const [preferences, setPreferences] = useState<NewsPreferences>(
    initialPreferences || mockPreferences
  );
  const [preferencesLoaded, setPreferencesLoaded] = useState(Boolean(initialPreferences));
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'digest'>('cards');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const categoryConfig = {
    general: { icon: Globe, color: 'blue', label: 'General News' },
    local: { icon: MapPin, color: 'green', label: 'Local News' },
    education: { icon: GraduationCap, color: 'purple', label: 'Education' },
    health: { icon: Activity, color: 'red', label: 'Health & Wellness' },
    safety: { icon: Shield, color: 'orange', label: 'Safety' },
    family: { icon: Users, color: 'pink', label: 'Family' },
    kids: { icon: Heart, color: 'yellow', label: 'Kids' },
    technology: { icon: Zap, color: 'indigo', label: 'Technology' },
    weather: { icon: Globe, color: 'cyan', label: 'Weather' },
    sports: { icon: Activity, color: 'teal', label: 'Sports' },
    entertainment: { icon: Star, color: 'violet', label: 'Entertainment' }
  };

  const filteredArticles = articles.filter(article => {
    if (selectedCategory !== 'all' && article.category !== selectedCategory) return false;
    if (searchTerm && !article.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !article.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (initialPreferences) return;
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(NEWS_PREFERENCES_KEY);
      if (!stored) {
        setPreferencesLoaded(true);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<NewsPreferences>;
      const availableSources = rssNewsService.getAvailableSources();
      const enabledMap = new Map(
        (Array.isArray(parsed.sources) ? parsed.sources : []).map((source: any) => [source?.id, source?.isEnabled])
      );

      setPreferences((prev) => ({
        ...prev,
        enabledCategories: Array.isArray(parsed.enabledCategories) ? (parsed.enabledCategories as NewsCategory[]) : prev.enabledCategories,
        ageFiltering: typeof parsed.ageFiltering === 'boolean' ? parsed.ageFiltering : prev.ageFiltering,
        locationBased: typeof parsed.locationBased === 'boolean' ? parsed.locationBased : prev.locationBased,
        location: typeof parsed.location === 'string' ? parsed.location : prev.location,
        maxArticlesPerDay: typeof parsed.maxArticlesPerDay === 'number' ? parsed.maxArticlesPerDay : prev.maxArticlesPerDay,
        notificationEnabled: typeof parsed.notificationEnabled === 'boolean' ? parsed.notificationEnabled : prev.notificationEnabled,
        digestFrequency: (parsed.digestFrequency as any) ?? prev.digestFrequency,
        keywords: Array.isArray(parsed.keywords) ? (parsed.keywords as string[]) : prev.keywords,
        blockedKeywords: Array.isArray(parsed.blockedKeywords) ? (parsed.blockedKeywords as string[]) : prev.blockedKeywords,
        sources: availableSources.map((source) => ({
          ...source,
          isEnabled: enabledMap.has(source.id) ? Boolean(enabledMap.get(source.id)) : source.isEnabled,
        })),
      }));
    } catch (error) {
      console.warn('Failed to load stored news preferences:', error);
    } finally {
      setPreferencesLoaded(true);
    }
  }, [initialPreferences]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(NEWS_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to persist news preferences:', error);
    }
  }, [preferences, preferencesLoaded]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Get enabled RSS sources
      const enabledSources = preferences.sources
        .filter(source => source.isEnabled)
        .map(source => source.id);

      // Fetch fresh news from RSS feeds
      const freshNews = await rssNewsService.getAllNews(enabledSources);

      // Filter based on preferences
      const filteredNews = freshNews.filter(article => {
        if (preferences.enabledCategories.length > 0 &&
            !preferences.enabledCategories.includes(article.category)) {
          return false;
        }
        if (preferences.ageFiltering && !article.ageAppropriate) {
          return false;
        }
        return true;
      }).slice(0, preferences.maxArticlesPerDay);

      setArticles(filteredNews);
    } catch (error) {
      console.error('Failed to refresh news:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!preferencesLoaded) return;
    void handleRefresh();
    // Intentional: refresh once after preferences are loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesLoaded]);

  const handleToggleSave = (articleId: string) => {
    setArticles(prev => prev.map(article =>
      article.id === articleId ? { ...article, isSaved: !article.isSaved } : article
    ));
  };

  const handleMarkAsRead = (articleId: string) => {
    setArticles(prev => prev.map(article =>
      article.id === articleId ? { ...article, isRead: true } : article
    ));
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const ArticleCard: React.FC<{ article: NewsArticle }> = ({ article }) => {
    const config = categoryConfig[article.category];
    const IconComponent = config.icon;

    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow ${
        !article.isRead ? 'border-l-4 border-l-blue-500' : ''
      }`}>
        {article.imageUrl && (
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-48 object-cover"
          />
        )}

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1 bg-${config.color}-100 rounded`}>
              <IconComponent className={`w-4 h-4 text-${config.color}-600`} />
            </div>
            <span className={`text-xs font-medium text-${config.color}-600 uppercase tracking-wide`}>
              {config.label}
            </span>
            {article.familyRelevant && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
                Family Relevant
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2 line-clamp-2">
            {article.title}
          </h3>

          <p className="text-gray-600 dark:text-slate-400 text-sm mb-4 line-clamp-3">
            {article.description}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 mb-4">
            <div className="flex items-center gap-4">
              <span className="font-medium">{article.source}</span>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{getTimeAgo(article.publishedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleSave(article.id)}
                className={`p-2 rounded-lg transition-colors ${
                  article.isSaved
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button className="p-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!article.isRead && (
                <button
                  onClick={() => handleMarkAsRead(article.id)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Mark as read
                </button>
              )}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Read more
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const stats = {
    totalArticles: articles.length,
    unreadArticles: articles.filter(a => !a.isRead).length,
    savedArticles: articles.filter(a => a.isSaved).length,
    familyRelevant: articles.filter(a => a.familyRelevant).length
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Newspaper className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Family News</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {stats.unreadArticles} unread • {stats.familyRelevant} family relevant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryConfig).map(([category, config]) => (
                <option key={category} value={category}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-slate-400">View:</span>
            <div className="flex items-center border border-gray-300 dark:border-slate-700 rounded-lg">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-sm transition-colors ${
                  viewMode === 'cards' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Total Articles</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{stats.totalArticles}</p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-200">Unread</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">{stats.unreadArticles}</p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Saved</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-1">{stats.savedArticles}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-200">Family Relevant</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{stats.familyRelevant}</p>
          </div>
        </div>

        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Newspaper className="w-16 h-16 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No News Found</h3>
            <p className="text-gray-600 dark:text-slate-400">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Check back later for the latest family-relevant news.'}
            </p>
          </div>
        )}
      </div>

      {showSettings && (
        <NewsSettings
          preferences={preferences}
          onUpdatePreferences={(newPrefs) => {
            setPreferences(prev => ({ ...prev, ...newPrefs }));
            if (onUpdatePreferences) {
              onUpdatePreferences(newPrefs);
            }
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
