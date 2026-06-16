'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
  Brain,
  ArrowUp,
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
import { ContractorView } from './views/ContractorView';
import { ProjectBrainView } from './views/ProjectBrainView';
import { FamilyHubModals } from './FamilyHubModals';
import Breadcrumb from '@/components/common/Breadcrumb';
import SetupWizard from '@/components/common/SetupWizard';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useBudgetContext } from '@/contexts/familyHub/BudgetContext';
import { useShoppingContext } from '@/contexts/familyHub/ShoppingContext';
import { useContractorContext } from '@/contexts/familyHub/ContractorContext';
import { useClientTime } from '@/hooks/useClientTime';
import { formatDateConsistent } from '@/utils/date';
import { useFamilyStore } from '@/store/familyStore';
import { DebugPanel } from '@/components/DebugPanel';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { useSearchParams } from 'next/navigation';

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Today', icon: Home, section: 'Home' },
  { id: 'calendar', label: 'Calendar', mobileLabel: 'Cal', icon: CalendarIcon, section: 'Home' },
  { id: 'family', label: 'Family', mobileLabel: 'People', icon: Users, section: 'Home' },
  { id: 'budget', label: 'Budget', mobileLabel: 'Money', icon: DollarSign, section: 'Plan' },
  { id: 'meals', label: 'Meals', mobileLabel: 'Meals', icon: UtensilsCrossed, section: 'Plan' },
  { id: 'shopping', label: 'Shopping', mobileLabel: 'Basket', icon: ShoppingCart, section: 'Plan' },
  { id: 'goals', label: 'Goals', mobileLabel: 'Quests', icon: Target, section: 'Plan' },
  { id: 'property', label: 'Property', icon: Building2, section: 'Household' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, section: 'Household' },
  { id: 'contractors', label: 'Contractors', icon: Wrench, section: 'Household' },
  { id: 'brain', label: 'Brain', icon: Brain, section: 'Household' },
  { id: 'news', label: 'News', icon: Newspaper, section: 'More' },
];

const SHOULD_SKIP_SETUP =
  process.env.NEXT_PUBLIC_SKIP_SETUP === 'true' ||
  process.env.NEXT_PUBLIC_E2E === 'true';

export const FamilyHubShell = () => {
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
  const mainRef = useRef<HTMLElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const { openCreateForm } = useCalendarContext();
  const { openForm: openBudgetForm } = useBudgetContext();
  const { openForm: openShoppingForm, lists } = useShoppingContext();
  const { openQuickAppointment } = useContractorContext();

  // Setup Wizard state
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
          .catch((error) => {
            console.warn('Failed to clear development service worker:', error);
          });
        return;
      }

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

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      const nestedScrolled = Array.from(main.querySelectorAll<HTMLElement>('*')).some((element) =>
        element.scrollTop > 360 && element.scrollHeight > element.clientHeight
      );
      setShowBackToTop(main.scrollTop > 360 || nestedScrolled);
    };

    handleScroll();
    main.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => main.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  const scrollMainToTop = useCallback(() => {
    const main = mainRef.current;
    if (!main) return;

    main.scrollTo({ top: 0, behavior: 'smooth' });
    main.querySelectorAll<HTMLElement>('*').forEach((element) => {
      if (element.scrollTop > 0 && element.scrollHeight > element.clientHeight) {
        element.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }, []);

  const handleSelectView = useCallback((view: string) => {
    setSubView('');
    setView(view);
    closeMobileMenu();
    window.requestAnimationFrame(scrollMainToTop);
  }, [closeMobileMenu, scrollMainToTop, setSubView, setView]);

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
        className="inline-flex items-center gap-2 rounded-lg bg-[#147c72] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0f625a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30"
      >
        <Plus className="h-4 w-4" /> Event
      </button>
      <button
        onClick={openQuickAppointment}
        className="inline-flex items-center gap-2 rounded-lg bg-[#f3b33d] px-3 py-2 text-sm font-semibold text-[#263730] shadow-sm hover:bg-[#e59a23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3b33d]/40"
      >
        <Wrench className="h-4 w-4" /> Contractor
      </button>
      <button
        onClick={() => openBudgetForm()}
        className="inline-flex items-center gap-2 rounded-lg border border-[#dde5e0] bg-white/80 px-3 py-2 text-sm font-semibold text-[#18221f] hover:bg-[#eaf1e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <DollarSign className="h-4 w-4" /> Expense
      </button>
      <button
        onClick={() => openShoppingForm(lists[0]?.id)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#dde5e0] bg-white/80 px-3 py-2 text-sm font-semibold text-[#18221f] hover:bg-[#eaf1e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
    return familyName || 'Omosanya Home';
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
      case 'contractors':
        return <ContractorView />;
      case 'goals':
        return <GoalsView />;
      case 'brain':
        return <ProjectBrainView />;
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
      contractors: 'Contractors',
      goals: 'Quests',
      brain: 'Project Brain',
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
    <div className="flex h-screen min-h-0 overflow-x-hidden bg-[#f5f7f1] text-[#18221f] dark:bg-[#0d1215] dark:text-slate-100">
      <FamilyHubNavigation
        items={NAV_ITEMS}
        activeId={currentView}
        onSelect={handleSelectView}
        isMobileOpen={isMobileMenuOpen}
        onOpenMobile={openMobileMenu}
        onCloseMobile={closeMobileMenu}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">
        <FamilyHubHeader
          title={headerTitle}
          subtitle={subtitle}
          onToggleMobileNav={openMobileMenu}
          rightContent={rightContent}
          databaseStatus={databaseStatus}
        />
        <main ref={mainRef} className="kinboard-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 sm:pb-24 lg:pb-0">
          {currentView !== 'dashboard' && breadcrumbItems.length > 0 && (
            <div className="px-3 pt-3 sm:px-4 sm:pt-4 lg:px-8">
              <Breadcrumb
                items={breadcrumbItems}
                onHomeClick={() => handleSelectView('dashboard')}
              />
            </div>
          )}
          {content}
        </main>
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollMainToTop}
          className="fixed bottom-24 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dde5e0] bg-white/95 text-[#147c72] shadow-lg backdrop-blur transition hover:bg-[#eaf1e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 dark:border-slate-700 dark:bg-slate-900/95 dark:text-[#56c6b8] dark:hover:bg-slate-800 lg:bottom-6"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <FamilyHubModals />
      {process.env.NEXT_PUBLIC_SHOW_DEBUG_PANEL === 'true' && <DebugPanel />}
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
