import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onHomeClick: () => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onHomeClick }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6 dark:text-slate-400">
      <button
        onClick={onHomeClick}
        className="flex items-center hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:hover:text-slate-100"
      >
        <Home size={16} className="mr-1" />
        <span>Home</span>
      </button>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-gray-400 dark:text-slate-500" />
          <button
            onClick={item.onClick}
            className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
              item.isActive
                ? 'text-gray-900 font-medium cursor-default dark:text-slate-100'
                : 'text-gray-600 hover:text-gray-900 cursor-pointer dark:text-slate-400 dark:hover:text-slate-100'
            }`}
            disabled={item.isActive}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
