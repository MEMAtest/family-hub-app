'use client'

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { LucideIcon, Menu, X } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface FamilyHubNavigationProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const FamilyHubNavigation = ({
  items,
  activeId,
  onSelect,
  isMobileOpen,
  onCloseMobile,
}: FamilyHubNavigationProps) => {
  const primaryMobileItems = items.filter((item) =>
    ['dashboard', 'calendar', 'budget', 'meals', 'shopping', 'goals'].includes(item.id)
  );

  const renderNav = (variant: 'desktop' | 'mobile') => (
    <nav className="flex flex-col gap-1.5">
      {items.map(({ id, label, icon: Icon }) => {
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 ${
              isActive
                ? 'bg-[#147c72] text-white shadow-sm'
                : 'text-[#5f6a64] hover:bg-[#eaf1e7] hover:text-[#18221f] dark:text-slate-300 dark:hover:bg-slate-800'
            } ${isActive ? 'dark:bg-[#147c72] dark:text-white' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  const renderBottomNav = () => (
    <nav className="fixed inset-x-2 bottom-2 z-40 rounded-2xl border border-[#dde5e0] bg-white/90 py-2 shadow-[0_12px_28px_rgba(35,61,55,.15)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95 pwa-safe-bottom">
      <div className="flex w-full items-center justify-around gap-1 px-2 sm:gap-2 sm:px-3">
        {primaryMobileItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeId === id;
          return (
            <button
              key={`bottom-${id}`}
              onClick={() => onSelect(id)}
              className={`flex min-w-[54px] max-w-[82px] flex-1 flex-col items-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] sm:text-xs font-bold transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 ${
                isActive
                  ? 'bg-[#eaf1e7] text-[#147c72] dark:bg-[#147c72]/20 dark:text-[#56c6b8]'
                  : 'text-[#5f6a64] hover:bg-[#eaf1e7] dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate max-w-full">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden h-screen w-64 flex-shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-[#dde5e0] bg-white/82 p-4 backdrop-blur sticky top-0 dark:border-slate-800 dark:bg-slate-900/90 lg:flex">
        <div className="flex items-center justify-between mb-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#147c72] text-xl font-black text-white shadow-sm">K</div>
            <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5f6a64] dark:text-slate-500">Omosanya</p>
            <h2 className="kinboard-serif text-2xl leading-none text-[#18221f] dark:text-slate-100">Home</h2>
            </div>
          </div>
          <Menu className="h-5 w-5 text-[#9aa5a0] dark:text-slate-500" />
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
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#147c72] text-lg font-black text-white shadow-sm">K</div>
                    <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5f6a64] dark:text-slate-500">Omosanya</p>
                    <h2 className="text-lg font-semibold text-[#18221f] dark:text-slate-100">Navigate</h2>
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
