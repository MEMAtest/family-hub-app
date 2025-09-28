'use client';

import React, { useState } from 'react';
import { NewsPreferences, NewsSource, NewsCategory } from '@/types/news.types';
import { rssNewsService } from '@/services/rssNewsService';
import {
  Settings,
  Globe,
  MapPin,
  Shield,
  Bell,
  Clock,
  Users,
  X,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Star,
  Zap,
  Filter,
  Plus,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';

interface NewsSettingsProps {
  preferences: NewsPreferences;
  onUpdatePreferences: (preferences: Partial<NewsPreferences>) => void;
  onClose: () => void;
}

export const NewsSettings: React.FC<NewsSettingsProps> = ({
  preferences,
  onUpdatePreferences,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('sources');
  const [availableSources] = useState<NewsSource[]>(rssNewsService.getAvailableSources());
  const [customKeyword, setCustomKeyword] = useState('');
  const [customBlockedKeyword, setCustomBlockedKeyword] = useState('');

  const handleCategoryToggle = (category: NewsCategory) => {
    const newCategories = preferences.enabledCategories.includes(category)
      ? preferences.enabledCategories.filter(c => c !== category)
      : [...preferences.enabledCategories, category];

    onUpdatePreferences({ enabledCategories: newCategories });
  };

  const handleSourceToggle = (sourceId: string) => {
    const updatedSources = preferences.sources.map(source =>
      source.id === sourceId ? { ...source, isEnabled: !source.isEnabled } : source
    );
    onUpdatePreferences({ sources: updatedSources });
  };

  const handleAddKeyword = (type: 'keywords' | 'blockedKeywords') => {
    const keyword = type === 'keywords' ? customKeyword : customBlockedKeyword;
    if (!keyword.trim()) return;

    const currentKeywords = preferences[type] || [];
    if (!currentKeywords.includes(keyword.trim().toLowerCase())) {
      onUpdatePreferences({
        [type]: [...currentKeywords, keyword.trim().toLowerCase()]
      });
    }

    if (type === 'keywords') {
      setCustomKeyword('');
    } else {
      setCustomBlockedKeyword('');
    }
  };

  const handleRemoveKeyword = (type: 'keywords' | 'blockedKeywords', keyword: string) => {
    const currentKeywords = preferences[type] || [];
    onUpdatePreferences({
      [type]: currentKeywords.filter(k => k !== keyword)
    });
  };

  const categoryConfig = {
    general: { icon: Globe, color: 'blue', label: 'General News' },
    local: { icon: MapPin, color: 'green', label: 'Local News' },
    education: { icon: Users, color: 'purple', label: 'Education' },
    health: { icon: Shield, color: 'red', label: 'Health & Wellness' },
    safety: { icon: Shield, color: 'orange', label: 'Safety' },
    family: { icon: Users, color: 'pink', label: 'Family' },
    kids: { icon: Users, color: 'yellow', label: 'Kids' },
    technology: { icon: Zap, color: 'indigo', label: 'Technology' },
    weather: { icon: Globe, color: 'cyan', label: 'Weather' },
    sports: { icon: Star, color: 'teal', label: 'Sports' },
    entertainment: { icon: Star, color: 'violet', label: 'Entertainment' }
  };

  const tabs = [
    { id: 'sources', label: 'RSS Sources', icon: Globe },
    { id: 'categories', label: 'Categories', icon: Filter },
    { id: 'filtering', label: 'Content Filtering', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'general', label: 'General', icon: Settings }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">News Settings</h2>
                <p className="text-sm text-gray-600">Configure your family news preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-blue-600 bg-blue-50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'sources' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">RSS News Sources</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Enable or disable specific RSS news sources. All sources are family-friendly and trusted.
                </p>

                <div className="space-y-4">
                  {availableSources.map((source) => {
                    const config = categoryConfig[source.category];
                    const IconComponent = config.icon;
                    const isEnabled = preferences.sources.find(s => s.id === source.id)?.isEnabled ?? true;

                    return (
                      <div key={source.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
                            <IconComponent className={`w-5 h-5 text-${config.color}-600`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{source.name}</h4>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span className={`px-2 py-1 bg-${config.color}-100 text-${config.color}-800 rounded-full text-xs font-medium`}>
                                {config.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500" />
                                <span>{source.trustScore}% trusted</span>
                              </div>
                              {source.familyFriendly && (
                                <span className="text-green-600 text-xs font-medium">Family Friendly</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSourceToggle(source.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            isEnabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isEnabled ? (
                            <>
                              <Eye className="w-4 h-4" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Disabled
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">News Categories</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose which types of news you want to see in your family feed.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(categoryConfig).map(([category, config]) => {
                    const IconComponent = config.icon;
                    const isEnabled = preferences.enabledCategories.includes(category as NewsCategory);

                    return (
                      <div
                        key={category}
                        onClick={() => handleCategoryToggle(category as NewsCategory)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isEnabled
                            ? `border-${config.color}-300 bg-${config.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
                            <IconComponent className={`w-5 h-5 text-${config.color}-600`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{config.label}</h4>
                          </div>
                          {isEnabled && (
                            <Check className={`w-5 h-5 text-${config.color}-600`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'filtering' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Filtering</h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Age-Appropriate Filtering</h4>
                      <p className="text-sm text-gray-600">Filter out content not suitable for children</p>
                    </div>
                    <button
                      onClick={() => onUpdatePreferences({ ageFiltering: !preferences.ageFiltering })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        preferences.ageFiltering
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preferences.ageFiltering ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Location-Based News</h4>
                      <p className="text-sm text-gray-600">Show news relevant to your location</p>
                    </div>
                    <button
                      onClick={() => onUpdatePreferences({ locationBased: !preferences.locationBased })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        preferences.locationBased
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preferences.locationBased ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {preferences.locationBased && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Location
                      </label>
                      <input
                        type="text"
                        value={preferences.location || ''}
                        onChange={(e) => onUpdatePreferences({ location: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Atlanta, GA"
                      />
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Interest Keywords</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Add keywords to prioritize articles about topics you care about
                    </p>

                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={customKeyword}
                        onChange={(e) => setCustomKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword('keywords')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add keyword..."
                      />
                      <button
                        onClick={() => handleAddKeyword('keywords')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {preferences.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {keyword}
                          <button
                            onClick={() => handleRemoveKeyword('keywords', keyword)}
                            className="p-1 hover:bg-blue-200 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Blocked Keywords</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Articles containing these words will be filtered out
                    </p>

                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={customBlockedKeyword}
                        onChange={(e) => setCustomBlockedKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword('blockedKeywords')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add blocked keyword..."
                      />
                      <button
                        onClick={() => handleAddKeyword('blockedKeywords')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {preferences.blockedKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          {keyword}
                          <button
                            onClick={() => handleRemoveKeyword('blockedKeywords', keyword)}
                            className="p-1 hover:bg-red-200 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Enable Notifications</h4>
                      <p className="text-sm text-gray-600">Receive notifications for new articles</p>
                    </div>
                    <button
                      onClick={() => onUpdatePreferences({ notificationEnabled: !preferences.notificationEnabled })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        preferences.notificationEnabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preferences.notificationEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {preferences.notificationEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        News Digest Frequency
                      </label>
                      <select
                        value={preferences.digestFrequency}
                        onChange={(e) => onUpdatePreferences({ digestFrequency: e.target.value as any })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="daily">Daily Digest</option>
                        <option value="weekly">Weekly Digest</option>
                        <option value="disabled">No Digest</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Articles Per Day
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={preferences.maxArticlesPerDay}
                      onChange={(e) => onUpdatePreferences({ maxArticlesPerDay: parseInt(e.target.value) || 20 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Limit the number of articles loaded per day to avoid information overload
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">About RSS News</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This news system uses RSS feeds from trusted, family-friendly sources like NPR, BBC, Mayo Clinic, and local Atlanta news.
                      All content is automatically filtered for family appropriateness.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};