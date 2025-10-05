'use client'

import React from 'react';
import {
  Home,
  Calendar,
  PoundSterling,
  UtensilsCrossed,
  ShoppingCart,
  Target,
  Newspaper,
  Users,
  Menu,
  X,
  Wifi,
  WifiOff
} from 'lucide-react';

interface MobileNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  databaseStatus?: { connected: boolean; familyId: string | null; mode: string };
}

const navigationItems = [
  { id: 'dashboard', icon: Home, label: 'Home', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'calendar', icon: Calendar, label: 'Calendar', color: 'text-green-600', bgColor: 'bg-green-50' },
  { id: 'budget', icon: PoundSterling, label: 'Budget', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  { id: 'meals', icon: UtensilsCrossed, label: 'Meals', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { id: 'shopping', icon: ShoppingCart, label: 'Shopping', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'family', icon: Users, label: 'Family', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { id: 'goals', icon: Target, label: 'Goals', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { id: 'news', icon: Newspaper, label: 'News', color: 'text-gray-600', bgColor: 'bg-gray-50' }
];

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onViewChange,
  isMenuOpen,
  onMenuToggle,
  databaseStatus
}) => {
  const currentNavItem = navigationItems.find(item => item.id === currentView);

  // Mobile Header
  const renderMobileHeader = () => (
    <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 touch-target"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          {currentNavItem && (
            <div className={`p-2 rounded-lg ${currentNavItem.bgColor}`}>
              <currentNavItem.icon className={`w-5 h-5 ${currentNavItem.color}`} />
            </div>
          )}
          <div>
            <h1 className="mobile-title">
              {currentNavItem?.label || 'Family Hub'}
            </h1>
            <p className="mobile-subtitle">Family Management</p>
          </div>
        </div>
      </div>

      {/* Header Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {databaseStatus?.connected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-xs text-gray-500 hidden sm:inline">
            {databaseStatus?.connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );

  // Mobile Sidebar
  const renderMobileSidebar = () => (
    <>
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onMenuToggle}
          />
          <div className="absolute top-0 left-0 w-80 max-w-[85vw] h-full bg-white shadow-xl mobile-fade-in">
            <div className="p-4 border-b border-gray-200 pwa-safe-top">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Family Hub</h2>
                    <p className="text-xs text-gray-500">Progressive Web App</p>
                  </div>
                </div>
                <button
                  onClick={onMenuToggle}
                  className="p-2 rounded-lg hover:bg-gray-100 touch-target"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <nav className="p-2 mobile-scrollbar" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
              {navigationItems.map((item) => {
                const isActive = currentView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      onMenuToggle();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 touch-target transition-all duration-200 ${
                      isActive
                        ? `${item.bgColor} border border-opacity-20`
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? item.bgColor : 'bg-gray-100'} ${isActive ? item.color : 'text-gray-600'}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className={`font-medium ${isActive ? item.color.replace('text-', 'text-').replace('-600', '-900') : 'text-gray-900'}`}>
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.id === 'dashboard' && 'Overview & Stats'}
                        {item.id === 'calendar' && 'Events & Schedule'}
                        {item.id === 'budget' && 'Finance Tracking'}
                        {item.id === 'meals' && 'Meal Planning'}
                        {item.id === 'shopping' && 'Shopping Lists'}
                        {item.id === 'family' && 'Member Management'}
                        {item.id === 'goals' && 'Goals & Achievements'}
                        {item.id === 'news' && 'Family & Local News'}
                      </div>
                    </div>
                    {isActive && (
                      <div className={`ml-auto w-2 h-2 rounded-full ${item.color.replace('text-', 'bg-')}`} />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50 pwa-safe-bottom">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {databaseStatus?.connected ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600">Database Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-xs text-yellow-600">Local Storage Mode</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">Family Hub v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Mobile bottom navigation (always visible on mobile)
  const renderBottomNav = () => {
    return (
      <nav className="lg:hidden bg-white border-t border-gray-200 px-2 py-2 pwa-safe-bottom fixed bottom-0 left-0 right-0 z-30">
        <div className="flex justify-around">
          {navigationItems.slice(0, 5).map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  if (isMenuOpen) onMenuToggle();
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  currentView === item.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    )
  };

  return (
    <>
      {renderMobileHeader()}
      {renderMobileSidebar()}
      {renderBottomNav()}
    </>
  );
};

export default MobileNavigation;