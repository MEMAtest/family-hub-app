'use client'

import React, { useState } from 'react';
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
  BarChart3
} from 'lucide-react';
import MealPlanner from './MealPlanner';
import RecipeManager from './RecipeManager';
import NutritionTracker from './NutritionTracker';

interface MealsDashboardProps {
  onClose?: () => void;
}

const MealsDashboard: React.FC<MealsDashboardProps> = ({ onClose }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'planner' | 'recipes' | 'nutrition'>('dashboard');

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

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Today's Meals */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Today's Meals</h2>
          <button
            onClick={() => setActiveView('planner')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Full Plan →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(todaysMeals).map(([mealType, meal]) => (
            <div key={mealType} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {getMealIcon(mealType)}
                <span className="font-medium text-gray-900 capitalize">{mealType}</span>
              </div>
              <h3 className="font-medium text-gray-900">{meal.name}</h3>
              <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                <span>{meal.time}</span>
                <span>{meal.calories} cal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Week Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">This Week's Overview</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-blue-800">{weekStats.plannedMeals}</p>
            <p className="text-sm text-blue-600">Meals Planned</p>
            <p className="text-xs text-blue-500">of {weekStats.totalMeals} total</p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-green-800">{weekStats.avgNutritionScore}/10</p>
            <p className="text-sm text-green-600">Nutrition Score</p>
            <p className="text-xs text-green-500">Weekly average</p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <ShoppingCart className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-purple-800">£{weekStats.estimatedCost}</p>
            <p className="text-sm text-purple-600">Estimated Cost</p>
            <p className="text-xs text-purple-500">This week</p>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-orange-800">{Math.round(weekStats.prepTimeTotal / 60)}h</p>
            <p className="text-sm text-orange-600">Prep Time</p>
            <p className="text-xs text-orange-500">Total weekly</p>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <Users className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-red-800">4</p>
            <p className="text-sm text-red-600">Family Size</p>
            <p className="text-xs text-red-500">Active members</p>
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
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

      {/* Content */}
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'planner' && <MealPlanner onClose={() => setActiveView('dashboard')} />}
      {activeView === 'recipes' && <RecipeManager onClose={() => setActiveView('dashboard')} />}
      {activeView === 'nutrition' && <NutritionTracker onClose={() => setActiveView('dashboard')} />}
    </div>
  );
};

export default MealsDashboard;