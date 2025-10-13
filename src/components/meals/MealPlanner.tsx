'use client'

import React, { useState, useEffect } from 'react';
import { MealPlan, WeekPlan, DayPlan, MealRecipe, MealCalendarView } from '@/types/meals.types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Clock,
  Users,
  ChefHat,
  ShoppingCart,
  Target,
  Utensils,
  Coffee,
  Sandwich,
  Moon,
  Trash2,
  AlertCircle
} from 'lucide-react';
import MealCalendar from './MealCalendar';
import RecipeCard from './RecipeCard';

interface MealPlannerProps {
  onClose?: () => void;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ onClose }) => {
  const [currentView, setCurrentView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; mealType: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Mock data for development
  const mockRecipes: MealRecipe[] = [
    {
      id: '1',
      familyId: 'family1',
      recipeName: 'Classic Pancakes',
      cuisineType: 'American',
      mealType: 'breakfast',
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      difficulty: 'easy',
      ingredients: [
        { name: 'Flour', quantity: 2, unit: 'cups' },
        { name: 'Eggs', quantity: 2, unit: 'large' },
        { name: 'Milk', quantity: 1.5, unit: 'cups' },
        { name: 'Baking Powder', quantity: 2, unit: 'tsp' }
      ],
      instructions: [
        'Mix dry ingredients in a bowl',
        'Whisk eggs and milk separately',
        'Combine wet and dry ingredients',
        'Cook on griddle until golden'
      ],
      nutritionInfo: {
        calories: 180,
        protein: 6,
        carbs: 28,
        fat: 5,
        fiber: 1,
        sugar: 3,
        sodium: 380
      },
      imageUrl: '',
      tags: ['breakfast', 'family-friendly', 'quick'],
      rating: 4.8,
      isFavorite: true,
      createdAt: new Date('2025-09-01')
    },
    {
      id: '2',
      familyId: 'family1',
      recipeName: 'Chicken Caesar Salad',
      cuisineType: 'Mediterranean',
      mealType: 'lunch',
      prepTime: 20,
      cookTime: 10,
      servings: 4,
      difficulty: 'medium',
      ingredients: [
        { name: 'Chicken Breast', quantity: 2, unit: 'large' },
        { name: 'Romaine Lettuce', quantity: 2, unit: 'heads' },
        { name: 'Parmesan Cheese', quantity: 0.5, unit: 'cup' },
        { name: 'Caesar Dressing', quantity: 0.25, unit: 'cup' }
      ],
      instructions: [
        'Season and grill chicken breast',
        'Chop romaine lettuce',
        'Slice chicken when cooled',
        'Toss with dressing and cheese'
      ],
      nutritionInfo: {
        calories: 320,
        protein: 35,
        carbs: 8,
        fat: 16,
        fiber: 3,
        sugar: 4,
        sodium: 680
      },
      imageUrl: '',
      tags: ['lunch', 'healthy', 'protein'],
      rating: 4.5,
      isFavorite: false,
      createdAt: new Date('2025-09-02')
    },
    {
      id: '3',
      familyId: 'family1',
      recipeName: 'Spaghetti Bolognese',
      cuisineType: 'Italian',
      mealType: 'dinner',
      prepTime: 15,
      cookTime: 45,
      servings: 6,
      difficulty: 'medium',
      ingredients: [
        { name: 'Ground Beef', quantity: 1, unit: 'lb' },
        { name: 'Spaghetti', quantity: 1, unit: 'lb' },
        { name: 'Tomato Sauce', quantity: 2, unit: 'cups' },
        { name: 'Onion', quantity: 1, unit: 'medium' }
      ],
      instructions: [
        'Brown ground beef with onions',
        'Add tomato sauce and simmer',
        'Cook spaghetti according to package',
        'Serve sauce over pasta'
      ],
      nutritionInfo: {
        calories: 450,
        protein: 28,
        carbs: 52,
        fat: 14,
        fiber: 4,
        sugar: 8,
        sodium: 820
      },
      imageUrl: '',
      tags: ['dinner', 'family-favorite', 'italian'],
      rating: 4.9,
      isFavorite: true,
      createdAt: new Date('2025-09-03')
    }
  ];

  const mockWeekPlan: WeekPlan = {
    weekOf: getStartOfWeek(currentDate),
    days: generateMockDays(),
    nutritionSummary: {
      averageDaily: {
        calories: 1850,
        protein: 95,
        carbs: 215,
        fat: 62,
        fiber: 28,
        sugar: 45,
        sodium: 1890
      },
      weeklyTotals: {
        calories: 12950,
        protein: 665,
        carbs: 1505,
        fat: 434,
        fiber: 196,
        sugar: 315,
        sodium: 13230
      },
      nutritionScore: 8.4,
      deficiencies: ['Vitamin D', 'Omega-3'],
      excesses: ['Sodium'],
      recommendations: [
        'Add more fish for Omega-3s',
        'Include vitamin D rich foods',
        'Reduce sodium in processed foods'
      ]
    },
    totalCost: 145.50,
    totalPrepTime: 380,
    shoppingList: {
      id: 'shop1',
      familyId: 'family1',
      listName: 'Weekly Groceries',
      weekOf: getStartOfWeek(currentDate),
      items: [],
      generatedFromMeals: true,
      totalEstimatedCost: 145.50,
      status: 'pending',
      createdAt: new Date()
    }
  };

  function getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    return new Date(start.setDate(diff));
  }

  function generateMockDays(): DayPlan[] {
    const days: DayPlan[] = [];
    const startOfWeek = getStartOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      days.push({
        date,
        meals: {
          breakfast: Math.random() > 0.3 ? {
            id: `meal-${i}-b`,
            familyId: 'family1',
            planDate: date,
            mealType: 'breakfast',
            recipeId: mockRecipes[0].id,
            recipe: mockRecipes[0],
            status: 'planned',
            leftovers: false,
            createdAt: new Date()
          } : undefined,
          lunch: Math.random() > 0.2 ? {
            id: `meal-${i}-l`,
            familyId: 'family1',
            planDate: date,
            mealType: 'lunch',
            recipeId: mockRecipes[1].id,
            recipe: mockRecipes[1],
            status: 'planned',
            leftovers: false,
            createdAt: new Date()
          } : undefined,
          dinner: {
            id: `meal-${i}-d`,
            familyId: 'family1',
            planDate: date,
            mealType: 'dinner',
            recipeId: mockRecipes[2].id,
            recipe: mockRecipes[2],
            status: 'planned',
            leftovers: false,
            createdAt: new Date()
          }
        },
        dailyNutrition: {
          calories: 1800 + Math.random() * 200,
          protein: 90 + Math.random() * 20,
          carbs: 200 + Math.random() * 30,
          fat: 60 + Math.random() * 15,
          fiber: 25 + Math.random() * 10,
          sugar: 40 + Math.random() * 15,
          sodium: 1800 + Math.random() * 400
        },
        dailyCost: 18 + Math.random() * 8,
        dailyPrepTime: 50 + Math.random() * 30
      });
    }

    return days;
  }

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setWeekPlan(mockWeekPlan);
      setIsLoading(false);
    }, 1000);
  }, [currentDate]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMealSlotClick = (date: Date, mealType: string) => {
    setSelectedSlot({ date, mealType });
    setShowRecipeSelector(true);
  };

  const clearWeekPlan = () => {
    // Clear the current week's meal plan
    setWeekPlan(null);
    localStorage.removeItem(`mealPlan-week-${currentDate.toISOString().split('T')[0]}`);
    setShowClearConfirm(false);
  };

  const handleRecipeSelect = (recipe: MealRecipe) => {
    if (selectedSlot) {
      // Create new meal plan
      const newMeal: MealPlan = {
        id: `meal-${Date.now()}`,
        familyId: 'family1',
        planDate: selectedSlot.date,
        mealType: selectedSlot.mealType as any,
        recipeId: recipe.id,
        recipe,
        status: 'planned',
        leftovers: false,
        createdAt: new Date()
      };

      // Update week plan
      if (weekPlan) {
        const updatedDays = weekPlan.days.map(day => {
          if (day.date.toDateString() === selectedSlot.date.toDateString()) {
            return {
              ...day,
              meals: {
                ...day.meals,
                [selectedSlot.mealType]: newMeal
              }
            };
          }
          return day;
        });

        setWeekPlan({ ...weekPlan, days: updatedDays });
      }
    }
    setShowRecipeSelector(false);
    setSelectedSlot(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading meal plan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Meal Planner</h1>
            <p className="text-gray-600">Plan your family's meals for the week</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView(currentView === 'week' ? 'month' : 'week')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>{currentView === 'week' ? 'Month View' : 'Week View'}</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Week</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-medium text-gray-900">
            Week of {formatDate(getStartOfWeek(currentDate))}
          </h2>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Week Summary */}
        {weekPlan && (
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Score: {weekPlan.nutritionSummary.nutritionScore}/10</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{Math.round(weekPlan.totalPrepTime / 60)}h prep</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4" />
              <span>£{weekPlan.totalCost.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Meal Planning Grid */}
      {weekPlan && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-4 bg-gray-50 font-medium text-gray-900">Meal</div>
            {weekPlan.days.map((day, index) => (
              <div key={index} className="p-4 bg-gray-50 text-center">
                <div className="font-medium text-gray-900">{formatDate(day.date).split(' ')[0]}</div>
                <div className="text-sm text-gray-600">{formatDate(day.date).split(' ').slice(1).join(' ')}</div>
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {['breakfast', 'lunch', 'dinner'].map((mealType) => (
            <div key={mealType} className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-4 bg-gray-50 flex items-center space-x-2">
                {getMealIcon(mealType)}
                <span className="font-medium text-gray-900 capitalize">{mealType}</span>
              </div>
              {weekPlan.days.map((day, dayIndex) => {
                const meal = day.meals[mealType as keyof typeof day.meals] as MealPlan | undefined;
                return (
                  <div
                    key={dayIndex}
                    className="p-3 border-r border-gray-200 min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleMealSlotClick(day.date, mealType)}
                  >
                    {meal ? (
                      <div className="h-full">
                        {meal.recipe ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 h-full">
                            <h4 className="font-medium text-blue-900 text-sm mb-1 line-clamp-2">
                              {meal.recipe.recipeName}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <Clock className="w-3 h-3" />
                              <span>{(meal.recipe.prepTime || 0) + (meal.recipe.cookTime || 0)}min</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-blue-700 mt-1">
                              <Users className="w-3 h-3" />
                              <span>{meal.recipe.servings} servings</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-full">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {meal.customMeal || 'Custom Meal'}
                            </h4>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Recipe Selector Modal */}
      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900">Clear Week's Meal Plan?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will remove all planned meals for the current week. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={clearWeekPlan}
                className="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700"
              >
                Clear Week
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Recipe for {selectedSlot?.mealType}
                </h3>
                <button
                  onClick={() => setShowRecipeSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockRecipes
                  .filter(recipe => recipe.mealType === selectedSlot?.mealType)
                  .map(recipe => (
                    <div key={recipe.id} onClick={() => handleRecipeSelect(recipe)}>
                      <RecipeCard recipe={recipe} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Summary Sidebar */}
      {weekPlan && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nutrition Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nutrition Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Average</span>
                <span className="font-medium">{Math.round(weekPlan.nutritionSummary.averageDaily.calories)} cal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Protein</span>
                <span className="font-medium">{Math.round(weekPlan.nutritionSummary.averageDaily.protein)}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nutrition Score</span>
                <span className="font-medium text-green-600">{weekPlan.nutritionSummary.nutritionScore}/10</span>
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Week</span>
                <span className="font-medium">£{weekPlan.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Average</span>
                <span className="font-medium">£{(weekPlan.totalCost / 7).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Person</span>
                <span className="font-medium">£{(weekPlan.totalCost / 28).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-gray-900">Generate Shopping List</div>
                    <div className="text-sm text-gray-600">Create list from meal plan</div>
                  </div>
                </div>
              </button>
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-gray-900">Auto-Fill Week</div>
                    <div className="text-sm text-gray-600">AI suggests complete plan</div>
                  </div>
                </div>
              </button>
              <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-gray-900">Optimize Nutrition</div>
                    <div className="text-sm text-gray-600">Balance weekly nutrition</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;