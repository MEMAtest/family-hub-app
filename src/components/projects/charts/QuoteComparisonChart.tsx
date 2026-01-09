'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ExtractedQuote } from '@/types/quote.types';

interface QuoteComparisonChartProps {
  quotes: ExtractedQuote[];
  height?: number;
  showBreakdown?: boolean;
}

const COLORS = {
  total: '#3b82f6',
  labour: '#60a5fa',
  materials: '#10b981',
  fixtures: '#8b5cf6',
  other: '#f59e0b',
  vat: '#6b7280',
};

const CONTRACTOR_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export default function QuoteComparisonChart({
  quotes,
  height = 400,
  showBreakdown = true,
}: QuoteComparisonChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare data for total comparison
  const totalComparisonData = quotes
    .map((quote, index) => ({
      name: quote.contractorName.length > 15
        ? quote.contractorName.substring(0, 15) + '...'
        : quote.contractorName,
      fullName: quote.contractorName,
      total: quote.total,
      color: CONTRACTOR_COLORS[index % CONTRACTOR_COLORS.length],
    }))
    .sort((a, b) => a.total - b.total);

  // Prepare data for breakdown comparison
  const breakdownData = quotes.map((quote) => ({
    name: quote.contractorName.length > 12
      ? quote.contractorName.substring(0, 12) + '...'
      : quote.contractorName,
    fullName: quote.contractorName,
    Labour: quote.labourTotal,
    Materials: quote.materialsTotal,
    Fixtures: quote.fixturesTotal,
    Other: quote.otherTotal,
    VAT: quote.vatAmount || 0,
    total: quote.total,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-gray-900 mb-2">{data.fullName}</p>
          {showBreakdown && payload.length > 1 ? (
            <div className="space-y-1">
              {payload.map((item: any, index: number) => (
                <div key={index} className="flex justify-between gap-4 text-sm">
                  <span style={{ color: item.color }}>{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-1 mt-1">
                <div className="flex justify-between gap-4 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(data.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-lg font-semibold text-blue-600">
              {formatCurrency(data.total)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const cheapest = totalComparisonData[0];
  const mostExpensive = totalComparisonData[totalComparisonData.length - 1];
  const difference = mostExpensive ? mostExpensive.total - (cheapest?.total || 0) : 0;
  const savingsPercent = mostExpensive && mostExpensive.total > 0
    ? ((difference / mostExpensive.total) * 100).toFixed(1)
    : '0';

  if (quotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No quotes to compare</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Summary Cards */}
      {quotes.length > 1 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-700">Cheapest Quote</p>
            <p className="text-xl font-bold text-green-800">
              {formatCurrency(cheapest?.total || 0)}
            </p>
            <p className="text-sm text-green-600 truncate">{cheapest?.fullName}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-sm text-red-700">Most Expensive</p>
            <p className="text-xl font-bold text-red-800">
              {formatCurrency(mostExpensive?.total || 0)}
            </p>
            <p className="text-sm text-red-600 truncate">{mostExpensive?.fullName}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-700">Potential Savings</p>
            <p className="text-xl font-bold text-blue-800">
              {formatCurrency(difference)}
            </p>
            <p className="text-sm text-blue-600">{savingsPercent}% difference</p>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {showBreakdown && quotes.length <= 4 ? (
          <BarChart
            data={breakdownData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
            <Bar dataKey="Labour" stackId="a" fill={COLORS.labour} />
            <Bar dataKey="Materials" stackId="a" fill={COLORS.materials} />
            <Bar dataKey="Fixtures" stackId="a" fill={COLORS.fixtures} />
            <Bar dataKey="Other" stackId="a" fill={COLORS.other} />
            <Bar dataKey="VAT" stackId="a" fill={COLORS.vat} />
          </BarChart>
        ) : (
          <BarChart
            data={totalComparisonData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {totalComparisonData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Detailed Breakdown Table */}
      {showBreakdown && quotes.length > 1 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Contractor
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Labour
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Materials
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Fixtures
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Other
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  VAT
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotes
                .sort((a, b) => a.total - b.total)
                .map((quote, index) => (
                  <tr
                    key={quote.id}
                    className={index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {quote.contractorName}
                      {index === 0 && (
                        <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          Cheapest
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(quote.labourTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(quote.materialsTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(quote.fixturesTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(quote.otherTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(quote.vatAmount || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(quote.total)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
