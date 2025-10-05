'use client'

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChefHat,
  Plus,
  TrendingUp,
  ShoppingCart,
  Target,
  Book,
  Activity,
  Clock,
  Users,
  Utensils,
  Coffee,
  Sandwich,
  Moon,
  Star,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import MealPlanner from './MealPlanner';
import RecipeManager from './RecipeManager';
import NutritionTracker from './NutritionTracker';

interface MealsDashboardProps {
  onClose?: () => void;
}

const MealsDashboard: React.FC<MealsDashboardProps> = ({ onClose }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'planner' | 'recipes' | 'nutrition'>('dashboard');
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

  // Mock data for dashboard widgets
  const todaysMeals = {
    breakfast: { name: 'Classic Pancakes', time: '8:00 AM', calories: 320 },
    lunch: { name: 'Caesar Salad', time: '12:30 PM', calories: 280 },
    dinner: { name: 'Spaghetti Bolognese', time: '7:00 PM', calories: 450 }
  };

  const weekStats = {
    plannedMeals: 18,
    totalMeals: 21,
    avgNutritionScore: 8.2,
    estimatedCost: 145.50,
    prepTimeTotal: 380
  };

  const quickActions = [
    {
      id: 'plan-today',
      title: 'Plan Today\'s Meals',
      description: 'Quick meal planning for today',
      icon: <Calendar className="w-6 h-6 text-blue-500" />,
      onClick: () => setActiveView('planner')
    },
    {
      id: 'add-recipe',
      title: 'Add New Recipe',
      description: 'Add recipe to your collection',
      icon: <Plus className="w-6 h-6 text-green-500" />,
      onClick: () => setActiveView('recipes')
    },
    {
      id: 'shopping-list',
      title: 'Generate Shopping List',
      description: 'Create list from meal plan',
      icon: <ShoppingCart className="w-6 h-6 text-purple-500" />,
      onClick: () => {
        // Generate shopping list from current week's meal plan
        const ingredients = [
          'Flour - 2 cups',
          'Eggs - 2 large',
          'Milk - 1.5 cups',
          'Chicken Breast - 2 large',
          'Romaine Lettuce - 2 heads',
          'Ground Beef - 1 lb',
          'Spaghetti - 1 lb',
          'Tomato Sauce - 2 cups'
        ];
        console.log('Generated shopping list from meal plan:', ingredients);
        alert(`Shopping list generated with ${ingredients.length} items:\n\n${ingredients.join('\n')}\n\nThis would normally integrate with the Shopping module.`);
      }
    },
    {
      id: 'nutrition',
      title: 'View Nutrition',
      description: 'Track nutritional intake',
      icon: <Activity className="w-6 h-6 text-red-500" />,
      onClick: () => setActiveView('nutrition')
    }
  ];

  const recentRecipes = [
    { id: '1', name: 'Classic Pancakes', rating: 4.8, cookTime: 25, difficulty: 'easy' },
    { id: '2', name: 'Chicken Caesar Salad', rating: 4.5, cookTime: 30, difficulty: 'medium' },
    { id: '3', name: 'Spaghetti Bolognese', rating: 4.9, cookTime: 60, difficulty: 'medium' }
  ];

  const nutritionHighlights = {
    todayScore: 8.5,
    weeklyAvg: 8.2,
    goalProgress: 85,
    recommendations: [
      'Add more fiber with whole grains',
      'Include omega-3 rich fish twice this week',
      'Great job staying within calorie goals!'
    ]
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return <Coffee className="w-4 h-4" />;
      case 'lunch': return <Sandwich className="w-4 h-4" />;
      case 'dinner': return <Utensils className="w-4 h-4" />;
      case 'snack': return <Moon className="w-4 h-4" />;
      default: return <ChefHat className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Mobile Header Component
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-blue-600" />
          <h1 className="mobile-title">Meals</h1>
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
            { id: 'planner', label: 'Planner', icon: Calendar },
            { id: 'recipes', label: 'Recipes', icon: Book },
            { id: 'nutrition', label: 'Nutrition', icon: Activity }
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
            <h2 className="text-lg font-semibold text-gray-900">Meals Menu</h2>
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
                  { id: 'planner', label: 'Meal Planner', icon: Calendar },
                  { id: 'recipes', label: 'Recipe Manager', icon: Book },
                  { id: 'nutrition', label: 'Nutrition Tracker', icon: Activity }
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
      {/* Today's Meals */}
      <div className={`bg-white border border-gray-200 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <div className={`flex items-center justify-between ${
          isMobile ? 'mb-4' : 'mb-6'
        }`}>
          <h2 className={`font-semibold text-gray-900 ${
            isMobile ? 'text-lg' : 'text-xl'
          }`}>Today's Meals</h2>
          <button
            onClick={() => setActiveView('planner')}
            className={`text-blue-600 hover:text-blue-800 font-medium ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}
          >
            View Full Plan →
          </button>
        </div>

        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
        }`}>
          {Object.entries(todaysMeals).map(([mealType, meal]) => (
            <div key={mealType} className={`border border-gray-200 rounded-lg ${
              isMobile ? 'p-3' : 'p-4'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {getMealIcon(mealType)}
                <span className={`font-medium text-gray-900 capitalize ${
                  isMobile ? 'text-sm' : ''
                }`}>{mealType}</span>
              </div>
              <h3 className={`font-medium text-gray-900 ${
                isMobile ? 'text-sm' : ''
              }`}>{meal.name}</h3>
              <div className={`flex items-center justify-between text-gray-600 mt-2 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                <span>{meal.time}</span>
                <span>{meal.calories} cal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Week Overview */}
      <div className={`bg-white border border-gray-200 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <h2 className={`font-semibold text-gray-900 ${
          isMobile ? 'text-lg mb-4' : 'text-xl mb-6'
        }`}>This Week's Overview</h2>

        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
        }`}>
          <div className={`text-center bg-blue-50 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Calendar className={`text-blue-500 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-blue-800 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>{weekStats.plannedMeals}</p>
            <p className={`text-blue-600 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Meals Planned</p>
            {!isMobile && (
              <p className="text-xs text-blue-500">of {weekStats.totalMeals} total</p>
            )}
          </div>

          <div className={`text-center bg-green-50 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Target className={`text-green-500 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-green-800 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>{weekStats.avgNutritionScore}/10</p>
            <p className={`text-green-600 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Nutrition Score</p>
            {!isMobile && (
              <p className="text-xs text-green-500">Weekly average</p>
            )}
          </div>

          <div className={`text-center bg-purple-50 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <ShoppingCart className={`text-purple-500 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-purple-800 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>£{weekStats.estimatedCost}</p>
            <p className={`text-purple-600 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Estimated Cost</p>
            {!isMobile && (
              <p className="text-xs text-purple-500">This week</p>
            )}
          </div>

          <div className={`text-center bg-orange-50 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Clock className={`text-orange-500 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-orange-800 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>{Math.round(weekStats.prepTimeTotal / 60)}h</p>
            <p className={`text-orange-600 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Prep Time</p>
            {!isMobile && (
              <p className="text-xs text-orange-500">Total weekly</p>
            )}
          </div>

          <div className={`text-center bg-red-50 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Users className={`text-red-500 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-red-800 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>4</p>
            <p className={`text-red-600 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Family Size</p>
            {!isMobile && (
              <p className="text-xs text-red-500">Active members</p>
            )}
          </div>
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

        {/* Recent Recipes */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Recipes</h2>
            <button
              onClick={() => setActiveView('recipes')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {recentRecipes.map((recipe) => (
              <div key={recipe.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{recipe.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span>{recipe.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{recipe.cookTime}min</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(recipe.difficulty)}`}>
                      {recipe.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nutrition Highlights */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Nutrition Highlights</h2>
          <button
            onClick={() => setActiveView('nutrition')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-green-600 mb-1">
              {nutritionHighlights.todayScore}/10
            </div>
            <p className="text-sm text-gray-600">Today's Score</p>
          </div>

          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-blue-600 mb-1">
              {nutritionHighlights.weeklyAvg}/10
            </div>
            <p className="text-sm text-gray-600">Weekly Average</p>
          </div>

          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-purple-600 mb-1">
              {nutritionHighlights.goalProgress}%
            </div>
            <p className="text-sm text-gray-600">Goal Progress</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-3">Quick Tips</h3>
          <div className="space-y-2">
            {nutritionHighlights.recommendations.slice(0, 2).map((rec, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                <span className="text-gray-700">{rec}</span>
              </div>
            ))}
          </div>
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
                {activeView === 'dashboard' && 'Meal Planning'}
                {activeView === 'planner' && 'Meal Planner'}
                {activeView === 'recipes' && 'Recipe Manager'}
                {activeView === 'nutrition' && 'Nutrition Tracker'}
              </h1>
              <p className="text-gray-600">
                {activeView === 'dashboard' && 'Manage your family\'s meals and nutrition'}
                {activeView === 'planner' && 'Plan your weekly meals and shopping'}
                {activeView === 'recipes' && 'Organize and manage your recipe collection'}
                {activeView === 'nutrition' && 'Track nutritional intake and goals'}
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

      {/* Content */}
      <div className={isMobile ? 'px-4' : ''}>
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'planner' && <MealPlanner onClose={() => setActiveView('dashboard')} />}
        {activeView === 'recipes' && <RecipeManager onClose={() => setActiveView('dashboard')} />}
        {activeView === 'nutrition' && <NutritionTracker onClose={() => setActiveView('dashboard')} />}
      </div>

      {/* Mobile Menu Overlay */}
      {renderMobileMenu()}
    </div>
  );
};

export default MealsDashboard;