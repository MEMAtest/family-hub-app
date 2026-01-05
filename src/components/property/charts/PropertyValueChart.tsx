'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { PropertyValueEntry, PropertyBaseline } from '@/types/property.types';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

interface PropertyValueChartProps {
  values: PropertyValueEntry[];
  profile: PropertyBaseline;
  height?: number;
}

export const PropertyValueChart = ({
  values,
  profile,
  height = 250,
}: PropertyValueChartProps) => {
  const data = useMemo(() => {
    let chartData = [...values];

    // Add purchase baseline if no values exist
    if (chartData.length === 0 && profile.purchasePrice && profile.purchaseDate) {
      chartData = [
        {
          id: 'purchase',
          date: profile.purchaseDate,
          value: profile.purchasePrice,
          source: 'manual',
          notes: 'Purchase price',
        },
      ];
    }

    return chartData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((entry) => ({
        ...entry,
        dateLabel: new Date(entry.date).toLocaleDateString('en-GB', {
          month: 'short',
          year: '2-digit',
        }),
      }));
  }, [values, profile]);

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        No valuation data available
      </div>
    );
  }

  // Calculate min/max for Y axis
  const minValue = Math.min(...data.map((d) => d.value)) * 0.95;
  const maxValue = Math.max(...data.map((d) => d.value)) * 1.05;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: 'currentColor' }} />
        <YAxis
          domain={[minValue, maxValue]}
          tickFormatter={(value) => currencyFormatter.format(value)}
          tick={{ fontSize: 11, fill: 'currentColor' }}
          width={80}
        />
        <Tooltip
          formatter={(value: number) => [currencyFormatter.format(value), 'Value']}
          labelFormatter={(label) => `Date: ${label}`}
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, white)',
            borderRadius: '8px',
            border: '1px solid var(--tooltip-border, #e5e7eb)',
            color: 'var(--tooltip-text, #0f172a)',
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
