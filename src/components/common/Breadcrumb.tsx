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
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <button
        onClick={onHomeClick}
        className="flex items-center hover:text-gray-900 transition-colors"
      >
        <Home size={16} className="mr-1" />
        <span>Home</span>
      </button>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-gray-400" />
          <button
            onClick={item.onClick}
            className={`hover:text-gray-900 transition-colors ${
              item.isActive
                ? 'text-gray-900 font-medium cursor-default'
                : 'text-gray-600 cursor-pointer'
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