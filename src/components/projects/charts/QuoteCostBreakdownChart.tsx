'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ExtractedQuote, QuoteChartData } from '@/types/quote.types';

interface QuoteCostBreakdownChartProps {
  quote: ExtractedQuote;
  height?: number;
  showLegend?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Labour: '#3b82f6',
  Materials: '#10b981',
  Fixtures: '#8b5cf6',
  Other: '#f59e0b',
  VAT: '#6b7280',
};

export default function QuoteCostBreakdownChart({
  quote,
  height = 300,
  showLegend = true,
}: QuoteCostBreakdownChartProps) {
  const chartData: QuoteChartData[] = [
    {
      name: 'Labour',
      value: quote.labourTotal,
      color: CATEGORY_COLORS.Labour,
      percentage: quote.subtotal > 0 ? (quote.labourTotal / quote.subtotal) * 100 : 0,
    },
    {
      name: 'Materials',
      value: quote.materialsTotal,
      color: CATEGORY_COLORS.Materials,
      percentage: quote.subtotal > 0 ? (quote.materialsTotal / quote.subtotal) * 100 : 0,
    },
    {
      name: 'Fixtures',
      value: quote.fixturesTotal,
      color: CATEGORY_COLORS.Fixtures,
      percentage: quote.subtotal > 0 ? (quote.fixturesTotal / quote.subtotal) * 100 : 0,
    },
    {
      name: 'Other',
      value: quote.otherTotal,
      color: CATEGORY_COLORS.Other,
      percentage: quote.subtotal > 0 ? (quote.otherTotal / quote.subtotal) * 100 : 0,
    },
  ].filter(item => item.value > 0);

  // Note: VAT is NOT included in the cost breakdown - it's shown separately in the totals summary
  // The cost breakdown only shows the category split of the subtotal (exc VAT)

  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Amount:{' '}
            {new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'GBP',
            }).format(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            {data.percentage.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No cost breakdown available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={Math.min(height / 2 - 20, 120)}
            innerRadius={Math.min(height / 4, 50)}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={<CustomLegend />} />}
        </PieChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'GBP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
