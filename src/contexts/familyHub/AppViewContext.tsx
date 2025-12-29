'use client'

import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { useFamilyStore } from '@/store/familyStore';

export type AppView = 'dashboard' | 'property' | 'calendar' | 'budget' | 'meals' | 'shopping' |
  'family' | 'goals' | 'news' | 'notifications' | string;

export type CalendarViewMode = 'month' | 'week' | 'day';

interface AppViewContextValue {
  currentView: AppView;
  currentSubView: string;
  calendarView: CalendarViewMode;
  currentDate: Date;
  selectedPerson: string;
  setView: (view: AppView) => void;
  setSubView: (subView: string) => void;
  setCalendarView: (view: CalendarViewMode) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedPerson: (personId: string) => void;
  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
}

const AppViewContext = createContext<AppViewContextValue | undefined>(undefined);

export const AppViewProvider = ({ children }: PropsWithChildren) => {
  const currentView = useFamilyStore((state) => state.currentView as AppView);
  const currentSubView = useFamilyStore((state) => state.currentSubView);
  const calendarView = useFamilyStore((state) => state.calendarView as CalendarViewMode);
  const currentDate = useFamilyStore((state) => state.currentDate);
  const selectedPerson = useFamilyStore((state) => state.selectedPerson);

  const setCurrentView = useFamilyStore((state) => state.setCurrentView);
  const setCurrentSubView = useFamilyStore((state) => state.setCurrentSubView);
  const setCalendarViewStore = useFamilyStore((state) => state.setCalendarView);
  const setCurrentDateStore = useFamilyStore((state) => state.setCurrentDate);
  const setSelectedPersonStore = useFamilyStore((state) => state.setSelectedPerson);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const value = useMemo<AppViewContextValue>(() => ({
    currentView,
    currentSubView,
    calendarView,
    currentDate: currentDate ?? new Date(), // Fallback to current date if not hydrated yet
    selectedPerson,
    setView: (view: AppView) => setCurrentView(view),
    setSubView: setCurrentSubView,
    setCalendarView: setCalendarViewStore,
    setCurrentDate: setCurrentDateStore,
    setSelectedPerson: setSelectedPersonStore,
    isMobileMenuOpen,
    openMobileMenu: () => setIsMobileMenuOpen(true),
    closeMobileMenu: () => setIsMobileMenuOpen(false),
  }), [
    calendarView,
    currentDate,
    currentSubView,
    currentView,
    selectedPerson,
    isMobileMenuOpen,
    setCalendarViewStore,
    setCurrentDateStore,
    setCurrentSubView,
    setCurrentView,
    setSelectedPersonStore,
  ]);

  return (
    <AppViewContext.Provider value={value}>
      {children}
    </AppViewContext.Provider>
  );
};

export const useAppView = () => {
  const context = useContext(AppViewContext);
  if (!context) {
    throw new Error('useAppView must be used within an AppViewProvider');
  }
  return context;
};
