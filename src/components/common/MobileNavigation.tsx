'use client'

import React from 'react';
import {
  Activity,
  CalendarDays,
  DollarSign,
  Utensils,
  ShoppingBag,
  Target,
  Newspaper,
  Users,
  Menu,
  X
} from 'lucide-react';

interface MobileNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

const navigationItems = [
  { id: 'dashboard', icon: Activity, label: 'Dashboard', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendar', gradient: 'from-purple-500 to-pink-400' },
  { id: 'budget', icon: DollarSign, label: 'Budget', gradient: 'from-green-500 to-emerald-400' },
  { id: 'meals', icon: Utensils, label: 'Meals', gradient: 'from-orange-500 to-red-400' },
  { id: 'shopping', icon: ShoppingBag, label: 'Shopping', gradient: 'from-yellow-500 to-orange-400' },
  { id: 'goals', icon: Target, label: 'Goals', gradient: 'from-pink-500 to-rose-400' },
  { id: 'news', icon: Newspaper, label: 'News', gradient: 'from-indigo-500 to-purple-400' },
  { id: 'family', icon: Users, label: 'Family', gradient: 'from-teal-500 to-cyan-400' }
];

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onViewChange,
  isMenuOpen,
  onMenuToggle
}) => {
  // Mobile bottom navigation (always visible on mobile)
  const renderBottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-4 gap-0">
        {navigationItems.slice(0, 4).map(item => (
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
        ))}
      </div>
    </div>
  );

  // Mobile slide-out menu for additional options
  const renderSlideMenu = () => (
    <>
      {/* Overlay */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onMenuToggle}
        />
      )}

      {/* Slide-out menu */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Family Hub</h2>
            <button
              onClick={onMenuToggle}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <nav className="p-4">
          {navigationItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                onMenuToggle();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-colors ${
                currentView === item.id
                  ? `bg-gradient-to-r ${item.gradient} text-white`
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* App info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 safe-area-inset-bottom">
          <div className="text-sm text-gray-600">
            <p className="font-medium">Family Hub</p>
            <p className="text-xs mt-1">Version 1.0.0</p>
            <p className="text-xs mt-1">© 2025 Family Hub</p>
          </div>
        </div>
      </div>
    </>
  );

  // Mobile header with hamburger menu
  const renderMobileHeader = () => (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 safe-area-inset-top">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-semibold">
          {navigationItems.find(item => item.id === currentView)?.label || 'Family Hub'}
        </h1>
        <div className="w-10" /> {/* Spacer for balance */}
      </div>
    </div>
  );

  return (
    <>
      {renderMobileHeader()}
      {renderSlideMenu()}
      {renderBottomNav()}
    </>
  );
};

export default MobileNavigation;