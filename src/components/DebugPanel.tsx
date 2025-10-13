'use client'

import { useEffect, useState } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';

export const DebugPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(() => {
    // Only show in development by default
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('debugPanelVisible');
      return savedState === 'true' || (savedState === null && process.env.NODE_ENV === 'development');
    }
    return process.env.NODE_ENV === 'development';
  });

  const events = useFamilyStore((state) => state.events);
  const people = useFamilyStore((state) => state.people);
  const budgetData = useFamilyStore((state) => state.budgetData);
  const databaseStatus = useFamilyStore((state) => state.databaseStatus);

  // Count budget items
  const incomeCount = budgetData ?
    (Object.keys(budgetData.income?.monthly || {}).length + (budgetData.income?.oneTime?.length || 0)) : 0;
  const expensesCount = budgetData ?
    (Object.keys(budgetData.expenses?.recurringMonthly || {}).length + (budgetData.expenses?.oneTimeSpends?.length || 0)) : 0;

  useEffect(() => {
    console.log('🐛 DEBUG PANEL - Store state:', {
      events: events.length,
      people: people.length,
      income: incomeCount,
      expenses: expensesCount,
      databaseConnected: databaseStatus.connected,
      familyId: databaseStatus.familyId,
    });

    if (budgetData) {
      console.log('🐛 Budget data:', budgetData);
    }
  }, [events, people, budgetData, databaseStatus, incomeCount, expensesCount]);

  const toggleVisibility = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    localStorage.setItem('debugPanelVisible', String(newState));
  };

  if (!isVisible) {
    // Show minimal toggle button when hidden
    return (
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 z-[9999] bg-black text-lime-500 rounded-full p-2 shadow-lg hover:bg-gray-900 transition-colors"
        title="Show debug panel"
      >
        <Bug className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 z-[9999] bg-black text-lime-500 font-mono text-xs shadow-2xl border-l border-t border-lime-500/30">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-lime-500/30">
        <div className="flex items-center gap-2">
          <Bug className="w-3 h-3" />
          <span className="font-bold">DEBUG</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:text-lime-400 transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          <button
            onClick={toggleVisibility}
            className="hover:text-red-500 transition-colors text-xs"
            title="Hide debug panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content - only show when expanded */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-1 max-w-xs">
          <div>Events: {events.length}</div>
          <div>People: {people.length}</div>
          <div>Income: {incomeCount}</div>
          <div>Expenses: {expensesCount}</div>
          <div>DB: {databaseStatus.connected ? '✅' : '❌'}</div>
          <div className="truncate">
            Family: {databaseStatus.familyId ? databaseStatus.familyId.slice(0, 8) + '...' : 'None'}
          </div>
        </div>
      )}

      {/* Minimized view */}
      {!isExpanded && (
        <div className="px-3 py-1 text-[10px]">
          DB: {databaseStatus.connected ? '✅' : '❌'} | {events.length}E | {people.length}P
        </div>
      )}
    </div>
  );
};
