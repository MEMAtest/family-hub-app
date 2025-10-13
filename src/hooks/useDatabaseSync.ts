'use client'

import { useEffect } from 'react';
import databaseService from '@/services/databaseService';
import { useFamilyStore, FamilyState } from '@/store/familyStore';

export const useDatabaseSync = () => {
  const setDatabaseStatus = useFamilyStore((state: FamilyState) => state.setDatabaseStatus);
  const setEvents = useFamilyStore((state: FamilyState) => state.setEvents);
  const setPeople = useFamilyStore((state: FamilyState) => state.setPeople);

  useEffect(() => {
    const initDatabase = async () => {
      if (typeof window === 'undefined') return;

      console.log('🔄 Starting database initialization...');

      try {
        const connected = await databaseService.initialize();
        const status = databaseService.getStatus();
        setDatabaseStatus(status);

        console.log('Database status:', status);

        if (connected && status.familyId) {
          console.log('✅ Database connected, fetching data from API...');

          // Fetch directly from API instead of relying on localStorage
          try {
            const [eventsResponse, membersResponse, incomeResponse, expensesResponse] = await Promise.all([
              fetch(`/api/families/${status.familyId}/events`),
              fetch(`/api/families/${status.familyId}/members`),
              fetch(`/api/families/${status.familyId}/budget/income`),
              fetch(`/api/families/${status.familyId}/budget/expenses`)
            ]);

            if (eventsResponse.ok && membersResponse.ok && incomeResponse.ok && expensesResponse.ok) {
              const events = await eventsResponse.json();
              const members = await membersResponse.json();
              const income = await incomeResponse.json();
              const expenses = await expensesResponse.json();

              console.log(`📅 API returned ${events.length} events`);
              console.log(`👥 API returned ${members.length} members`);
              console.log(`💰 API returned ${income.length} income items`);
              console.log(`💸 API returned ${expenses.length} expense items`);

              // Update store with events and members
              setEvents(events);
              setPeople(members);

              // Transform and update budget data
              const budgetData = {
                income: {
                  monthly: income.filter((inc: any) => inc.isRecurring).reduce((acc: any, inc: any) => {
                    acc[inc.id] = inc;
                    return acc;
                  }, {}),
                  oneTime: income.filter((inc: any) => !inc.isRecurring),
                },
                expenses: {
                  recurringMonthly: expenses.filter((exp: any) => exp.isRecurring).reduce((acc: any, exp: any) => {
                    acc[exp.id] = exp;
                    return acc;
                  }, {}),
                  oneTimeSpends: expenses.filter((exp: any) => !exp.isRecurring),
                },
                priorMonths: {},
                budgetLimits: {},
                actualSpend: {},
              };

              const setBudgetData = require('@/store/familyStore').useFamilyStore.getState().setBudgetData;
              setBudgetData(budgetData);

              console.log('✅ All data loaded successfully from database');
            } else {
              console.error('Failed to fetch data from API', {
                eventsStatus: eventsResponse.status,
                membersStatus: membersResponse.status,
                incomeStatus: incomeResponse.status,
                expensesStatus: expensesResponse.status,
              });
            }
          } catch (fetchError) {
            console.error('Error fetching from API:', fetchError);
          }
        } else {
          console.log('⚠️ Database not connected, using localStorage');
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDatabaseStatus({ connected: false, familyId: null, mode: 'localStorage' });
      }
    };

    initDatabase();
  }, [setDatabaseStatus, setEvents, setPeople]);
};
