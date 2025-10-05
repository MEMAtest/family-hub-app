'use client'

import React, { useState, useEffect } from 'react';
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
  Settings,
  List,
  Store,
  Scan,
  Receipt,
  Bell,
  Menu,
  X
} from 'lucide-react';
import ShoppingListManager from './ShoppingListManager';
import StoreManager from './StoreManager';
import PriceTracker from './PriceTracker';
import ShoppingAnalytics from './ShoppingAnalytics';

interface ShoppingDashboardProps {
  onClose?: () => void;
  onSubViewChange?: (view: string) => void;
  currentSubView?: string;
}

const ShoppingDashboard: React.FC<ShoppingDashboardProps> = ({ onClose, onSubViewChange, currentSubView }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'lists' | 'stores' | 'prices' | 'analytics'>('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with parent's subView
  React.useEffect(() => {
    if (currentSubView === '') {
      setActiveView('dashboard');
    } else if (currentSubView && ['lists', 'stores', 'prices', 'analytics'].includes(currentSubView)) {
      setActiveView(currentSubView as any);
    }
  }, [currentSubView]);

  // Report sub-view changes to parent
  React.useEffect(() => {
    if (onSubViewChange) {
      onSubViewChange(activeView === 'dashboard' ? '' : activeView);
    }
  }, [activeView, onSubViewChange]);

  // Mock data for dashboard widgets
  const activeLists = [
    {
      id: '1',
      name: 'Weekly Groceries',
      store: 'Tesco',
      itemCount: 12,
      completedItems: 3,
      estimatedTotal: 85.50,
      scheduledDate: new Date('2024-01-15'),
      priority: 'high' as const
    },
    {
      id: '2',
      name: 'Household Items',
      store: 'ASDA',
      itemCount: 6,
      completedItems: 1,
      estimatedTotal: 45.20,
      scheduledDate: new Date('2024-01-16'),
      priority: 'medium' as const
    },
    {
      id: '3',
      name: 'School Supplies',
      store: 'WHSmith',
      itemCount: 8,
      completedItems: 0,
      estimatedTotal: 32.90,
      scheduledDate: new Date('2024-01-18'),
      priority: 'low' as const
    }
  ];

  const weeklyStats = {
    totalSpent: 127.45,
    budgetRemaining: 72.55,
    listsCompleted: 3,
    totalLists: 5,
    avgSavings: 15.30,
    priceAlerts: 2
  };

  const recentActivity = [
    {
      id: '1',
      type: 'list_completed' as const,
      message: 'Completed "Emergency Shopping" list',
      timestamp: new Date('2024-01-14T10:30:00'),
      amount: 23.45
    },
    {
      id: '2',
      type: 'price_alert' as const,
      message: 'Price drop alert: Organic Bananas at Sainsbury\'s',
      timestamp: new Date('2024-01-14T08:15:00'),
      savings: 1.20
    },
    {
      id: '3',
      type: 'item_added' as const,
      message: 'Added 5 items to "Weekly Groceries"',
      timestamp: new Date('2024-01-13T16:45:00')
    }
  ];

  const priceAlerts = [
    {
      id: '1',
      item: 'Organic Bananas',
      currentPrice: 2.80,
      targetPrice: 2.50,
      store: 'Sainsbury\'s',
      savings: 0.30,
      type: 'price_drop' as const
    },
    {
      id: '2',
      item: 'Washing Powder 2kg',
      currentPrice: 8.99,
      targetPrice: 7.50,
      store: 'Tesco',
      savings: 1.49,
      type: 'price_drop' as const
    }
  ];

  const quickActions = [
    {
      id: 'new-list',
      title: 'Create New List',
      description: 'Start a new shopping list',
      icon: <Plus className="w-6 h-6 text-green-500" />,
      onClick: () => setActiveView('lists')
    },
    {
      id: 'scan-receipt',
      title: 'Scan Receipt',
      description: 'Add items from receipt',
      icon: <Scan className="w-6 h-6 text-blue-500" />,
      onClick: () => {
        // Simulate receipt scanning functionality
        console.log('Opening receipt scanner...');
        alert('Receipt scanner would open here. This feature scans receipts to automatically add items to your shopping list.');
      }
    },
    {
      id: 'quick-add',
      title: 'Quick Add Items',
      description: 'Add items with voice or text',
      icon: <ShoppingCart className="w-6 h-6 text-purple-500" />,
      onClick: () => {
        // Simulate quick add functionality
        const items = prompt('Enter items separated by commas:');
        if (items) {
          const itemList = items.split(',').map(item => item.trim());
          console.log('Quick adding items:', itemList);
          alert(`Added ${itemList.length} items to your shopping list: ${itemList.join(', ')}`);
        }
      }
    },
    {
      id: 'price-compare',
      title: 'Compare Prices',
      description: 'Find best deals nearby',
      icon: <TrendingDown className="w-6 h-6 text-orange-500" />,
      onClick: () => setActiveView('prices')
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
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h1 className="mobile-title">Shopping</h1>
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
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'lists', label: 'Lists', icon: List },
            { id: 'stores', label: 'Stores', icon: Store },
            { id: 'prices', label: 'Prices', icon: TrendingDown },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors whitespace-nowrap"
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
        <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 pwa-safe-top">
            <h2 className="text-lg font-semibold text-gray-900">Shopping Menu</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.onClick();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {action.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{action.title}</h4>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">View Options</h3>
              <div className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard Overview', icon: BarChart3 },
                  { id: 'lists', label: 'Shopping Lists', icon: List },
                  { id: 'stores', label: 'Store Management', icon: Store },
                  { id: 'prices', label: 'Price Tracking', icon: TrendingDown },
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
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
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
        <div className={`bg-white border border-gray-200 rounded-lg ${
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

        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Lists</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{activeLists.length}</p>
            </div>
            <List className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">
              {activeLists.reduce((acc, list) => acc + list.itemCount, 0)} total items
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Savings</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">£{weeklyStats.avgSavings}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-green-600">
              12% vs last week
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Price Alerts</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{weeklyStats.priceAlerts}</p>
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
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Active Shopping Lists</h2>
          <button
            onClick={() => setActiveView('lists')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage All →
          </button>
        </div>

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Price Alerts */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Price Alerts</h2>
            <button
              onClick={() => setActiveView('prices')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>

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
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>

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
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 min-h-screen ${isMobile ? 'pb-safe-bottom' : 'p-3 sm:p-4 md:p-6 lg:p-8'}`}>
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
                {activeView === 'stores' && 'Store Management'}
                {activeView === 'prices' && 'Price Tracking'}
                {activeView === 'analytics' && 'Shopping Analytics'}
              </h1>
              <p className="text-gray-600">
                {activeView === 'dashboard' && 'Manage your family\'s shopping and save money'}
                {activeView === 'lists' && 'Create and manage your shopping lists'}
                {activeView === 'stores' && 'Manage your preferred stores and locations'}
                {activeView === 'prices' && 'Track prices and find the best deals'}
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
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('lists')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <List className="w-4 h-4" />
              <span>Lists</span>
            </button>
            <button
              onClick={() => setActiveView('stores')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <Store className="w-4 h-4" />
              <span>Stores</span>
            </button>
            <button
              onClick={() => setActiveView('prices')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <TrendingDown className="w-4 h-4" />
              <span>Prices</span>
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
        {activeView === 'stores' && <StoreManager onClose={() => setActiveView('dashboard')} />}
        {activeView === 'prices' && <PriceTracker onClose={() => setActiveView('dashboard')} />}
        {activeView === 'analytics' && <ShoppingAnalytics onClose={() => setActiveView('dashboard')} />}
      </div>

      {/* Mobile Menu Overlay */}
      {renderMobileMenu()}
    </div>
  );
};

export default ShoppingDashboard;