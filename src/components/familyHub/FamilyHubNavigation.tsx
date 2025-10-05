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
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Family Hub</p>
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          </div>
          <Menu className="h-5 w-5 text-gray-400" />
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
              <Dialog.Panel className="relative flex w-full max-w-xs flex-col bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Family Hub</p>
                    <h2 className="text-lg font-semibold text-gray-900">Navigate</h2>
                  </div>
                  <button onClick={onCloseMobile} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {renderNav('mobile')}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
