'use client'

import React, { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Target,
  Star,
  AlertCircle,
  Calendar,
  BarChart3,
  List,
  Bell,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import ShoppingListManager from './ShoppingListManager';
import ShoppingAnalytics from './ShoppingAnalytics';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useFamilyStore } from '@/store/familyStore';
import { AIShoppingSavings } from '@/types/shopping.types';
import { useShoppingContext } from '@/contexts/familyHub/ShoppingContext';

interface ShoppingDashboardProps {
  onClose?: () => void;
  onSubViewChange?: (view: string) => void;
  currentSubView?: string;
}

const ShoppingDashboard: React.FC<ShoppingDashboardProps> = ({ onClose, onSubViewChange, currentSubView }) => {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const { lists } = useShoppingContext();
  const [activeView, setActiveView] = useState<'dashboard' | 'lists' | 'analytics'>('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIShoppingSavings | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Sync with parent's subView
  React.useEffect(() => {
    if (currentSubView === '') {
      setActiveView('dashboard');
    } else if (currentSubView && ['lists', 'analytics'].includes(currentSubView)) {
      setActiveView(currentSubView as any);
    }
  }, [currentSubView]);

  // Report sub-view changes to parent
  React.useEffect(() => {
    if (onSubViewChange) {
      onSubViewChange(activeView === 'dashboard' ? '' : activeView);
    }
  }, [activeView, onSubViewChange]);

  const activeLists = useMemo(() => {
    const listArray = Array.isArray(lists) ? (lists as any[]) : [];
    return listArray.map((list) => {
      const items = Array.isArray(list?.items) ? list.items : [];
      const completedItems = items.filter((item: any) => Boolean(item?.isCompleted ?? item?.completed)).length;
      const itemCount = items.length;
      const estimatedTotal = Number(list?.estimatedTotal ?? 0);
      const scheduledDate = list?.createdAt ? new Date(list.createdAt) : new Date();
      const priority: 'high' | 'medium' | 'low' = itemCount >= 20 ? 'high' : itemCount >= 10 ? 'medium' : 'low';

      return {
        id: String(list?.id ?? ''),
        name: (list?.listName ?? list?.name ?? 'Shopping List') as string,
        store: (list?.storeChain ?? list?.customStore ?? list?.category ?? 'General') as string,
        itemCount,
        completedItems,
        estimatedTotal,
        scheduledDate,
        priority,
      };
    }).filter((list) => Boolean(list.id));
  }, [lists]);

  const weeklyStats = useMemo(() => {
    const listArray = Array.isArray(lists) ? (lists as any[]) : [];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    let totalSpent = 0;
    let listsCompleted = 0;

    listArray.forEach((list) => {
      const items = Array.isArray(list?.items) ? list.items : [];
      const completedItems = items.filter((item: any) => Boolean(item?.isCompleted ?? item?.completed));

      if (items.length > 0 && completedItems.length === items.length) {
        listsCompleted += 1;
      }

      completedItems.forEach((item: any) => {
        const price = Number(item?.estimatedPrice ?? item?.price ?? 0);
        const completedAt = item?.completedAt ? new Date(item.completedAt) : null;
        if (completedAt && !Number.isNaN(completedAt.getTime())) {
          if (completedAt >= weekStart) {
            totalSpent += price;
          }
          return;
        }

        const listCreatedAt = list?.createdAt ? new Date(list.createdAt) : null;
        if (listCreatedAt && !Number.isNaN(listCreatedAt.getTime()) && listCreatedAt >= weekStart) {
          totalSpent += price;
        }
      });
    });

    const totalSavings = listArray.reduce((sum, list) => {
      const estimated = Number(list?.estimatedTotal ?? 0);
      const actual = Number(list?.total ?? 0);
      return sum + (estimated - actual);
    }, 0);

    const avgSavings = listArray.length ? totalSavings / listArray.length : 0;

    return {
      totalSpent: Math.round(totalSpent * 100) / 100,
      budgetRemaining: 0,
      listsCompleted,
      totalLists: listArray.length,
      avgSavings: Math.round(avgSavings * 100) / 100,
      priceAlerts: 0,
    };
  }, [lists]);

  const recentActivity = useMemo(() => {
    const listArray = Array.isArray(lists) ? (lists as any[]) : [];
    const activities: Array<{
      id: string;
      type: 'list_completed' | 'price_alert' | 'item_added';
      message: string;
      timestamp: Date;
      amount?: number;
      savings?: number;
    }> = [];

    listArray.forEach((list) => {
      const listName = list?.listName ?? list?.name ?? 'Shopping List';
      const items = Array.isArray(list?.items) ? list.items : [];
      const completedItems = items.filter((item: any) => Boolean(item?.isCompleted ?? item?.completed));

      if (items.length > 0 && completedItems.length === items.length) {
        const latestCompleted = completedItems
          .map((item: any) => (item?.completedAt ? new Date(item.completedAt) : null))
          .filter((d: any): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

        const listCreatedAt = list?.createdAt ? new Date(list.createdAt) : null;
        const timestamp = latestCompleted ?? (listCreatedAt && !Number.isNaN(listCreatedAt.getTime()) ? listCreatedAt : new Date());

        activities.push({
          id: `list:${list.id}:completed`,
          type: 'list_completed',
          message: `Completed "${listName}"`,
          timestamp,
          amount: Number(list?.total ?? 0),
        });
      }

      items.forEach((item: any) => {
        const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return;
        const itemName = item?.itemName ?? item?.name ?? 'Item';
        activities.push({
          id: `item:${item.id}:added`,
          type: 'item_added',
          message: `Added "${itemName}" to "${listName}"`,
          timestamp: createdAt,
        });
      });
    });

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities.slice(0, 8);
  }, [lists]);

  const priceAlerts = useMemo(() => [] as Array<{
    id: string;
    item: string;
    currentPrice: number;
    targetPrice: number;
    store: string;
    savings: number;
    type: 'price_drop';
  }>, []);

  const handleGenerateSuggestions = async () => {
    if (!familyId) {
      alert('Family ID not available yet. Please try again.');
      return;
    }

    setIsGeneratingSuggestions(true);
    setAiError(null);

    try {
      const response = await fetch(`/api/families/${familyId}/shopping-lists/ai-optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'AI service returned an error');
      }

      setAiSuggestions(payload.optimisation);
    } catch (error) {
      console.error('Failed to generate shopping suggestions', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const quickActions = [
    {
      id: 'new-list',
      title: 'Create New List',
      description: 'Start a new shopping list',
      icon: <Plus className="w-6 h-6 text-green-500" />,
      onClick: () => setActiveView('lists')
    },
    {
      id: 'ai-optimise',
      title: 'AI Savings Suggestions',
      description: 'Optimise stores, swaps, and budget',
      icon: <TrendingUp className="w-6 h-6 text-purple-500" />,
      onClick: () => {
        if (!isGeneratingSuggestions) {
          handleGenerateSuggestions();
        }
      }
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'See trends and top items',
      icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
      onClick: () => setActiveView('analytics')
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'list_completed': return <ShoppingCart className="w-4 h-4 text-green-500" />;
      case 'price_alert': return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'item_added': return <Plus className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Mobile Header Component
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="mobile-title dark:text-slate-100">Shopping</h1>
        </div>
        <button
          onClick={() => setShowMobileMenu(true)}
          className="mobile-btn-secondary p-2"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* View Tabs - Mobile */}
      {activeView === 'dashboard' && (
        <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'lists', label: 'Lists', icon: List },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Mobile Menu Overlay Component
  const renderMobileMenu = () => {
    if (!showMobileMenu) return null;

    return (
      <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowMobileMenu(false)}>
        <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 pwa-safe-top">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Shopping Menu</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 dark:text-slate-300" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="border-b border-gray-200 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.onClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {action.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium dark:text-slate-100">{action.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">View Options</h3>
              <div className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard Overview', icon: BarChart3 },
                  { id: 'lists', label: 'Shopping Lists', icon: List },
                  { id: 'analytics', label: 'Shopping Analytics', icon: BarChart3 }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveView(id as any);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      activeView === id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className={isMobile ? 'space-y-6' : 'space-y-8'}>
      {/* Overview Stats */}
      <div className={`grid gap-4 ${
        isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>This Week</p>
              <p className={`font-bold text-gray-900 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>£{weeklyStats.totalSpent}</p>
            </div>
            <DollarSign className={`text-green-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          {!isMobile && (
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                £{weeklyStats.budgetRemaining} remaining
              </span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Lists</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">{activeLists.length}</p>
            </div>
            <List className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">
              {activeLists.reduce((acc, list) => acc + list.itemCount, 0)} total items
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Savings</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">£{weeklyStats.avgSavings}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">
              12% vs last week
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Price Alerts</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">{weeklyStats.priceAlerts}</p>
            </div>
            <Bell className="w-8 h-8 text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-red-600">
              Action required
            </span>
          </div>
        </div>
      </div>

      {/* Active Shopping Lists */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Active Shopping Lists</h2>
          <button
            onClick={() => setActiveView('lists')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage All →
          </button>
        </div>

        {activeLists.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">No active shopping lists</p>
            <button
              onClick={() => setActiveView('lists')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Create your first list →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLists.map((list) => (
              <div key={list.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900">{list.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(list.priority)}`}>
                      {list.priority}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">£{list.estimatedTotal}</p>
                    <p className="text-sm text-gray-500">{list.store}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>{list.completedItems}/{list.itemCount} items</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{list.scheduledDate.toLocaleDateString()}</span>
                    </span>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(list.completedItems / list.itemCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-slate-100">{action.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">AI Savings Suggestions</h2>
              <p className="text-sm text-gray-600">Optimise lists, stores, and swaps</p>
            </div>
            <button
              onClick={handleGenerateSuggestions}
              disabled={isGeneratingSuggestions}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                isGeneratingSuggestions ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isGeneratingSuggestions ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Working…
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" /> Refresh Tips
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Unable to get suggestions: {aiError}
            </div>
          )}

          {aiSuggestions ? (
            <div className="space-y-4 text-sm text-gray-700">
              <p>{aiSuggestions.summary}</p>

              {aiSuggestions.estimatedSavings && (aiSuggestions.estimatedSavings.weekly || aiSuggestions.estimatedSavings.monthly) && (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold">Estimated savings</p>
                    <p className="text-sm">
                      {(aiSuggestions.estimatedSavings.weekly ?? null) !== null && `Weekly: £${aiSuggestions.estimatedSavings.weekly?.toFixed(2)}`}
                      {(aiSuggestions.estimatedSavings.weekly ?? null) !== null && (aiSuggestions.estimatedSavings.monthly ?? null) !== null && ' • '}
                      {(aiSuggestions.estimatedSavings.monthly ?? null) !== null && `Monthly: £${aiSuggestions.estimatedSavings.monthly?.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              )}

              {aiSuggestions.listRecommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">List actions</h3>
                  <ul className="space-y-2">
                    {aiSuggestions.listRecommendations.map((rec, index) => (
                      <li key={`${rec.listName}-${index}`} className="border border-gray-200 rounded-lg p-3">
                        <p className="font-medium text-gray-900">{rec.listName}</p>
                        <ul className="list-disc pl-4 text-xs text-gray-600 mt-1 space-y-1">
                          {rec.actions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                        {rec.storeSuggestions && rec.storeSuggestions.length > 0 && (
                          <p className="text-xs text-purple-600 mt-2">Stores: {rec.storeSuggestions.join(', ')}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiSuggestions.substitutions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Smart swaps</h3>
                  <ul className="space-y-2 text-xs text-gray-600">
                    {aiSuggestions.substitutions.map((swap, index) => (
                      <li key={`${swap.originalItem}-${index}`} className="border border-gray-200 rounded-lg p-2">
                        <p className="font-medium text-gray-900 text-sm">{swap.originalItem} → {swap.alternative}</p>
                        <p>{swap.reason}</p>
                        {(swap.savings ?? null) !== null && (
                          <p className="text-green-600 mt-1">Est. saving £{swap.savings?.toFixed(2)}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiSuggestions.nextActions && aiSuggestions.nextActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Next steps</h3>
                  <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1">
                    {aiSuggestions.nextActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              Generate AI suggestions to see store swaps, budget tweaks, and substitution ideas tailored to your current lists.
            </div>
          )}
        </div>

        {/* Price Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Price Alerts</h2>
          </div>

          {priceAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">No price alerts</p>
              <p className="text-sm text-gray-500">Price tracking is coming soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {priceAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{alert.item}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>£{alert.currentPrice}</span>
                      <span>at {alert.store}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      Save £{alert.savings}
                    </p>
                    <p className="text-xs text-gray-500">Target: £{alert.targetPrice}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Recent Activity</h2>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No recent activity</p>
            <p className="text-sm text-gray-500 mt-1">Your shopping activity will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                </div>
                {activity.amount && (
                  <div className="text-sm font-medium text-gray-900">
                    £{activity.amount}
                  </div>
                )}
                {activity.savings && (
                  <div className="text-sm font-medium text-green-600">
                    -£{activity.savings}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 dark:bg-slate-950 min-h-screen ${isMobile ? 'pb-safe-bottom' : 'p-3 sm:p-4 md:p-6 lg:p-8'}`}>
      {/* Mobile Header */}
      {isMobile && renderMobileHeader()}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 mb-2">
                {activeView === 'dashboard' && 'Shopping Management'}
                {activeView === 'lists' && 'Shopping Lists'}
                {activeView === 'analytics' && 'Shopping Analytics'}
              </h1>
              <p className="text-gray-600">
                {activeView === 'dashboard' && 'Manage your family\'s shopping and save money'}
                {activeView === 'lists' && 'Create and manage your shopping lists'}
                {activeView === 'analytics' && 'Analyze your shopping patterns and savings'}
              </p>
            </div>

            {activeView !== 'dashboard' && (
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tabs - Desktop Only */}
      {!isMobile && activeView === 'dashboard' && (
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('lists')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <List className="w-4 h-4" />
              <span>Lists</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={isMobile ? 'px-4' : ''}>
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'lists' && <ShoppingListManager onClose={() => setActiveView('dashboard')} />}
        {activeView === 'analytics' && <ShoppingAnalytics onClose={() => setActiveView('dashboard')} />}
      </div>

      {/* Mobile Menu Overlay */}
      {renderMobileMenu()}
    </div>
  );
};

export default ShoppingDashboard;
