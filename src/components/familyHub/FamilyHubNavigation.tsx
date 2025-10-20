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
  const renderNav = (variant: 'desktop' | 'mobile') => (
    <nav className="flex flex-col gap-1">
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
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isActive
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'
            } ${isActive ? 'dark:bg-blue-600 dark:text-white' : ''}`}
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 py-2 shadow-lg backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-3">
        {items.map(({ id, label, icon: Icon }) => {
          const isActive = activeId === id;
          return (
            <button
              key={`bottom-${id}`}
              onClick={() => onSelect(id)}
              className={`flex min-w-[84px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 shadow-inner dark:bg-blue-500/20 dark:text-blue-200'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white p-4 sticky top-0 h-screen overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-500">Omosanya Hub</p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Navigation</h2>
          </div>
          <Menu className="h-5 w-5 text-gray-400 dark:text-slate-500" />
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
              <Dialog.Panel className="relative flex w-full max-w-xs flex-col bg-white p-4 shadow-lg dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-500">Omosanya Hub</p>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Navigate</h2>
                  </div>
                  <button onClick={onCloseMobile} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
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
