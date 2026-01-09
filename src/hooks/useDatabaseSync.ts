'use client'

import { useEffect, useRef } from 'react';
import { useFamilyStore, FamilyState, BudgetData, MealPlanning, ShoppingList, GoalsData } from '@/store/familyStore';
import databaseService from '@/services/databaseService';
import { createId } from '@/utils/id';

const SHOULD_SEED_E2E = process.env.NEXT_PUBLIC_E2E_SEED === 'true';
const E2E_SEED_KEY = 'familyHub_e2eSeeded';

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('Failed to parse cached data', error);
    return fallback;
  }
};

const readCacheArray = <T,>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  const parsed = safeJsonParse<T[] | unknown>(localStorage.getItem(key), []);
  return Array.isArray(parsed) ? parsed : [];
};

const readCacheObject = <T extends Record<string, any>>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  const parsed = safeJsonParse<T | unknown>(localStorage.getItem(key), null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as T;
};

const normaliseMember = (member: any, familyId?: string) => {
  const now = new Date().toISOString();
  const name =
    member?.name ??
    member?.displayName ??
    [member?.firstName, member?.lastName].filter(Boolean).join(' ') ??
    'Family Member';
  const role = member?.role ?? 'Family Member';
  const ageGroup = member?.ageGroup ?? member?.age ?? 'Adult';

  return {
    id: member?.id ?? createId('member'),
    familyId: member?.familyId ?? familyId ?? 'local-family',
    name,
    role,
    ageGroup,
    dateOfBirth: member?.dateOfBirth ?? undefined,
    age: member?.age ?? undefined,
    avatarUrl: member?.avatarUrl ?? undefined,
    color: member?.color ?? '#2563eb',
    icon: member?.icon ?? '👤',
    fitnessGoals: member?.fitnessGoals ?? {},
    createdAt: member?.createdAt ?? now,
    updatedAt: member?.updatedAt ?? now,
  };
};

const normaliseMilestone = (milestone: any, familyId?: string) => {
  const now = new Date().toISOString();
  const dateValue = milestone?.date ? new Date(milestone.date) : null;
  const date = dateValue && !Number.isNaN(dateValue.getTime())
    ? dateValue.toISOString().split('T')[0]
    : now.split('T')[0];

  return {
    id: milestone?.id ?? createId('milestone'),
    familyId: milestone?.familyId ?? familyId ?? 'local-family',
    title: milestone?.title ?? 'Untitled Milestone',
    description: milestone?.description ?? '',
    date,
    type: milestone?.type ?? 'family_event',
    participants: Array.isArray(milestone?.participants) ? milestone.participants : [],
    photos: Array.isArray(milestone?.photos) ? milestone.photos : [],
    tags: Array.isArray(milestone?.tags) ? milestone.tags : [],
    isRecurring: Boolean(milestone?.isRecurring),
    reminderDays: Array.isArray(milestone?.reminderDays) ? milestone.reminderDays : [],
    isPrivate: Boolean(milestone?.isPrivate),
    createdBy: milestone?.createdBy ?? undefined,
    createdAt: milestone?.createdAt ? new Date(milestone.createdAt).toISOString() : now,
    updatedAt: milestone?.updatedAt ? new Date(milestone.updatedAt).toISOString() : now,
  };
};

const normaliseBudgetEntry = (entry: any, fallbackId: string, kind?: 'income' | 'expense') => {
  const name = entry?.incomeName ?? entry?.expenseName ?? entry?.name ?? 'Budget Item';
  return {
    id: entry?.id ?? fallbackId,
    name,
    incomeName: entry?.incomeName ?? (kind === 'income' ? name : undefined),
    expenseName: entry?.expenseName ?? (kind === 'expense' ? name : undefined),
    amount: Number(entry?.amount ?? 0),
    category: entry?.category ?? 'Other',
    isRecurring: Boolean(entry?.isRecurring),
    paymentDate: entry?.paymentDate ?? entry?.date ?? undefined,
    recurringStartDate: entry?.recurringStartDate ?? undefined,
    recurringEndDate: entry?.recurringEndDate ?? undefined,
    personId: entry?.personId ?? entry?.person ?? undefined,
    budgetLimit: entry?.budgetLimit ?? undefined,
    isReceiptScan: Boolean(entry?.isReceiptScan),
    receiptScanDate: entry?.receiptScanDate ?? undefined,
    type: kind ?? entry?.type,
    createdAt: entry?.createdAt ?? new Date().toISOString(),
  };
};

