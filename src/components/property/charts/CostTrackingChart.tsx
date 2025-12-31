'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PropertyTask } from '@/types/property.types';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1',
];

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

interface CostTrackingChartProps {
  tasks: PropertyTask[];
  height?: number;
}

export const CostTrackingChart = ({ tasks, height = 300 }: CostTrackingChartProps) => {
  const data = useMemo(() => {
    const categorySpend: Record<string, { spent: number; estimated: number }> = {};

    tasks.forEach((task) => {
      const category = task.category || 'Other';
      if (!categorySpend[category]) {
        categorySpend[category] = { spent: 0, estimated: 0 };
      }

      // Sum actual spend from work logs
      const spent = task.workLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
      categorySpend[category].spent += spent;

      // Add estimated if not completed
      if (task.status !== 'completed' && task.defaultCostRange) {
        categorySpend[category].estimated += task.defaultCostRange.max;
      }
    });

    return Object.entries(categorySpend)
      .map(([category, values]) => ({
        name: category,
        spent: values.spent,
        estimated: values.estimated,
      }))
      .filter((item) => item.spent > 0 || item.estimated > 0)
      .sort((a, b) => (b.spent + b.estimated) - (a.spent + a.estimated))
      .slice(0, 10);
  }, [tasks]);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        No cost data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
        <XAxis
          type="number"
          tickFormatter={(value) => currencyFormatter.format(value)}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 11, fill: 'currentColor' }}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            currencyFormatter.format(value),
            name === 'spent' ? 'Actual Spend' : 'Estimated',
          ]}
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, white)',
            borderRadius: '8px',
            border: '1px solid var(--tooltip-border, #e5e7eb)',
          }}
        />
        <Legend />
        <Bar dataKey="spent" name="Actual Spend" fill="#10B981" radius={[0, 4, 4, 0]} />
        <Bar dataKey="estimated" name="Estimated" fill="#F59E0B" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
