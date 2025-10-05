'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { ShoppingList } from '@/store/familyStore';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';

export interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  price: number;
  category: string;
  person?: string;
  frequency?: string;
}

export interface ShoppingHabits {
  templates: Record<string, ShoppingItem[]>;
  patterns: Record<string, unknown>;
  insights: {
    totalSpentThisWeek: number;
    totalSpentLastWeek: number;
    weeklyBudget: number;
    topCategories: Array<{ name: string; spent: number; percentage: number }>;
  };
}

export interface ShoppingFormState {
  listId: string;
  name: string;
  price: string;
  category: string;
}

interface ShoppingContextValue {
  lists: ShoppingList[];
  addList: (list: ShoppingList) => void;
  updateList: (id: string, updates: Partial<ShoppingList>) => void;
  deleteList: (id: string) => void;
  addItem: (listId: string, item: Omit<ShoppingItem, 'id' | 'completed'>) => void;
  toggleItem: (listId: string, itemId: string) => void;
  removeItem: (listId: string, itemId: string) => void;
  habits: ShoppingHabits;
  setHabits: (habits: ShoppingHabits) => void;
  isFormOpen: boolean;
  openForm: (listId?: string) => void;
  closeForm: () => void;
  formState: ShoppingFormState;
  setFormState: (updater: ShoppingFormState | ((prev: ShoppingFormState) => ShoppingFormState)) => void;
}

const INITIAL_FORM_STATE: ShoppingFormState = {
  listId: '',
  name: '',
  price: '',
  category: 'General',
};

const DEFAULT_HABITS: ShoppingHabits = {
  templates: {
    'Weekly Essentials': [
      { id: 'template-item-1', name: 'Chicken Breast', price: 6.99, category: 'Protein', frequency: 'weekly', completed: false },
      { id: 'template-item-2', name: 'Milk', price: 1.85, category: 'Dairy', frequency: 'twice-weekly', completed: false },
      { id: 'template-item-3', name: 'Bread', price: 1.2, category: 'Bakery', frequency: 'weekly', completed: false },
      { id: 'template-item-4', name: 'Bananas', price: 1.5, category: 'Fruit', frequency: 'weekly', completed: false },
      { id: 'template-item-5', name: 'Rice', price: 3.99, category: 'Grains', frequency: 'bi-weekly', completed: false },
    ],
  },
  patterns: {},
  insights: {
    totalSpentThisWeek: 35.42,
    totalSpentLastWeek: 42.18,
    weeklyBudget: 50,
    topCategories: [
      { name: 'Protein', spent: 12.5, percentage: 35 },
      { name: 'Vegetables', spent: 8.25, percentage: 23 },
      { name: 'Dairy', spent: 6.8, percentage: 19 },
    ],
  },
};

const ShoppingContext = createContext<ShoppingContextValue | undefined>(undefined);

export const ShoppingProvider = ({ children }: PropsWithChildren) => {
  const lists = useFamilyStore((state) => state.shoppingLists);
  const addListStore = useFamilyStore((state) => state.addShoppingList);
  const updateListStore = useFamilyStore((state) => state.updateShoppingList);
  const deleteListStore = useFamilyStore((state) => state.deleteShoppingList);

  const [habits, setHabitsState] = useState<ShoppingHabits>(DEFAULT_HABITS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormStateInternal] = useState<ShoppingFormState>(INITIAL_FORM_STATE);

  const setFormState = useCallback<ShoppingContextValue['setFormState']>((updater) => {
    setFormStateInternal((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  const addItem = useCallback<ShoppingContextValue['addItem']>((listId, item) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    const newItem: ShoppingItem = {
      id: createId('item'),
      completed: false,
      ...item,
      price: Number.isNaN(Number(item.price)) ? 0 : Number(item.price),
    };

    updateListStore(listId, {
      items: [...list.items, newItem] as any,
      estimatedTotal: (list.estimatedTotal || 0) + newItem.price,
    });

    setIsFormOpen(false);
    setFormStateInternal(INITIAL_FORM_STATE);
  }, [lists, updateListStore]);

  const toggleItem = useCallback((listId: string, itemId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    updateListStore(listId, {
      items: list.items.map((item: any) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    });
  }, [lists, updateListStore]);

  const removeItem = useCallback((listId: string, itemId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    updateListStore(listId, {
      items: list.items.filter((item: any) => item.id !== itemId),
    });
  }, [lists, updateListStore]);

  const openForm = useCallback((listId?: string) => {
    setFormStateInternal((prev) => ({ ...prev, listId: listId ?? '' }));
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setFormStateInternal(INITIAL_FORM_STATE);
  }, []);

  const value = useMemo<ShoppingContextValue>(() => ({
    lists,
    addList: addListStore,
    updateList: updateListStore,
    deleteList: deleteListStore,
    addItem,
    toggleItem,
    removeItem,
    habits,
    setHabits: setHabitsState,
    isFormOpen,
    openForm,
    closeForm,
    formState,
    setFormState,
  }), [
    addItem,
    addListStore,
    closeForm,
    deleteListStore,
    formState,
    habits,
    isFormOpen,
    lists,
    openForm,
    removeItem,
    setFormState,
    setHabitsState,
    toggleItem,
    updateListStore,
  ]);

  return (
    <ShoppingContext.Provider value={value}>
      {children}
    </ShoppingContext.Provider>
  );
};

export const useShoppingContext = () => {
  const context = useContext(ShoppingContext);
  if (!context) {
    throw new Error('useShoppingContext must be used within a ShoppingProvider');
  }
  return context;
};