const buildBudgetData = (incomeItems: any[], expenseItems: any[]): BudgetData => {
  const recurringIncome: Record<string, any> = {};
  const oneTimeIncome: any[] = [];
  const recurringExpenses: Record<string, any> = {};
  const oneTimeExpenses: any[] = [];

  incomeItems.forEach((item, index) => {
    const record = normaliseBudgetEntry(item, `income-${index}`, 'income');
    if (record.isRecurring) {
      recurringIncome[record.id] = record;
    } else {
      oneTimeIncome.push(record);
    }
  });

  expenseItems.forEach((item, index) => {
    const record = normaliseBudgetEntry(item, `expense-${index}`, 'expense');
    if (record.isRecurring) {
      recurringExpenses[record.id] = record;
    } else {
      oneTimeExpenses.push(record);
    }
  });

  return {
    income: {
      monthly: recurringIncome,
      oneTime: oneTimeIncome,
    },
    expenses: {
      recurringMonthly: recurringExpenses,
      oneTimeSpends: oneTimeExpenses,
    },
    priorMonths: {},
    budgetLimits: {},
    actualSpend: {},
  };
};

const normaliseMealPlanning = (planning: any): MealPlanning => {
  const base = planning && typeof planning === 'object' ? planning : {};
  return {
    planned: base.planned && typeof base.planned === 'object' ? base.planned : {},
    eaten: base.eaten && typeof base.eaten === 'object' ? base.eaten : {},
    components: base.components && typeof base.components === 'object'
      ? {
          proteins: Array.isArray(base.components.proteins) ? base.components.proteins : [],
          grains: Array.isArray(base.components.grains) ? base.components.grains : [],
          carbs: Array.isArray(base.components.carbs) ? base.components.carbs : [],
          vegetables: Array.isArray(base.components.vegetables) ? base.components.vegetables : [],
        }
      : { proteins: [], grains: [], carbs: [], vegetables: [] },
    favorites: Array.isArray(base.favorites) ? base.favorites : [],
  };
};

const buildMealPlanningFromMeals = (meals: any[], base?: MealPlanning | null): MealPlanning => {
  const planning = normaliseMealPlanning(base ?? {});

  meals.forEach((meal, index) => {
    const dateValue = meal?.mealDate ? new Date(meal.mealDate) : null;
    if (!dateValue || Number.isNaN(dateValue.getTime())) return;
    const dateKey = dateValue.toISOString().split('T')[0];
    const entry = {
      id: meal?.id ?? `meal-${dateKey}-${index}`,
      name: meal?.mealName ?? meal?.name ?? 'Meal',
      protein: meal?.proteinSource ?? meal?.protein ?? '',
      carb: meal?.carbohydrateSource ?? meal?.carb ?? '',
      veg: meal?.vegetableSource ?? meal?.veg ?? '',
      calories: meal?.estimatedCalories ?? meal?.calories ?? 0,
      notes: meal?.mealNotes ?? meal?.notes ?? '',
      eaten: Boolean(meal?.isEaten ?? meal?.eaten),
    };

    if (entry.eaten) {
      planning.eaten[dateKey] = entry;
      delete planning.planned[dateKey];
    } else {
      planning.planned[dateKey] = entry;
      delete planning.eaten[dateKey];
    }
  });

  return planning;
};

