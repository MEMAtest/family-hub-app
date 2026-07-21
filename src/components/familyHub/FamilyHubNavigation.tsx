'use client'

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { LucideIcon, X } from 'lucide-react';
import OmosanyaLogo from '@/components/common/OmosanyaLogo';

export interface NavItem {
  id: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  section?: 'Home' | 'Plan' | 'Household' | 'Personal' | 'More';
}

interface FamilyHubNavigationProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  isMobileOpen: boolean;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
}

export const FamilyHubNavigation = ({
  items,
  activeId,
  onSelect,
  isMobileOpen,
  onCloseMobile,
}: FamilyHubNavigationProps) => {
  const primaryMobileOrder = ['calendar', 'budget', 'dashboard', 'meals', 'shopping', 'goals'];
  const primaryMobileItems = primaryMobileOrder
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NavItem => Boolean(item));

  const groupedItems = items.reduce<Array<{ title: string; items: NavItem[] }>>((groups, item) => {
    const title = item.section ?? 'More';
    const existing = groups.find((group) => group.title === title);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ title, items: [item] });
    }
    return groups;
  }, []);

  const renderNavButton = ({ id, label, icon: Icon }: NavItem, variant: 'desktop' | 'mobile') => {
    const isActive = activeId === id;
    return (
      <button
        key={id}
        onClick={() => {
          onSelect(id);
          if (variant === 'mobile') {
            onCloseMobile();
          }
        }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 ${
          isActive
            ? 'bg-[#147c72] text-white shadow-sm'
            : 'text-[#5f6a64] hover:bg-[#eaf1e7] hover:text-[#18221f] dark:text-slate-300 dark:hover:bg-slate-800'
        } ${isActive ? 'dark:bg-[#147c72] dark:text-white' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const renderNav = (variant: 'desktop' | 'mobile') => (
    <nav className="flex flex-col gap-5">
      {groupedItems.map((group) => (
        <div key={`${variant}-${group.title}`} className="space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8a9690] dark:text-slate-500">
            {group.title}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => renderNavButton(item, variant))}
          </div>
        </div>
      ))}
    </nav>
  );

  const renderBottomNav = () => (
      <nav aria-label="Primary mobile navigation" className="fixed inset-x-2 bottom-2 z-40 rounded-2xl border border-[#dde5e0] bg-white/90 py-2 shadow-[0_12px_28px_rgba(35,61,55,.15)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95 pwa-safe-bottom">
        <div className="flex w-full items-center justify-around gap-0.5 px-1.5 sm:gap-1 sm:px-2">
          {primaryMobileItems.map(({ id, label, mobileLabel, icon: Icon }) => {
            const isActive = activeId === id;
            return (
              <button
                key={`bottom-${id}`}
                onClick={() => onSelect(id)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-bold transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 sm:text-[11px] ${
                  isActive
                    ? 'bg-[#eaf1e7] text-[#147c72] dark:bg-[#147c72]/20 dark:text-[#56c6b8]'
                    : 'text-[#5f6a64] hover:bg-[#eaf1e7] dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="max-w-full truncate">{mobileLabel ?? label}</span>
              </button>
            );
          })}
        </div>
      </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden h-screen w-72 flex-shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-[#dde5e0] bg-white/86 p-4 backdrop-blur-xl sticky top-0 dark:border-slate-800 dark:bg-slate-900/95 lg:flex">
        <div className="mb-6">
          <OmosanyaLogo showText />
          <div className="mt-4 rounded-lg border border-[#dde5e0] bg-[#f8faf6] px-3 py-2 text-xs font-semibold text-[#5f6a64] dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
            Signed-in household profiles
          </div>
        </div>
        {renderNav('desktop')}
      </aside>

      {/* Mobile */}
      <Transition show={isMobileOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={onCloseMobile}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-200 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-200 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-[85vw] max-w-[280px] flex-col bg-white p-4 shadow-lg dark:bg-slate-900 sm:max-w-xs pwa-safe-top">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <OmosanyaLogo className="h-10 w-10" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5f6a64] dark:text-slate-500">Omosanya</p>
                      <h2 className="text-lg font-semibold text-[#18221f] dark:text-slate-100">Navigation</h2>
                    </div>
                  </div>
                  <button onClick={onCloseMobile} className="rounded-lg p-2 text-[#5f6a64] hover:bg-[#eaf1e7] dark:text-slate-300 dark:hover:bg-slate-800">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {renderNav('mobile')}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Mobile bottom navigation */}
      {!isMobileOpen && renderBottomNav()}
    </>
  );
};
