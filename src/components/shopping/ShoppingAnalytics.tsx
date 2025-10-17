'use client'

import { useMemo } from 'react';
import {
  DollarSign,
  ShoppingCart,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { useShoppingContext } from '@/contexts/familyHub/ShoppingContext';

interface ShoppingAnalyticsProps {
  onClose?: () => void;
}

const CATEGORY_COLORS = ['#0ea5e9', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6'];

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
});

const ShoppingAnalytics: React.FC<ShoppingAnalyticsProps> = ({ onClose }) => {
  const { lists } = useShoppingContext();

  const analytics = useMemo(() => {
    if (!lists.length) {
      return null;
    }

    let totalSpent = 0;
    let totalEstimated = 0;
    let totalItems = 0;
    let completedLists = 0;

    const categoryTotals = new Map<string, number>();
    const monthlyTotals = new Map<
      string,
      { label: string; actual: number; estimated: number; items: number }
    >();
    const itemTotals = new Map<string, { count: number; total: number }>();

    lists.forEach((list: any) => {
      const actual = Number(list.total ?? 0);
      const estimated = Number(list.estimatedTotal ?? actual);
      const items = Array.isArray(list.items) ? list.items : [];

      if (items.length > 0 || actual > 0 || estimated > 0) {
        completedLists += 1;
      }

      totalSpent += actual;
      totalEstimated += estimated;
      totalItems += items.length;

      const category = list.category || 'General';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + (actual || estimated));

      const createdAt = list.createdAt ? new Date(list.createdAt) : null;
      if (createdAt && !Number.isNaN(createdAt.getTime())) {
        const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        const entry =
          monthlyTotals.get(key) ??
          {
            label: createdAt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
            actual: 0,
            estimated: 0,
            items: 0,
          };
        entry.actual += actual;
        entry.estimated += estimated;
        entry.items += items.length;
        monthlyTotals.set(key, entry);
      }

      items.forEach((item: any) => {
        const name = item.name || item.itemName || 'Item';
        const price = Number(item.price ?? item.estimatedPrice ?? 0);
        const entry = itemTotals.get(name) ?? { count: 0, total: 0 };
        entry.count += 1;
        entry.total += price;
        itemTotals.set(name, entry);
      });
    });

    if (totalSpent === 0 && totalEstimated === 0 && totalItems === 0) {
      return null;
    }

    const categoryData = Array.from(categoryTotals.entries()).map(([name, value], index) => ({
      name,
      value: Number(value.toFixed(2)),
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

    const monthlyTrend = Array.from(monthlyTotals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => ({
        month: value.label,
        actual: Number(value.actual.toFixed(2)),
        estimated: Number(value.estimated.toFixed(2)),
        items: value.items,
      }));

    const topItems = Array.from(itemTotals.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        frequency: value.count,
        avgPrice: value.count ? Number((value.total / value.count).toFixed(2)) : 0,
      }));

    const savings = totalEstimated - totalSpent;
    const averagePerList = completedLists
      ? Number((totalSpent / completedLists).toFixed(2))
      : Number(totalSpent.toFixed(2));

    return {
      totals: {
        totalSpent: Number(totalSpent.toFixed(2)),
        totalEstimated: Number(totalEstimated.toFixed(2)),
        totalItems,
        averagePerList,
        savings: Number(savings.toFixed(2)),
        savingsPercent: totalEstimated > 0 ? Number(((savings / totalEstimated) * 100).toFixed(1)) : 0,
        completedLists,
      },
      categoryData,
      monthlyTrend,
      topItems,
    };
  }, [lists]);

  if (!analytics) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          <ShoppingCart className="mx-auto h-10 w-10 text-gray-300" />
          <h2 className="mt-3 text-lg font-semibold text-gray-900">Shopping analytics will appear soon</h2>
          <p className="mt-2">
            Create shopping lists and complete items to unlock spend insights, category trends, and
            top-item tracking.
          </p>
        </div>
      </div>
    );
  }

  const {
    totals: { totalSpent, totalEstimated, totalItems, averagePerList, savings, savingsPercent, completedLists },
    categoryData,
    monthlyTrend,
    topItems,
  } = analytics;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shopping Analytics</h2>
          <p className="text-gray-600 mt-1">
            Snapshot of spending across {completedLists} completed list{completedLists === 1 ? '' : 's'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close analytics"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total spent</span>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{currencyFormatter.format(totalSpent)}</p>
          <p className="mt-1 text-xs text-gray-500">
            vs {currencyFormatter.format(totalEstimated)} estimated
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Items logged</span>
            <ShoppingCart className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{totalItems}</p>
          <p className="mt-1 text-xs text-gray-500">
            Avg {(totalItems && completedLists) ? Math.round(totalItems / completedLists) : totalItems} per list
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Average list total</span>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {currencyFormatter.format(averagePerList)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Based on completed lists</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Savings vs estimates</span>
            <PiggyBank className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {currencyFormatter.format(savings)}
          </div>
          <div
            className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              savings >= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {savings >= 0 ? (
              <>
                <ArrowDownRight className="mr-1 h-3 w-3" />
                {Math.abs(savingsPercent)}% under estimate
              </>
            ) : (
              <>
                <ArrowUpRight className="mr-1 h-3 w-3" />
                {Math.abs(savingsPercent)}% over estimate
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-base font-semibold text-gray-900">Monthly totals</h3>
          {monthlyTrend.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `£${value.toLocaleString()}`} />
                  <Tooltip
                    formatter={(value: number) =>
                      currencyFormatter.format(value).replace('£-', '-£')
                    }
                  />
                  <Legend />
                  <Line type="monotone" dataKey="estimated" stroke="#c084fc" strokeWidth={2} name="Estimated" />
                  <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2} name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Add created dates to shopping lists to unlock monthly trends.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-base font-semibold text-gray-900">Spend by category</h3>
          {categoryData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Categorise lists to see where money goes.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-base font-semibold text-gray-900">Most frequent items</h3>
        {topItems.length ? (
          <div className="mt-4 divide-y divide-gray-100">
            {topItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.frequency} time{item.frequency === 1 ? '' : 's'} added</p>
                </div>
                <div className="text-sm text-gray-600">
                  Avg {currencyFormatter.format(item.avgPrice)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Add items to lists to track buying patterns.</p>
        )}
      </div>
    </div>
  );
};

export default ShoppingAnalytics;