const normaliseShoppingLists = (lists: any[]): ShoppingList[] => {
  return lists.map((list, index) => {
    const items = Array.isArray(list?.items) ? list.items : [];
    const mappedItems = items.map((item: any, itemIndex: number) => ({
      id: item?.id ?? `item-${index}-${itemIndex}`,
      name: item?.itemName ?? item?.name ?? 'Item',
      completed: Boolean(item?.isCompleted ?? item?.completed),
      price: Number(item?.estimatedPrice ?? item?.price ?? 0),
      category: item?.category ?? 'General',
      person: item?.personId ?? item?.person ?? undefined,
      frequency: item?.frequency ?? undefined,
    }));

    const estimatedTotal = mappedItems.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
    const total = mappedItems
      .filter((item: { completed: boolean }) => item.completed)
      .reduce((sum: number, item: { price: number }) => sum + item.price, 0);

    return {
      id: list?.id ?? `list-${index}`,
      name: list?.listName ?? list?.name ?? 'Shopping List',
      listName: list?.listName ?? list?.name ?? 'Shopping List',
      category: list?.category ?? 'General',
      items: mappedItems as any,
      total,
      estimatedTotal,
      lastWeekSpent: Number(list?.lastWeekSpent ?? 0),
      avgWeeklySpend: Number(list?.avgWeeklySpend ?? 0),
      storeChain: list?.storeChain ?? null,
      customStore: list?.customStore ?? null,
      isActive: list?.isActive ?? true,
      createdAt: list?.createdAt ?? undefined,
    };
  });
};

const seedE2EBudgetFixtures = () => {
  if (typeof window === 'undefined') return;
  if (!SHOULD_SEED_E2E) return;
  if (localStorage.getItem(E2E_SEED_KEY)) return;

  const now = new Date().toISOString();
  const incomeFixture = {
    id: 'e2e-income',
    incomeName: 'Playwright Income Search',
    amount: 1234.56,
    category: 'Playwright QA',
    isRecurring: false,
    paymentDate: now,
    createdAt: now,
  };
  const expenseFixture = {
    id: 'e2e-expense',
    expenseName: 'Playwright Filter Expense',
    amount: 87.75,
    category: 'Playwright QA',
    isRecurring: false,
    paymentDate: now,
    createdAt: now,
    isReceiptScan: false,
  };
  const receiptFixture = {
    id: 'e2e-receipt',
    expenseName: 'Playwright Receipt Expense',
    amount: 42.5,
    category: 'Playwright QA',
    isRecurring: false,
    paymentDate: now,
    createdAt: now,
    isReceiptScan: true,
    receiptScanDate: now,
  };

  const ensureFixture = (items: any[], fixture: any, key: string) => {
    if (items.some((item) => item?.[key] === fixture[key])) {
      return items;
    }
    return [...items, fixture];
  };

  const existingIncome = readCacheArray<any>('budgetIncome');
  const existingExpenses = readCacheArray<any>('budgetExpenses');
  const nextIncome = ensureFixture(existingIncome, incomeFixture, 'incomeName');
  const withExpense = ensureFixture(existingExpenses, expenseFixture, 'expenseName');
  const nextExpenses = ensureFixture(withExpense, receiptFixture, 'expenseName');

  localStorage.setItem('budgetIncome', JSON.stringify(nextIncome));
  localStorage.setItem('budgetExpenses', JSON.stringify(nextExpenses));
  localStorage.setItem(E2E_SEED_KEY, now);
};

const normaliseGoal = (goal: any, fallbackId: string) => {
  const createdAt = goal?.createdAt ? new Date(goal.createdAt).toISOString() : new Date().toISOString();
  const deadline = goal?.deadline ?? goal?.targetDate ?? null;
  const progress = Number(goal?.currentProgress ?? goal?.progress ?? 0);

  return {
    id: goal?.id ?? fallbackId,
    title: goal?.goalTitle ?? goal?.title ?? 'Goal',
    description: goal?.goalDescription ?? goal?.description ?? '',
    type: goal?.goalType ?? goal?.type ?? 'family',
    participants: Array.isArray(goal?.participants) ? goal.participants : [],
    progress,
    currentProgress: progress,
    targetValue: goal?.targetValue ?? goal?.target?.value ?? '',
    deadline,
    createdAt,
    updatedAt: goal?.updatedAt ? new Date(goal.updatedAt).toISOString() : createdAt,
  };
};

