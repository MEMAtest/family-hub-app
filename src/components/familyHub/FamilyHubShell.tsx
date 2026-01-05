'use client'

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  DollarSign,
  Home,
  Building2,
  ShoppingCart,
  UtensilsCrossed,
  Users,
  Target,
  Newspaper,
  Plus,
  ShoppingBag,
  Dumbbell,
  Wrench,
} from 'lucide-react';
import { FamilyHubNavigation, NavItem } from './FamilyHubNavigation';
import { FamilyHubHeader } from './FamilyHubHeader';
import { DashboardView } from './views/DashboardView';
import { CalendarView } from './views/CalendarView';
import { BudgetView } from './views/BudgetView';
import { MealsView } from './views/MealsView';
import { ShoppingView } from './views/ShoppingView';
import { GoalsView } from './views/GoalsView';
import { FamilyView } from './views/FamilyView';
import { NewsView } from './views/NewsView';
import { PropertyView } from './views/PropertyView';
import { FitnessView } from './views/FitnessView';
import { FamilyHubModals } from './FamilyHubModals';
import Breadcrumb from '@/components/common/Breadcrumb';
import SetupWizard from '@/components/common/SetupWizard';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useBudgetContext } from '@/contexts/familyHub/BudgetContext';
import { useShoppingContext } from '@/contexts/familyHub/ShoppingContext';
import { useContractorContext } from '@/contexts/familyHub/ContractorContext';
import { useDatabaseSync } from '@/hooks/useDatabaseSync';
import { useClientTime } from '@/hooks/useClientTime';
import { formatDateConsistent } from '@/utils/date';
import { useFamilyStore } from '@/store/familyStore';
import { DebugPanel } from '@/components/DebugPanel';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { useSearchParams } from 'next/navigation';

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'property', label: 'Tremaine Improvements', icon: Building2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'news', label: 'News', icon: Newspaper },
];

const SHOULD_SKIP_SETUP =
  process.env.NEXT_PUBLIC_SKIP_SETUP === 'true' ||
  process.env.NEXT_PUBLIC_E2E === 'true';

