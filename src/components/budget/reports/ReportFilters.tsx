'use client'

import React, { useState } from 'react';
import { ReportFilter, ReportDateRange } from '@/types/reporting.types';
import { Calendar, Filter, X, Users, DollarSign, Tag, RefreshCw } from 'lucide-react';

interface ReportFiltersProps {
  filter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
  onClose: () => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({ filter, onFilterChange, onClose }) => {
  const [localFilter, setLocalFilter] = useState<ReportFilter>(filter);

  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Education',
    'Insurance',
    'Savings',
    'Investments'
  ];

  const people = [
    'Alice Johnson',
    'Bob Johnson',
    'Charlie Johnson',
    'Diana Johnson'
  ];

  const predefinedRanges = [
    {
      label: 'This Month',
      value: () => {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          period: 'monthly' as const
        };
      }
    },
    {
      label: 'Last Month',
      value: () => {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), 0),
          period: 'monthly' as const
        };
      }
    },
    {
      label: 'This Quarter',
      value: () => {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        return {
          startDate: new Date(now.getFullYear(), quarter * 3, 1),
          endDate: new Date(now.getFullYear(), quarter * 3 + 3, 0),
          period: 'quarterly' as const
        };
      }
    },
    {
      label: 'This Year',
      value: () => {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          period: 'yearly' as const
        };
      }
    },
    {
      label: 'Last 6 Months',
      value: () => {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          period: 'custom' as const
        };
      }
    },
    {
      label: 'Last 12 Months',
      value: () => {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear() - 1, now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          period: 'custom' as const
        };
      }
    }
  ];

  const handleDateRangeChange = (dateRange: ReportDateRange) => {
    setLocalFilter(prev => ({
      ...prev,
      dateRange
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setLocalFilter(prev => ({
      ...prev,
      categories: prev.categories?.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...(prev.categories || []), category]
    }));
  };

  const handlePersonToggle = (person: string) => {
    setLocalFilter(prev => ({
      ...prev,
      people: prev.people?.includes(person)
        ? prev.people.filter(p => p !== person)
        : [...(prev.people || []), person]
    }));
  };

  const handleAmountChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setLocalFilter(prev => ({
      ...prev,
      [type === 'min' ? 'minAmount' : 'maxAmount']: numValue
    }));
  };

  const handleIncludeToggle = (type: 'income' | 'expenses') => {
    setLocalFilter(prev => ({
      ...prev,
      [type === 'income' ? 'includeIncome' : 'includeExpenses']: !prev[type === 'income' ? 'includeIncome' : 'includeExpenses']
    }));
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilter);
    onClose();
  };

  const handleResetFilters = () => {
    const defaultFilter: ReportFilter = {
      dateRange: {
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 11, 31),
        period: 'yearly'
      },
      includeIncome: true,
      includeExpenses: true
    };
    setLocalFilter(defaultFilter);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Report Filters</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Range */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h4 className="font-medium text-gray-900">Date Range</h4>
          </div>

          {/* Predefined Ranges */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Quick Select</label>
            <div className="grid grid-cols-2 gap-2">
              {predefinedRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handleDateRangeChange(range.value())}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-left"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Custom Range</label>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">Start Date</label>
                <input
                  type="date"
                  value={localFilter.dateRange.startDate.toISOString().split('T')[0]}
                  onChange={(e) => handleDateRangeChange({
                    ...localFilter.dateRange,
                    startDate: new Date(e.target.value),
                    period: 'custom'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">End Date</label>
                <input
                  type="date"
                  value={localFilter.dateRange.endDate.toISOString().split('T')[0]}
                  onChange={(e) => handleDateRangeChange({
                    ...localFilter.dateRange,
                    endDate: new Date(e.target.value),
                    period: 'custom'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* Current Selection Display */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Selected:</strong> {formatDate(localFilter.dateRange.startDate)} to {formatDate(localFilter.dateRange.endDate)}
            </p>
            <p className="text-xs text-blue-600 capitalize">Period: {localFilter.dateRange.period}</p>
          </div>
        </div>

        {/* Categories and People */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900">Categories</h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map((category) => (
                <label key={category} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilter.categories?.includes(category) || false}
                    onChange={() => handleCategoryToggle(category)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category}</span>
                </label>
              ))}
            </div>
            {localFilter.categories && localFilter.categories.length > 0 && (
              <p className="text-xs text-gray-500">
                {localFilter.categories.length} of {categories.length} selected
              </p>
            )}
          </div>

          {/* People */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900">Family Members</h4>
            </div>
            <div className="space-y-2">
              {people.map((person) => (
                <label key={person} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilter.people?.includes(person) || false}
                    onChange={() => handlePersonToggle(person)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{person}</span>
                </label>
              ))}
            </div>
            {localFilter.people && localFilter.people.length > 0 && (
              <p className="text-xs text-gray-500">
                {localFilter.people.length} of {people.length} selected
              </p>
            )}
          </div>
        </div>

        {/* Amount and Type Filters */}
        <div className="space-y-6">
          {/* Amount Range */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-900">Amount Range</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Minimum Amount (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={localFilter.minAmount || ''}
                  onChange={(e) => handleAmountChange('min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Maximum Amount (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={localFilter.maxAmount || ''}
                  onChange={(e) => handleAmountChange('max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* Transaction Types */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Transaction Types</h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilter.includeIncome}
                  onChange={() => handleIncludeToggle('income')}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Include Income</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilter.includeExpenses}
                  onChange={() => handleIncludeToggle('expenses')}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Include Expenses</span>
              </label>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Active Filters</h5>
            <div className="space-y-1 text-xs text-gray-600">
              <div>Date: {localFilter.dateRange.period}</div>
              {localFilter.categories && localFilter.categories.length > 0 && (
                <div>Categories: {localFilter.categories.length} selected</div>
              )}
              {localFilter.people && localFilter.people.length > 0 && (
                <div>People: {localFilter.people.length} selected</div>
              )}
              {(localFilter.minAmount || localFilter.maxAmount) && (
                <div>
                  Amount: {localFilter.minAmount ? `£${localFilter.minAmount}` : '£0'} - {localFilter.maxAmount ? `£${localFilter.maxAmount}` : '∞'}
                </div>
              )}
              <div>
                Types: {[
                  localFilter.includeIncome && 'Income',
                  localFilter.includeExpenses && 'Expenses'
                ].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
        <button
          onClick={handleResetFilters}
          className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset</span>
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;