const buildGoalsData = (goals: any[], achievements: any[] = []): GoalsData => {
  const familyGoals: any[] = [];
  const individualGoals: any[] = [];

  goals.forEach((goal, index) => {
    const record = normaliseGoal(goal, `goal-${index}`);
    const type = String(record.type ?? '').toLowerCase();
    if (type === 'individual' || type === 'personal') {
      individualGoals.push(record);
    } else {
      familyGoals.push(record);
    }
  });

  return {
    familyGoals,
    individualGoals,
    achievements: Array.isArray(achievements) ? achievements : [],
    rewardSystem: {
      points: {},
      badges: {},
    },
  };
};

export const useDatabaseSync = () => {
  const setDatabaseStatus = useFamilyStore((state: FamilyState) => state.setDatabaseStatus);
  const setPeople = useFamilyStore((state: FamilyState) => state.setPeople);
  const setFamilyMilestones = useFamilyStore((state: FamilyState) => state.setFamilyMilestones);
  const setBudgetData = useFamilyStore((state: FamilyState) => state.setBudgetData);
  const setMealPlanning = useFamilyStore((state: FamilyState) => state.setMealPlanning);
  const setShoppingLists = useFamilyStore((state: FamilyState) => state.setShoppingLists);
  const setGoalsData = useFamilyStore((state: FamilyState) => state.setGoalsData);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initDatabase = async () => {
      console.log('🔄 Initializing database connection...');

      seedE2EBudgetFixtures();

      const hydrateFromCache = (familyId?: string) => {
        const storeState = useFamilyStore.getState();

        const cachedMembers = readCacheArray<any>('familyMembers');
        if (!storeState.people.length && cachedMembers.length) {
          setPeople(cachedMembers.map((member) => normaliseMember(member, familyId)));
        }

        const cachedMilestones = readCacheArray<any>('familyMilestones');
        if (!storeState.familyMilestones.length && cachedMilestones.length) {
          setFamilyMilestones(cachedMilestones.map((milestone) => normaliseMilestone(milestone, familyId)));
        }

        const cachedIncome = readCacheArray<any>('budgetIncome');
        const cachedExpenses = readCacheArray<any>('budgetExpenses');
        if (!storeState.budgetData && (cachedIncome.length || cachedExpenses.length)) {
          setBudgetData(buildBudgetData(cachedIncome, cachedExpenses));
        }

        const cachedMealPlanning = readCacheObject<MealPlanning>('mealPlanning');
        if (!storeState.mealPlanning && cachedMealPlanning) {
          setMealPlanning(normaliseMealPlanning(cachedMealPlanning));
        }

        const cachedShoppingLists = readCacheArray<any>('shoppingLists');
        if (!storeState.shoppingLists.length && cachedShoppingLists.length) {
          setShoppingLists(normaliseShoppingLists(cachedShoppingLists));
        }

        const cachedGoalsData = readCacheObject<GoalsData>('goalsData');
        const cachedGoals = readCacheArray<any>('familyGoals');
        const cachedAchievements = readCacheArray<any>('familyAchievements');
        if (!storeState.goalsData && cachedGoalsData) {
          setGoalsData(cachedGoalsData);
        } else if (!storeState.goalsData && (cachedGoals.length || cachedAchievements.length)) {
          setGoalsData(buildGoalsData(cachedGoals, cachedAchievements));
        }
      };

      const refreshFromDatabase = async (familyId: string, connected: boolean) => {
        if (!connected) return;

        const fetchBudget = async (kind: 'income' | 'expenses') => {
          const response = await fetch(`/api/families/${familyId}/budget/${kind}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch budget ${kind}`);
          }
          const payload = await response.json();
          return Array.isArray(payload) ? payload : [];
        };

        const results = await Promise.allSettled([
          databaseService.getGoals(),
          databaseService.getAchievements(),
          databaseService.getMeals(),
          databaseService.getShoppingLists(),
          fetchBudget('income'),
          fetchBudget('expenses'),
        ]);

        const goalsResult = results[0];
        const achievementsResult = results[1];
        const mealsResult = results[2];
        const listsResult = results[3];
        const incomeResult = results[4];
        const expensesResult = results[5];

        const goals = goalsResult.status === 'fulfilled' && Array.isArray(goalsResult.value)
          ? goalsResult.value
          : [];
        const achievements = achievementsResult.status === 'fulfilled' && Array.isArray(achievementsResult.value)
          ? achievementsResult.value
          : [];
        const meals = mealsResult.status === 'fulfilled' && Array.isArray(mealsResult.value)
          ? mealsResult.value
          : [];
        const lists = listsResult.status === 'fulfilled' && Array.isArray(listsResult.value)
          ? listsResult.value
          : [];
        const income = incomeResult.status === 'fulfilled' && Array.isArray(incomeResult.value)
          ? incomeResult.value
          : [];
        const expenses = expensesResult.status === 'fulfilled' && Array.isArray(expensesResult.value)
          ? expensesResult.value
          : [];

        if (income.length || expenses.length) {
          const nextBudgetData = buildBudgetData(income, expenses);
          setBudgetData(nextBudgetData);
          localStorage.setItem('budgetIncome', JSON.stringify(income));
          localStorage.setItem('budgetExpenses', JSON.stringify(expenses));
        }

        if (meals.length) {
          const nextMealPlanning = buildMealPlanningFromMeals(
            meals,
            useFamilyStore.getState().mealPlanning
          );
          setMealPlanning(nextMealPlanning);
          localStorage.setItem('mealPlanning', JSON.stringify(nextMealPlanning));
        }

        if (lists.length) {
          const nextLists = normaliseShoppingLists(lists);
          setShoppingLists(nextLists);
          localStorage.setItem('shoppingLists', JSON.stringify(nextLists));
        }

        if (goals.length || achievements.length) {
          const nextGoalsData = buildGoalsData(goals, achievements);
          setGoalsData(nextGoalsData);
          localStorage.setItem('goalsData', JSON.stringify(nextGoalsData));
          localStorage.setItem('familyGoals', JSON.stringify(goals));
          localStorage.setItem('familyAchievements', JSON.stringify(achievements));
        }
      };

      let connected = false;
      let resolvedFamilyId: string | undefined;

      try {
        connected = await databaseService.initialize();
        const status = databaseService.getStatus();
        resolvedFamilyId = status.familyId ?? localStorage.getItem('familyId') ?? undefined;

        if (connected) {
          console.log('✅ Database connected:', status);
          setDatabaseStatus({
            connected: true,
            familyId: resolvedFamilyId ?? null,
            mode: 'database',
          });
        } else {
          console.log('📦 Falling back to localStorage mode');
          // Try to get familyId from localStorage for offline operation
          setDatabaseStatus({
            connected: false,
            familyId: resolvedFamilyId ?? null,
            mode: 'localStorage',
          });
        }
      } catch (error) {
        console.error('Database initialization failed:', error);
        const storedFamilyId = localStorage.getItem('familyId');
        setDatabaseStatus({
          connected: false,
          familyId: storedFamilyId,
          mode: 'localStorage',
        });
        resolvedFamilyId = storedFamilyId ?? undefined;
      } finally {
        hydrateFromCache(resolvedFamilyId);
        if (resolvedFamilyId) {
          await refreshFromDatabase(resolvedFamilyId, connected);
        }
      }
    };

    initDatabase();
  }, [setDatabaseStatus]);
};
