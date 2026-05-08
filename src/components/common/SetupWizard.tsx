'use client'

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  ShoppingCart,
  Target,
  Utensils,
  Home,
  CheckCircle
} from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';

interface SetupWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

const STORAGE_KEY = 'familyHub_setupComplete';

const SetupWizard: React.FC<SetupWizardProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);

  // Shopping list form data
  const [shoppingListName, setShoppingListName] = useState('Weekly Groceries');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Food', 'Household']);

  // Goal form data
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState<'family' | 'individual'>('family');
  const [goalDescription, setGoalDescription] = useState('');

  const steps = [
    {
      id: 0,
      title: 'Welcome to Omosanya Home',
      description: 'Let\'s get your family home board set up',
      icon: <Sparkles className="w-12 h-12 text-[#d8527d]" />,
    },
    {
      id: 1,
      title: 'Shopping Lists',
      description: 'Create your first shopping list',
      icon: <ShoppingCart className="w-12 h-12 text-[#147c72]" />,
    },
    {
      id: 2,
      title: 'Family Goals',
      description: 'Set up a goal to track progress',
      icon: <Target className="w-12 h-12 text-[#2f7d5b]" />,
    },
    {
      id: 3,
      title: 'Quick Meal Logging',
      description: 'Learn about meal planning features',
      icon: <Utensils className="w-12 h-12 text-[#f3b33d]" />,
    },
    {
      id: 4,
      title: 'All Set!',
      description: 'You\'re ready to start using Omosanya Home',
      icon: <CheckCircle className="w-12 h-12 text-[#2f7d5b]" />,
    },
  ];

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'skipped');
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateShoppingList = async () => {
    if (!familyId || !shoppingListName.trim()) {
      alert('Please enter a list name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/families/${familyId}/shopping-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listName: shoppingListName,
          category: selectedCategories[0] || 'General',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create shopping list');
      }

      // Add some default items
      const list = await response.json();
      const defaultItems = selectedCategories.includes('Food')
        ? ['Milk', 'Bread', 'Eggs', 'Fruits', 'Vegetables']
        : ['Cleaning Supplies', 'Paper Towels', 'Soap'];

      for (const itemName of defaultItems) {
        await fetch(`/api/families/${familyId}/shopping-lists/${list.id}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemName,
            category: selectedCategories[0] || 'General',
          }),
        });
      }

      handleNext();
    } catch (error) {
      console.error('Error creating shopping list:', error);
      alert('Failed to create shopping list. You can create one later from the Basket page.');
      handleNext();
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!familyId || !goalTitle.trim()) {
      alert('Please enter a goal title');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/families/${familyId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: goalTitle,
          description: goalDescription,
          type: goalType,
          targetValue: '100',
          currentProgress: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create goal');
      }

      handleNext();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal. You can create one later from the Quests page.');
      handleNext();
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'completed');
    onComplete();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {steps[0].icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-slate-100">
                Welcome to Omosanya Home
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                This quick setup will help you get started with the most important features.
                You can skip this at any time and explore on your own.
              </p>
            </div>
            <div className="bg-[#eaf1e7] border border-[#147c72]/30 rounded-lg p-4 text-left dark:bg-[#14231f] dark:border-[#56c6b8]/30">
              <h3 className="font-semibold text-[#0f625a] mb-2 dark:text-[#56c6b8]">What you'll set up:</h3>
              <ul className="space-y-2 text-sm text-[#147c72] dark:text-[#a8d8d0]">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Create your first shopping list
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Set a family or personal goal
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Learn about meal planning
                </li>
              </ul>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {steps[1].icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-slate-100">
                Create Your First Shopping List
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                Shopping lists help you organize what you need to buy and track your spending.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                  List Name
                </label>
                <input
                  type="text"
                  value={shoppingListName}
                  onChange={(e) => setShoppingListName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#147c72]"
                  placeholder="e.g., Weekly Groceries"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                  Categories (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Food', 'Household', 'Clothing', 'School', 'Activities'].map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategories((prev) =>
                          prev.includes(category)
                            ? prev.filter((c) => c !== category)
                            : [...prev, category]
                        );
                      }}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        selectedCategories.includes(category)
                          ? 'bg-[#eaf1e7] border-[#147c72] text-[#147c72]'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-slate-950 dark:border-slate-800">
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  <strong className="text-gray-900 dark:text-slate-100">Tip:</strong> We'll add some common items to get you started.
                  You can customize your list anytime from the Basket page.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {steps[2].icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-slate-100">
                Set Your First Goal
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                Track family goals together or set individual goals for each member.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                  Goal Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGoalType('family')}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      goalType === 'family'
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Family Goal
                  </button>
                  <button
                    onClick={() => setGoalType('individual')}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      goalType === 'individual'
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Individual Goal
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#147c72]"
                  placeholder={goalType === 'family' ? 'e.g., Family Fitness Challenge' : 'e.g., Read 12 Books This Year'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                  Description (optional)
                </label>
                <textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#147c72]"
                  rows={3}
                  placeholder="Describe your goal..."
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-slate-950 dark:border-slate-800">
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  <strong className="text-gray-900 dark:text-slate-100">Tip:</strong> You can add more details, set milestones, and track progress from the Quests page.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {steps[3].icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-slate-100">
                Quick Meal Logging
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                Easily track what your family eats with our Quick Log Meal feature.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#fff7e6] to-[#eaf1e7] border border-[#f3b33d]/40 rounded-lg p-6 dark:from-slate-950 dark:to-[#14231f] dark:border-[#f3b33d]/30">
                <h3 className="font-semibold text-[#263730] mb-3 flex items-center gap-2 dark:text-slate-100">
                  <Utensils className="w-5 h-5" />
                  How it works:
                </h3>
                <ol className="space-y-3 text-sm text-[#263730] dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#f3b33d] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <span>
                      Click the <strong>"Quick Log Meal"</strong> button on the Meals page
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#f3b33d] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <span>
                      Enter the meal name and optionally add protein, carbs, vegetables, and calories
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#f3b33d] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <span>
                      Track your family's nutrition and meal patterns over time
                    </span>
                  </li>
                </ol>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 mb-2 dark:text-slate-100">Additional Features:</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2f7d5b]" />
                    Plan meals for the week ahead
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2f7d5b]" />
                    Save favorite recipes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2f7d5b]" />
                    Generate shopping lists from meal plans
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2f7d5b]" />
                    Track nutritional intake
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {steps[4].icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 dark:text-slate-100">
                You're All Set!
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                You've completed the setup wizard and are ready to use Omosanya Home.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left dark:bg-[#14231f] dark:border-[#56c6b8]/30">
              <h3 className="font-semibold text-green-900 mb-3 dark:text-[#56c6b8]">What's next?</h3>
              <div className="space-y-3 text-sm text-green-800 dark:text-[#a8d8d0]">
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Explore the Today board:</strong> Get an overview of your family's activities, goals, and schedules.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Manage Shopping Lists:</strong> Add items, track spending, and compare prices.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Track Goals:</strong> Update progress, add milestones, and celebrate achievements.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Utensils className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Plan Meals:</strong> Log meals, plan ahead, and maintain healthy eating habits.
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-slate-400">
              You can always access help and settings from the navigation menu.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`h-2 rounded-full transition-all ${
            index === currentStep
              ? 'w-8 bg-[#147c72]'
              : index < currentStep
              ? 'w-2 bg-[#147c72]'
              : 'w-2 bg-gray-300'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Omosanya Home Setup</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors dark:text-slate-500 dark:hover:text-slate-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-6">
          {renderProgressIndicator()}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between dark:border-slate-800 dark:bg-slate-950">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium dark:text-slate-300 dark:hover:text-slate-100"
          >
            Skip Setup
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {currentStep === 0 && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-[#147c72] text-white rounded-lg hover:bg-[#0f625a] transition-colors"
              >
                Get Started
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 1 && (
              <button
                onClick={handleCreateShoppingList}
                disabled={isCreating || !shoppingListName.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-[#147c72] text-white rounded-lg hover:bg-[#0f625a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create List
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {currentStep === 2 && (
              <button
                onClick={handleCreateGoal}
                disabled={isCreating || !goalTitle.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-[#147c72] text-white rounded-lg hover:bg-[#0f625a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Goal
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-[#147c72] text-white rounded-lg hover:bg-[#0f625a] transition-colors"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 4 && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2 bg-[#147c72] text-white rounded-lg hover:bg-[#0f625a] transition-colors"
              >
                <Check className="w-4 h-4" />
                Start Using Omosanya Home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to check if setup has been completed
export const hasCompletedSetup = (): boolean => {
  if (typeof window === 'undefined') return true; // SSR
  const status = localStorage.getItem(STORAGE_KEY);
  return status === 'completed' || status === 'skipped';
};

// Helper function to reset setup status (for testing)
export const resetSetupStatus = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export default SetupWizard;
