'use client'

import React, { useState } from 'react';
import { MealCalendarView, MealCalendarDay, MealPlan } from '@/types/meals.types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid3X3,
  List,
  Filter,
  Plus,
  Coffee,
  Sandwich,
  Utensils,
  Moon
} from 'lucide-react';

interface MealCalendarProps {
  view: MealCalendarView;
  onViewChange: (view: MealCalendarView) => void;
  onMealClick: (meal: MealPlan) => void;
  onEmptySlotClick: (date: Date, mealType: string) => void;
}

const MealCalendar: React.FC<MealCalendarProps> = ({
  view,
  onViewChange,
  onMealClick,
  onEmptySlotClick
}) => {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Generate calendar days based on view
  const generateCalendarDays = (): MealCalendarDay[] => {
    const days: MealCalendarDay[] = [];
    const today = new Date();

    if (view.type === 'week') {
      // Generate 7 days for week view
      for (let i = 0; i < 7; i++) {
        const date = new Date(view.startDate);
        date.setDate(view.startDate.getDate() + i);

        const dayMeals = view.meals.filter(meal =>
          meal.planDate.toDateString() === date.toDateString()
        );

        days.push(createMealCalendarDay(date, dayMeals, today));
      }
    } else {
      // Generate days for month view
      const daysInMonth = new Date(view.startDate.getFullYear(), view.startDate.getMonth() + 1, 0).getDate();
      const firstDay = new Date(view.startDate.getFullYear(), view.startDate.getMonth(), 1);

      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(view.startDate.getFullYear(), view.startDate.getMonth(), i);

        const dayMeals = view.meals.filter(meal =>
          meal.planDate.toDateString() === date.toDateString()
        );

        days.push(createMealCalendarDay(date, dayMeals, today));
      }
    }

    return days;
  };

  const createMealCalendarDay = (date: Date, dayMeals: MealPlan[], today: Date): MealCalendarDay => {
    const meals = {
      breakfast: dayMeals.find(m => m.mealType === 'breakfast'),
      lunch: dayMeals.find(m => m.mealType === 'lunch'),
      dinner: dayMeals.find(m => m.mealType === 'dinner'),
      snacks: dayMeals.filter(m => m.mealType === 'snack')
    };

    const totalNutrition = dayMeals.reduce((total, meal) => {
      if (meal.recipe?.nutritionInfo) {
        return {
          calories: total.calories + meal.recipe.nutritionInfo.calories,
          protein: total.protein + meal.recipe.nutritionInfo.protein,
          carbs: total.carbs + meal.recipe.nutritionInfo.carbs,
          fat: total.fat + meal.recipe.nutritionInfo.fat,
          fiber: total.fiber + meal.recipe.nutritionInfo.fiber,
          sugar: total.sugar + meal.recipe.nutritionInfo.sugar,
          sodium: total.sodium + meal.recipe.nutritionInfo.sodium
        };
      }
      return total;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

    return {
      date,
      meals,
      nutritionSummary: totalNutrition,
      isToday: date.toDateString() === today.toDateString(),
      hasAllMealsPlanned: !!(meals.breakfast && meals.lunch && meals.dinner)
    };
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return <Coffee className="w-3 h-3" />;
      case 'lunch': return <Sandwich className="w-3 h-3" />;
      case 'dinner': return <Utensils className="w-3 h-3" />;
      case 'snack': return <Moon className="w-3 h-3" />;
      default: return null;
    }
  };

  const formatDate = (date: Date, format: 'short' | 'long' = 'short') => {
    if (format === 'long') {
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newStartDate = new Date(view.startDate);
    const amount = view.type === 'week' ? 7 : 30; // Approximate month navigation

    if (direction === 'next') {
      newStartDate.setDate(newStartDate.getDate() + amount);
    } else {
      newStartDate.setDate(newStartDate.getDate() - amount);
    }

    onViewChange({
      ...view,
      startDate: newStartDate,
      endDate: new Date(newStartDate.getTime() + (view.type === 'week' ? 6 * 24 * 60 * 60 * 1000 : 29 * 24 * 60 * 60 * 1000))
    });
  };

  const calendarDays = generateCalendarDays();

  const renderWeekView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-4 bg-gray-50 font-medium text-gray-900">Meal</div>
        {calendarDays.map((day, index) => (
          <div key={index} className={`p-4 bg-gray-50 text-center ${day.isToday ? 'bg-blue-50' : ''}`}>
            <div className={`font-medium ${day.isToday ? 'text-blue-900' : 'text-gray-900'}`}>
              {formatDate(day.date).split(' ')[0]}
            </div>
            <div className={`text-sm ${day.isToday ? 'text-blue-700' : 'text-gray-600'}`}>
              {formatDate(day.date).split(' ').slice(1).join(' ')}
            </div>
            {day.hasAllMealsPlanned && (
              <div className="mt-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
            )}
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
          {calendarDays.map((day, dayIndex) => {
            const meal = day.meals[mealType as keyof typeof day.meals] as MealPlan | undefined;
            return (
              <div
                key={dayIndex}
                className="p-3 border-r border-gray-200 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (meal) {
                    onMealClick(meal);
                  } else {
                    onEmptySlotClick(day.date, mealType);
                  }
                }}
              >
                {meal ? (
                  <div className="h-full">
                    {meal.recipe ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 h-full">
                        <h4 className="font-medium text-blue-900 text-xs mb-1 line-clamp-2">
                          {meal.recipe.recipeName}
                        </h4>
                        <div className="text-xs text-blue-700">
                          {meal.recipe.nutritionInfo?.calories || 0} cal
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 h-full">
                        <h4 className="font-medium text-gray-900 text-xs">
                          {meal.customMeal || 'Custom Meal'}
                        </h4>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderMonthView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Month grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="bg-gray-50 p-3 text-center font-medium text-gray-900">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`bg-white p-2 min-h-[120px] ${day.isToday ? 'bg-blue-50' : ''}`}
          >
            <div className={`text-sm font-medium mb-2 ${day.isToday ? 'text-blue-900' : 'text-gray-900'}`}>
              {day.date.getDate()}
            </div>

            {/* Meal indicators */}
            <div className="space-y-1">
              {day.meals.breakfast && (
                <div
                  className="flex items-center space-x-1 text-xs bg-yellow-100 text-yellow-800 rounded px-1 py-0.5 cursor-pointer"
                  onClick={() => onMealClick(day.meals.breakfast!)}
                >
                  <Coffee className="w-3 h-3" />
                  <span className="truncate">{day.meals.breakfast.recipe?.recipeName || 'Breakfast'}</span>
                </div>
              )}
              {day.meals.lunch && (
                <div
                  className="flex items-center space-x-1 text-xs bg-orange-100 text-orange-800 rounded px-1 py-0.5 cursor-pointer"
                  onClick={() => onMealClick(day.meals.lunch!)}
                >
                  <Sandwich className="w-3 h-3" />
                  <span className="truncate">{day.meals.lunch.recipe?.recipeName || 'Lunch'}</span>
                </div>
              )}
              {day.meals.dinner && (
                <div
                  className="flex items-center space-x-1 text-xs bg-purple-100 text-purple-800 rounded px-1 py-0.5 cursor-pointer"
                  onClick={() => onMealClick(day.meals.dinner!)}
                >
                  <Utensils className="w-3 h-3" />
                  <span className="truncate">{day.meals.dinner.recipe?.recipeName || 'Dinner'}</span>
                </div>
              )}
            </div>

            {/* Add meal button */}
            <button
              onClick={() => onEmptySlotClick(day.date, 'breakfast')}
              className="w-full mt-2 p-1 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-400 transition-colors"
            >
              <Plus className="w-3 h-3 mx-auto" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {calendarDays.map((day, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${day.isToday ? 'text-blue-900' : 'text-gray-900'}`}>
              {formatDate(day.date, 'long')}
            </h3>
            <div className="text-sm text-gray-600">
              {Math.round(day.nutritionSummary.calories)} calories
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['breakfast', 'lunch', 'dinner'].map((mealType) => {
              const meal = day.meals[mealType as keyof typeof day.meals] as MealPlan | undefined;
              return (
                <div
                  key={mealType}
                  className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (meal) {
                      onMealClick(meal);
                    } else {
                      onEmptySlotClick(day.date, mealType);
                    }
                  }}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {getMealIcon(mealType)}
                    <span className="font-medium text-gray-900 capitalize">{mealType}</span>
                  </div>
                  {meal ? (
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">
                        {meal.recipe?.recipeName || meal.customMeal}
                      </h4>
                      {meal.recipe?.nutritionInfo && (
                        <p className="text-xs text-gray-600">
                          {meal.recipe.nutritionInfo.calories} cal, {meal.recipe.nutritionInfo.protein}g protein
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded">
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-medium text-gray-900">
            {view.type === 'week'
              ? `Week of ${formatDate(view.startDate)}`
              : view.startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            }
          </h2>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Layout Toggle */}
          {view.type === 'week' && (
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setLayout('grid')}
                className={`p-2 ${layout === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout('list')}
                className={`p-2 ${layout === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>

          {/* View Toggle */}
          <button
            onClick={() => onViewChange({
              ...view,
              type: view.type === 'week' ? 'month' : 'week'
            })}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>{view.type === 'week' ? 'Month' : 'Week'}</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Filter Meals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">All meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snacks</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">All family members</option>
                <option value="alice">Alice</option>
                <option value="bob">Bob</option>
                <option value="charlie">Charlie</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">All statuses</option>
                <option value="planned">Planned</option>
                <option value="prepared">Prepared</option>
                <option value="eaten">Eaten</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Content */}
      {view.type === 'week' ? (
        layout === 'grid' ? renderWeekView() : renderListView()
      ) : (
        renderMonthView()
      )}
    </div>
  );
};

export default MealCalendar;