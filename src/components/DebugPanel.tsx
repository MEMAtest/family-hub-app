'use client'

import { useEffect } from 'react';
import { useFamilyStore } from '@/store/familyStore';

export const DebugPanel = () => {
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

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      background: 'black',
      color: 'lime',
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '300px',
    }}>
      <div>🐛 DEBUG</div>
      <div>Events: {events.length}</div>
      <div>People: {people.length}</div>
      <div>Income: {incomeCount}</div>
      <div>Expenses: {expensesCount}</div>
      <div>DB: {databaseStatus.connected ? '✅' : '❌'}</div>
      <div>Family: {databaseStatus.familyId?.slice(0, 8)}...</div>
    </div>
  );
};
