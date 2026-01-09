'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  ExtractedQuote,
  QuoteLineItem,
  QuoteCategory,
  QuoteSortField,
  SortDirection,
  QuoteTableSort,
} from '@/types/quote.types';

interface QuoteItemsTableProps {
  quote: ExtractedQuote;
  onItemClick?: (item: QuoteLineItem) => void;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableExport?: boolean;
}

const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  labour: 'Labour',
  materials: 'Materials',
  fixtures: 'Fixtures',
  sundries: 'Sundries',
  vat: 'VAT',
  other: 'Other',
};

const CATEGORY_COLORS: Record<QuoteCategory, string> = {
  labour: 'bg-blue-100 text-blue-800',
  materials: 'bg-green-100 text-green-800',
  fixtures: 'bg-purple-100 text-purple-800',
  sundries: 'bg-yellow-100 text-yellow-800',
  vat: 'bg-gray-100 text-gray-800',
  other: 'bg-orange-100 text-orange-800',
};

export default function QuoteItemsTable({
  quote,
  onItemClick,
  enableSearch = true,
  enableFilters = true,
  enableExport = true,
}: QuoteItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<QuoteCategory | 'all'>('all');
  const [sort, setSort] = useState<QuoteTableSort>({
    field: 'amount',
    direction: 'desc',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const handleSort = (field: QuoteSortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ field }: { field: QuoteSortField }) => {
    if (sort.field !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-300" />;
    }
    return sort.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };

  const filteredAndSortedItems = useMemo(() => {
    let items = [...quote.lineItems];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.description.toLowerCase().includes(term) ||
          CATEGORY_LABELS[item.category].toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    // Apply sorting
    items.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sort.field) {
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'category':
          aValue = CATEGORY_LABELS[a.category];
          bValue = CATEGORY_LABELS[b.category];
          break;
        case 'quantity':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        case 'unitPrice':
          aValue = a.unitPrice || 0;
          bValue = b.unitPrice || 0;
          break;
        case 'amount':
        default:
          aValue = a.amount;
          bValue = b.amount;
      }

      if (typeof aValue === 'string') {
        return sort.direction === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sort.direction === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
    });

    return items;
  }, [quote.lineItems, searchTerm, categoryFilter, sort]);

  const filteredTotal = filteredAndSortedItems.reduce((sum, item) => sum + item.amount, 0);

  const categoryStats = useMemo(() => {
    const stats: Record<QuoteCategory, { count: number; total: number }> = {
      labour: { count: 0, total: 0 },
      materials: { count: 0, total: 0 },
      fixtures: { count: 0, total: 0 },
      sundries: { count: 0, total: 0 },
      vat: { count: 0, total: 0 },
      other: { count: 0, total: 0 },
    };

    quote.lineItems.forEach((item) => {
      stats[item.category].count++;
      stats[item.category].total += item.amount;
    });

    return stats;
  }, [quote.lineItems]);

  const exportToCSV = () => {
    const headers = ['Description', 'Category', 'Quantity', 'Unit Price', 'Amount'];
    const rows = filteredAndSortedItems.map((item) => [
      item.description,
      CATEGORY_LABELS[item.category],
      item.quantity || '',
      item.unitPrice ? item.unitPrice.toFixed(2) : '',
      item.amount.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quote.contractorName.replace(/\s+/g, '_')}_quote_items.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {enableSearch && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {enableFilters && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as QuoteCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ({categoryStats[value as QuoteCategory].count})
                </option>
              ))}
            </select>
          </div>
        )}

        {enableExport && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Category Pills */}
      {enableFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({quote.lineItems.length})
          </button>
          {Object.entries(categoryStats)
            .filter(([_, stats]) => stats.count > 0)
            .map(([category, stats]) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category as QuoteCategory)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  categoryFilter === category
                    ? 'bg-blue-600 text-white'
                    : `${CATEGORY_COLORS[category as QuoteCategory]} hover:opacity-80`
                }`}
              >
                {CATEGORY_LABELS[category as QuoteCategory]} ({stats.count})
              </button>
            ))}
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('description')}
                  className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
                >
                  Description
                  <SortIcon field="description" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
                >
                  Category
                  <SortIcon field="category" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('quantity')}
                  className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 ml-auto"
                >
                  Qty
                  <SortIcon field="quantity" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('unitPrice')}
                  className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 ml-auto"
                >
                  Unit Price
                  <SortIcon field="unitPrice" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 ml-auto"
                >
                  Amount
                  <SortIcon field="amount" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedItems.length > 0 ? (
              filteredAndSortedItems.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 ${onItemClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onItemClick?.(item)}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.description}
                    {item.notes && (
                      <span className="block text-xs text-gray-500 mt-1">
                        {item.notes}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        CATEGORY_COLORS[item.category]
                      }`}
                    >
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {item.quantity || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                    {item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {searchTerm || categoryFilter !== 'all'
                    ? 'No items match your filters'
                    : 'No line items in this quote'}
                </td>
              </tr>
            )}
          </tbody>
          {filteredAndSortedItems.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-700 text-right">
                  {categoryFilter !== 'all' || searchTerm
                    ? 'Filtered Total'
                    : `Total (${filteredAndSortedItems.length} items)`}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(filteredTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Materials Search Link */}
      {filteredAndSortedItems.some((item) => item.category === 'materials' || item.category === 'fixtures') && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            Want to source materials yourself? Search for items at:
          </p>
          <div className="flex flex-wrap gap-2">
            {['Screwfix', 'Toolstation', 'B&Q', 'Wickes'].map((store) => (
              <a
                key={store}
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  `${filteredAndSortedItems[0]?.description || 'bathroom'} ${store}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-white text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-50 text-sm"
              >
                {store}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
