import React from 'react';
import { Newspaper, Rss, Settings, Search } from 'lucide-react';

export const NewsLanding = () => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
            <Newspaper className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Family News Hub</h1>
        <p className="text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
          Stay informed with family-friendly news from trusted sources.
          Your personalized news experience is coming soon.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Rss className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">RSS Feeds</h3>
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            Curated family-friendly news from trusted sources like NPR, BBC, and local Atlanta news.
          </p>
        </div>

        <div className="text-center p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Search className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Smart Filtering</h3>
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            Advanced filtering to show only age-appropriate and family-relevant content.
          </p>
        </div>

        <div className="text-center p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Settings className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Customizable</h3>
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            Personalize your news sources and content preferences for your family.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-center mb-3">
          <div className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded-full mr-3">
            <Newspaper className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Coming Soon</h3>
        </div>
        <p className="text-blue-800 dark:text-blue-200 mb-4">
          We're building a comprehensive news experience with:
        </p>
        <ul className="text-blue-700 dark:text-blue-300 space-y-2">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-3"></span>
            Real-time RSS feed aggregation
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-3"></span>
            Family-safe content filtering
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-3"></span>
            Personalized news categories
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-3"></span>
            Save and share family-relevant articles
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NewsLanding;