export const FamilyHubShell = () => {
  useDatabaseSync();

  const {
    currentView,
    currentSubView,
    setView,
    setSubView,
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,
  } = useAppView();
  const { clientTime, isClient } = useClientTime();
  const databaseStatus = useFamilyStore((state) => state.databaseStatus);
  const [familyName, setFamilyName] = useState('Family');
  const searchParams = useSearchParams();
  const appliedViewParam = useRef(false);

  const { openCreateForm } = useCalendarContext();
  const { openForm: openBudgetForm } = useBudgetContext();
  const { openForm: openShoppingForm, lists } = useShoppingContext();
  const { openQuickAppointment } = useContractorContext();

  // Setup Wizard state
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          if (registration.waiting) {
            registration.waiting.postMessage('SKIP_WAITING');
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedName = localStorage.getItem('familyName');
    if (storedName) {
      setFamilyName(storedName);
    }

    if (!databaseStatus.familyId) return;

    const controller = new AbortController();

    const loadFamilyName = async () => {
      try {
        const response = await fetch('/api/families', { signal: controller.signal });
        if (!response.ok) return;
        const families = await response.json();
        if (!Array.isArray(families)) return;
        const match = families.find((family: { id: string }) => family.id === databaseStatus.familyId);
        if (match?.familyName) {
          setFamilyName(match.familyName);
          localStorage.setItem('familyName', match.familyName);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load family name:', error);
        }
      }
    };

    loadFamilyName();

    return () => controller.abort();
  }, [databaseStatus.familyId]);

  useEffect(() => {
    if (appliedViewParam.current) return;
    const viewParam = searchParams.get('view');
    if (viewParam && viewParam !== currentView) {
      setView(viewParam);
    }
    appliedViewParam.current = true;
  }, [currentView, searchParams, setView]);

  // Check if setup wizard should be shown on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (SHOULD_SKIP_SETUP) {
        localStorage.setItem('familyHub_setupComplete', 'skipped');
        return;
      }
      const setupComplete = localStorage.getItem('familyHub_setupComplete');
      if (!setupComplete) {
        // Show wizard after a brief delay for better UX
        setTimeout(() => setShowSetupWizard(true), 1000);
      }
    }
  }, []);

  const rightContent = useMemo(() => (
    <div className="hidden items-center gap-2 lg:flex">
      <button
        onClick={() => openCreateForm()}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        <Plus className="h-4 w-4" /> Event
      </button>
      <button
        onClick={openQuickAppointment}
        className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        <Wrench className="h-4 w-4" /> Contractor
      </button>
      <button
        onClick={() => openBudgetForm()}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <DollarSign className="h-4 w-4" /> Expense
      </button>
      <button
        onClick={() => openShoppingForm(lists[0]?.id)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <ShoppingBag className="h-4 w-4" /> Item
      </button>
    </div>
  ), [lists, openBudgetForm, openCreateForm, openQuickAppointment, openShoppingForm]);

  const subtitle = useMemo(() => {
    if (!isClient || !clientTime) return 'Loading family insights…';
    return formatDateConsistent(clientTime);
  }, [clientTime, isClient]);

  const headerTitle = useMemo(() => {
    const trimmed = familyName.trim();
    const baseName = trimmed.length > 0 ? trimmed : 'Family';
    const normalized = baseName.toLowerCase().includes('family') ? baseName : `${baseName} Family`;
    return `${normalized} Hub`;
  }, [familyName]);

  const content = useMemo(() => {
    switch (currentView) {
      case 'calendar':
        return <CalendarView />;
      case 'property':
        return <PropertyView />;
      case 'budget':
        return <BudgetView />;
      case 'meals':
        return <MealsView />;
      case 'shopping':
        return <ShoppingView />;
      case 'fitness':
        return <FitnessView />;
      case 'goals':
        return <GoalsView />;
      case 'family':
        return <FamilyView />;
      case 'news':
        return <NewsView />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  }, [currentView]);

  const breadcrumbItems = useMemo(() => {
    if (currentView === 'dashboard') return [];

    const labels: Record<string, string> = {
      calendar: 'Calendar',
      budget: 'Budget',
      meals: 'Meals',
      shopping: 'Shopping',
      fitness: 'Fitness',
      goals: 'Goals',
      family: 'Family',
      news: 'News',
      property: '21 Tremaine Road',
    };

    const items: Array<{ label: string; onClick?: () => void; isActive?: boolean }> = [];
    const label = labels[currentView] ?? currentView;
    items.push({ label, isActive: !currentSubView, onClick: currentSubView ? () => setSubView('') : undefined });

    if (currentSubView) {
      items.push({ label: currentSubView, isActive: true });
    }

    return items;
  }, [currentSubView, currentView, setSubView]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-50 dark:bg-slate-950">
      <FamilyHubNavigation
        items={NAV_ITEMS}
        activeId={currentView}
        onSelect={setView}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      <div className="flex flex-1 flex-col min-w-0 bg-white dark:bg-slate-900">
        <FamilyHubHeader
          title={headerTitle}
          subtitle={subtitle}
          onToggleMobileNav={openMobileMenu}
          rightContent={rightContent}
          databaseStatus={databaseStatus}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 sm:pb-24 lg:pb-0">
          {currentView !== 'dashboard' && breadcrumbItems.length > 0 && (
            <div className="px-3 pt-3 sm:px-4 sm:pt-4 lg:px-8">
              <Breadcrumb
                items={breadcrumbItems}
                onHomeClick={() => setView('dashboard')}
              />
            </div>
          )}
          {content}
        </main>
      </div>

      <FamilyHubModals />
      <DebugPanel />
      <PWAInstallPrompt />

      {/* Setup Wizard */}
      {showSetupWizard && (
        <SetupWizard
          onClose={() => setShowSetupWizard(false)}
          onComplete={() => setShowSetupWizard(false)}
        />
      )}
    </div>
  );
};
