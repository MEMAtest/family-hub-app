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
  X,
  Check,
  ChevronRight,
  Home,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import MealPlanner from './MealPlanner';
import RecipeManager from './RecipeManager';
import NutritionTracker from './NutritionTracker';
import { useFamilyStore } from '@/store/familyStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { AIMealPlan } from '@/types/meals.types';
import { useMealsContext } from '@/contexts/familyHub/MealsContext';
import { useAppView } from '@/contexts/familyHub/AppViewContext';

interface MealsDashboardProps {
  onClose?: () => void;
}

interface QuickMealLog {
  mealName: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  mealDate: string;
  protein?: string;
  carbohydrate?: string;
  vegetable?: string;
  estimatedCalories?: number;
  mealNotes?: string;
}

const MealsDashboard: React.FC<MealsDashboardProps> = ({ onClose }) => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const familyMembers = useFamilyStore((state) => state.people);
  const mealPlanning = useFamilyStore((state) => state.mealPlanning);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { openMealForm } = useMealsContext();
  const { setView } = useAppView();
  const [activeView, setActiveView] = useState<'dashboard' | 'planner' | 'recipes' | 'nutrition'>('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [aiMealPlan, setAiMealPlan] = useState<AIMealPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuickMealLog>({
    mealName: '',
    mealType: 'Dinner',
    mealDate: new Date().toISOString().split('T')[0],
    protein: '',
    carbohydrate: '',
    vegetable: '',
    estimatedCalories: undefined,
    mealNotes: ''
  });

  // Fetch recent meals from API
  useEffect(() => {
    if (familyId) {
      fetchRecentMeals();
    }
  }, [familyId]);

  const fetchRecentMeals = async () => {
    if (!familyId) return;

    setIsLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(`/api/families/${familyId}/meals?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const meals = await response.json();
        setRecentMeals(meals);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogMeal = async () => {
    if (!familyId || !formData.mealName) {
      alert('Please enter a meal name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/families/${familyId}/meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealDate: formData.mealDate,
          mealName: formData.mealName,
          proteinSource: formData.protein || null,
          carbohydrateSource: formData.carbohydrate || null,
          vegetableSource: formData.vegetable || null,
          estimatedCalories: formData.estimatedCalories || null,
          mealNotes: formData.mealNotes || null
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setFormData({
          mealName: '',
          mealType: 'Dinner',
          mealDate: new Date().toISOString().split('T')[0],
          protein: '',
          carbohydrate: '',
          vegetable: '',
          estimatedCalories: undefined,
          mealNotes: ''
        });
        setShowQuickLogModal(false);

        // Refresh meals list
        await fetchRecentMeals();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to log meal'}`);
      }
    } catch (error) {
      console.error('Error logging meal:', error);
      alert('Failed to log meal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPlanDate = (isoDate: string) => {
    try {
      const date = new Date(`${isoDate}T00:00:00`);
      return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return isoDate;
    }
  };

  const handleGenerateMealPlan = async () => {
    if (!familyId) {
      alert('Family ID not available yet. Please try again shortly.');
      return;
    }

    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      const response = await fetch(`/api/families/${familyId}/meals/ai-plan`, {
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

      setAiMealPlan(payload.plan);
    } catch (error) {
      console.error('Failed to generate AI meal plan', error);
      setPlanError(error instanceof Error ? error.message : 'Failed to generate meal plan');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Get today's meals from recent meals
  const todaysMeals = {
    breakfast: recentMeals.find(m => m.mealDate === new Date().toISOString().split('T')[0] && m.mealName.toLowerCase().includes('breakfast')),
    lunch: recentMeals.find(m => m.mealDate === new Date().toISOString().split('T')[0] && m.mealName.toLowerCase().includes('lunch')),
    dinner: recentMeals.find(m => m.mealDate === new Date().toISOString().split('T')[0] && (m.mealName.toLowerCase().includes('dinner') || m.mealName.toLowerCase().includes('supper')))
  };

  // Calculate week stats from actual meal data
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

  const weekMeals = recentMeals.filter(meal => {
    const mealDate = new Date(meal.mealDate);
    return mealDate >= weekStart && mealDate <= weekEnd;
  });

  const weekStats = {
    plannedMeals: weekMeals.length,
    totalMeals: 21, // 3 meals/day * 7 days
    avgNutritionScore: 0, // Will be calculated from nutrition tracking when implemented
    estimatedCost: weekMeals.reduce((sum, meal) => sum + (meal.estimatedCost || 0), 0),
    prepTimeTotal: weekMeals.reduce((sum, meal) => sum + (meal.prepTime || 0), 0)
  };

  const quickActions = [
    {
      id: 'quick-log',
      title: 'Quick Log Meal',
      description: 'Quickly log what you ate',
      icon: <Plus className="w-6 h-6 text-green-500" />,
      onClick: () => setShowQuickLogModal(true)
    },
    {
      id: 'ai-plan',
      title: 'AI Weekly Meal Plan',
      description: 'Let AI draft the next 7 days',
      icon: <ChefHat className="w-6 h-6 text-purple-500" />,
      onClick: () => {
        if (!isGeneratingPlan) {
          handleGenerateMealPlan();
        }
      }
    },
    {
      id: 'plan-today',
      title: 'Plan Today\'s Meals',
      description: 'Quick meal planning for today',
      icon: <Calendar className="w-6 h-6 text-blue-500" />,
      onClick: () => openMealForm(new Date().toISOString().split('T')[0])
    },
    {
      id: 'shopping-list',
      title: 'Generate Shopping List',
      description: 'Create list from meal plan',
      icon: <ShoppingCart className="w-6 h-6 text-purple-500" />,
      onClick: async () => {
        if (!familyId) {
          toast.error('Family ID not available yet. Please try again.');
          return;
        }

        const items = new Set<string>();
        const addItem = (value: unknown) => {
          if (typeof value !== 'string') return;
          const trimmed = value.trim();
          if (!trimmed) return;
          items.add(trimmed);
        };

        if (aiMealPlan?.shoppingList?.length) {
          aiMealPlan.shoppingList.forEach((entry) => addItem(entry.item));
        } else {
          const start = new Date();
          for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            const entry: any =
              (mealPlanning as any)?.planned?.[key] ??
              (mealPlanning as any)?.eaten?.[key];
            if (!entry) continue;
            addItem(entry.protein);
            addItem(entry.carb);
            addItem(entry.veg);
          }
        }

        if (items.size === 0) {
          toast.error('No meal plan items found. Plan meals first, then generate a list.');
          return;
        }

        try {
          const startDate = new Date().toISOString().split('T')[0];
          const endDate = (() => {
            const d = new Date();
            d.setDate(d.getDate() + 6);
            return d.toISOString().split('T')[0];
          })();

          const listResponse = await fetch(`/api/families/${familyId}/shopping-lists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listName: `Meal Plan (${startDate} to ${endDate})`,
              category: 'Food',
            }),
          });

          const listPayload = await listResponse.json().catch(() => null);
          if (!listResponse.ok) {
            throw new Error(listPayload?.error || 'Failed to create shopping list');
          }

          const listId = listPayload?.id as string | undefined;
          if (!listId) {
            throw new Error('Shopping list created without an id');
          }

          const itemArray = Array.from(items).slice(0, 50);
          await Promise.all(itemArray.map(async (name) => {
            const response = await fetch(`/api/families/${familyId}/shopping-lists/${listId}/items`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itemName: name, category: 'Food' }),
            });
            if (!response.ok) {
              throw new Error(`Failed to add item "${name}"`);
            }
          }));

          toast.success(`Shopping list created (${Math.min(items.size, 50)} items)`);
          setView('shopping');
        } catch (error) {
          console.error('Failed to generate shopping list:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to generate shopping list');
        }
      }
    }
  ];

  // Recent recipes would come from API - placeholder for future implementation
  const recentRecipes: Array<{id: string; name: string; rating: number; cookTime: number; difficulty: string}> = [];

  // Nutrition highlights would come from API - placeholder for future implementation
  const nutritionHighlights = {
    todayScore: 0,
    weeklyAvg: 0,
    goalProgress: 0,
    recommendations: [] as string[]
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
    <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="mobile-title dark:text-slate-100">Meals</h1>
        </div>
        <button
          onClick={() => setShowMobileMenu(true)}
          className="mobile-btn-secondary p-2"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* View Tabs - Mobile */}
      {/* Additional views (planner/recipes/nutrition) are intentionally hidden until wired to persistence. */}
    </div>
  );

  // Mobile Menu Overlay Component
  const renderMobileMenu = () => {
    if (!showMobileMenu) return null;

    return (
      <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowMobileMenu(false)}>
        <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 pwa-safe-top">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Meals Menu</h2>
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
      {/* Today's Meals */}
      <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <div className={`flex items-center justify-between ${
          isMobile ? 'mb-4' : 'mb-6'
        }`}>
          <h2 className={`font-semibold text-gray-900 dark:text-slate-100 ${
            isMobile ? 'text-lg' : 'text-xl'
          }`}>Today's Meals</h2>
          <button
            onClick={() => openMealForm(new Date().toISOString().split('T')[0])}
            className={`text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}
          >
            Plan meal →
          </button>
        </div>

        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
        }`}>
          {Object.entries(todaysMeals).map(([mealType, meal]) => (
            <div key={mealType} className={`border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg ${
              isMobile ? 'p-3' : 'p-4'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {getMealIcon(mealType)}
                <span className={`font-medium text-gray-900 dark:text-slate-100 capitalize ${
                  isMobile ? 'text-sm' : ''
                }`}>{mealType}</span>
              </div>
              {meal ? (
                <>
                  <h3 className={`font-medium text-gray-900 dark:text-slate-100 ${
                    isMobile ? 'text-sm' : ''
                  }`}>{meal.mealName}</h3>
                  <div className={`flex items-center justify-between text-gray-600 dark:text-slate-400 mt-2 ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                    <span>{new Date(meal.mealDate).toLocaleDateString()}</span>
                    {meal.estimatedCalories && <span>{meal.estimatedCalories} cal</span>}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">No meal logged</p>
                  <button
                    onClick={() => setShowQuickLogModal(true)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                  >
                    + Log meal
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Week Overview */}
      <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <h2 className={`font-semibold text-gray-900 dark:text-slate-100 ${
          isMobile ? 'text-lg mb-4' : 'text-xl mb-6'
        }`}>This Week's Overview</h2>

        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
        }`}>
          <div className={`text-center bg-blue-50 dark:bg-blue-900/30 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Calendar className={`text-blue-500 dark:text-blue-400 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-blue-800 dark:text-blue-200 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>{weekStats.plannedMeals}</p>
            <p className={`text-blue-600 dark:text-blue-300 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Meals Planned</p>
            {!isMobile && (
              <p className="text-xs text-blue-500 dark:text-blue-400">of {weekStats.totalMeals} total</p>
            )}
          </div>

          <div className={`text-center bg-green-50 dark:bg-green-900/30 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Target className={`text-green-500 dark:text-green-400 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-green-800 dark:text-green-200 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>{weekStats.avgNutritionScore}/10</p>
            <p className={`text-green-600 dark:text-green-300 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Nutrition Score</p>
            {!isMobile && (
              <p className="text-xs text-green-500 dark:text-green-400">Weekly average</p>
            )}
          </div>

          <div className={`text-center bg-purple-50 dark:bg-purple-900/30 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <ShoppingCart className={`text-purple-500 dark:text-purple-400 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-purple-800 dark:text-purple-200 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>£{weekStats.estimatedCost}</p>
            <p className={`text-purple-600 dark:text-purple-300 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Estimated Cost</p>
            {!isMobile && (
              <p className="text-xs text-purple-500 dark:text-purple-400">This week</p>
            )}
          </div>

          <div className={`text-center bg-orange-50 dark:bg-orange-900/30 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Clock className={`text-orange-500 dark:text-orange-400 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-orange-800 dark:text-orange-200 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>{Math.round(weekStats.prepTimeTotal / 60)}h</p>
            <p className={`text-orange-600 dark:text-orange-300 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Prep Time</p>
            {!isMobile && (
              <p className="text-xs text-orange-500 dark:text-orange-400">Total weekly</p>
            )}
          </div>

          <div className={`text-center bg-red-50 dark:bg-red-900/30 rounded-lg ${
            isMobile ? 'p-3' : 'p-4'
          }`}>
            <Users className={`text-red-500 dark:text-red-400 mx-auto mb-2 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
            <p className={`font-bold text-red-800 dark:text-red-200 ${
              isMobile ? 'text-lg' : 'text-xl md:text-2xl'
            }`}>{familyMembers.length}</p>
            <p className={`text-red-600 dark:text-red-300 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>Family Size</p>
            {!isMobile && (
              <p className="text-xs text-red-500 dark:text-red-400">Active members</p>
            )}
          </div>
      </div>
    </div>

    {/* AI Meal Plan */}
    <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
      isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`font-semibold text-gray-900 dark:text-slate-100 ${
            isMobile ? 'text-lg' : 'text-xl'
          }`}>AI Weekly Meal Plan</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Generate a 7-day meal schedule with shopping highlights
          </p>
        </div>
        <button
          onClick={handleGenerateMealPlan}
          disabled={isGeneratingPlan}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
            isGeneratingPlan ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {isGeneratingPlan ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <ChefHat className="w-4 h-4" /> Generate Plan
            </>
          )}
        </button>
      </div>

      {planError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Unable to generate plan: {planError}
        </div>
      )}

      {aiMealPlan ? (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Week beginning {formatPlanDate(aiMealPlan.weekStart)}
            </p>
            <p className="mt-2 text-gray-700 dark:text-slate-300 leading-relaxed">{aiMealPlan.summary}</p>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {aiMealPlan.days.map((day) => (
              <div key={day.date} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">
                  {formatPlanDate(day.date)}
                </p>
                <div className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
                  {(['breakfast', 'lunch', 'dinner'] as const).map((mealKey) => {
                    const meal = day.meals[mealKey];
                    if (!meal) return null;
                    return (
                      <div key={mealKey}>
                        <p className="font-medium text-gray-900 dark:text-slate-100 capitalize">{mealKey}</p>
                        <p>{meal.name}</p>
                        {meal.description && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{meal.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {aiMealPlan.shoppingList.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">Shopping Highlights</h3>
              <ul className="grid gap-2 text-sm text-gray-700 dark:text-slate-300 md:grid-cols-2">
                {aiMealPlan.shoppingList.map((item, index) => (
                  <li key={`${item.item}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-purple-400" />
                    <span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{item.item}</span>
                      {item.quantity && ` – ${item.quantity}`}
                      {item.notes && <span className="block text-xs text-gray-500 dark:text-slate-400">{item.notes}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiMealPlan.tips && aiMealPlan.tips.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2">Prep & Budget Tips</h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-slate-300 space-y-1">
                {aiMealPlan.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-6 text-center text-sm text-gray-500 dark:text-slate-400">
          Tap "Generate Plan" to create a personalised 7-day meal schedule with shopping list and prep tips.
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

        {/* Recent Recipes */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Recent Recipes</h2>
            <button
              onClick={() => toast('Recipe manager is not connected yet.')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>

          {recentRecipes.length === 0 ? (
            <div className="text-center py-8">
              <Book className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-3">No recipes yet</p>
              <button
                onClick={() => toast('Recipe manager is not connected yet.')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Add your first recipe →
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Nutrition Highlights */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Nutrition Highlights</h2>
          <button
            onClick={() => toast('Nutrition tracking is not connected yet.')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details →
          </button>
        </div>

        {nutritionHighlights.todayScore === 0 && nutritionHighlights.recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">No nutrition data yet</p>
            <button
              onClick={() => toast('Nutrition tracking is not connected yet.')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Start tracking nutrition →
            </button>
          </div>
        ) : (
          <>
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

            {nutritionHighlights.recommendations.length > 0 && (
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
            )}
          </>
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
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm mb-4">
            <button
              onClick={() => onClose && onClose()}
              className="flex items-center text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            >
              <Home className="w-4 h-4 mr-1" />
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <span className="text-gray-900 dark:text-slate-100 font-medium">
              {activeView === 'dashboard' && 'Meals'}
              {activeView === 'planner' && 'Meal Planner'}
              {activeView === 'recipes' && 'Recipe Manager'}
              {activeView === 'nutrition' && 'Nutrition Tracker'}
            </span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 dark:text-slate-100 mb-2">
                {activeView === 'dashboard' && 'Meal Planning'}
                {activeView === 'planner' && 'Meal Planner'}
                {activeView === 'recipes' && 'Recipe Manager'}
                {activeView === 'nutrition' && 'Nutrition Tracker'}
              </h1>
              <p className="text-gray-600 dark:text-slate-400">
                {activeView === 'dashboard' && 'Manage your family\'s meals and nutrition'}
                {activeView === 'planner' && 'Plan your weekly meals and shopping'}
                {activeView === 'recipes' && 'Organize and manage your recipe collection'}
                {activeView === 'nutrition' && 'Track nutritional intake and goals'}
              </p>
            </div>

            {activeView !== 'dashboard' && (
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
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

      {/* Quick Log Meal Modal */}
      {showQuickLogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Quick Log Meal</h2>
                <button
                  onClick={() => setShowQuickLogModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Meal Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mealName}
                    onChange={(e) => setFormData({ ...formData, mealName: e.target.value })}
                    placeholder="e.g., Chicken and Rice"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Meal Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Type
                  </label>
                  <select
                    value={formData.mealType}
                    onChange={(e) => setFormData({ ...formData, mealType: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.mealDate}
                    onChange={(e) => setFormData({ ...formData, mealDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Optional Fields - Collapsed by default */}
                <details className="border border-gray-200 rounded-md">
                  <summary className="px-4 py-2 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
                    Optional Details
                  </summary>
                  <div className="p-4 space-y-4 border-t border-gray-200">
                    {/* Protein */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Protein Source
                      </label>
                      <input
                        type="text"
                        value={formData.protein}
                        onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                        placeholder="e.g., Chicken, Salmon, Tofu"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    {/* Carbohydrate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Carbohydrate Source
                      </label>
                      <input
                        type="text"
                        value={formData.carbohydrate}
                        onChange={(e) => setFormData({ ...formData, carbohydrate: e.target.value })}
                        placeholder="e.g., Rice, Pasta, Potato"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    {/* Vegetable */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vegetable Source
                      </label>
                      <input
                        type="text"
                        value={formData.vegetable}
                        onChange={(e) => setFormData({ ...formData, vegetable: e.target.value })}
                        placeholder="e.g., Broccoli, Carrots"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    {/* Calories */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Calories
                      </label>
                      <input
                        type="number"
                        value={formData.estimatedCalories || ''}
                        onChange={(e) => setFormData({ ...formData, estimatedCalories: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="e.g., 500"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={formData.mealNotes}
                        onChange={(e) => setFormData({ ...formData, mealNotes: e.target.value })}
                        placeholder="Any additional notes..."
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                </details>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowQuickLogModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickLogMeal}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={isLoading || !formData.mealName}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Log Meal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealsDashboard;
