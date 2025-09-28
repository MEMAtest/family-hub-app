'use client'

import React, { useState } from 'react';
import { ReportFilter } from '@/types/reporting.types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, Target, Activity, Brain, Zap } from 'lucide-react';

interface ExpenseForecastProps {
  filter: ReportFilter;
}

const ExpenseForecastComponent: React.FC<ExpenseForecastProps> = ({ filter }) => {
  const [forecastPeriod, setForecastPeriod] = useState<'3months' | '6months' | '12months'>('6months');

  const historicalData = [
    { month: 'Mar 2025', actual: 5750, Food: 875, Transport: 520, Shopping: 485, Utilities: 235, Entertainment: 245 },
    { month: 'Apr 2025', actual: 5820, Food: 890, Transport: 510, Shopping: 470, Utilities: 240, Entertainment: 255 },
    { month: 'May 2025', actual: 5680, Food: 820, Transport: 480, Shopping: 430, Utilities: 235, Entertainment: 280 },
    { month: 'Jun 2025', actual: 5950, Food: 850, Transport: 495, Shopping: 445, Utilities: 245, Entertainment: 260 },
    { month: 'Jul 2025', actual: 6100, Food: 865, Transport: 510, Shopping: 470, Utilities: 250, Entertainment: 250 },
    { month: 'Aug 2025', actual: 6025, Food: 875, Transport: 520, Shopping: 485, Utilities: 235, Entertainment: 245 }
  ];

  const forecastData = [
    { month: 'Sep 2025', predicted: 6150, confidence: 92, Food: 880, Transport: 530, Shopping: 490, Utilities: 240, Entertainment: 250, factors: ['Back to school', 'Seasonal adjustment'] },
    { month: 'Oct 2025', predicted: 6200, confidence: 89, Food: 885, Transport: 535, Shopping: 495, Utilities: 245, Entertainment: 255, factors: ['Halloween spending', 'Utility price increase'] },
    { month: 'Nov 2025', predicted: 6450, confidence: 85, Food: 920, Transport: 540, Shopping: 550, Utilities: 260, Entertainment: 280, factors: ['Holiday season', 'Black Friday'] },
    { month: 'Dec 2025', predicted: 6850, confidence: 82, Food: 950, Transport: 520, Shopping: 680, Utilities: 270, Entertainment: 320, factors: ['Christmas shopping', 'Holiday entertainment'] },
    { month: 'Jan 2026', predicted: 5950, confidence: 78, Food: 820, Transport: 510, Shopping: 420, Utilities: 280, Entertainment: 220, factors: ['Post-holiday reduction', 'New year resolutions'] },
    { month: 'Feb 2026', predicted: 6050, confidence: 75, Food: 840, Transport: 520, Shopping: 450, Utilities: 275, Entertainment: 240, factors: ['Valentine\'s day', 'Winter heating'] }
  ];

  const combinedData = [...historicalData, ...forecastData].map(item => ({
    ...item,
    total: ('actual' in item ? item.actual : item.predicted) as number,
    type: 'actual' in item ? 'actual' : 'predicted'
  }));

  const categoryForecasts = [
    {
      category: 'Food & Dining',
      currentAverage: 860,
      predictedGrowth: 2.5,
      confidence: 88,
      seasonalImpact: 'High during holidays',
      riskFactors: ['Inflation', 'Dining out frequency'],
      recommendations: ['Meal planning', 'Bulk buying', 'Price comparison']
    },
    {
      category: 'Transportation',
      currentAverage: 520,
      predictedGrowth: 1.8,
      confidence: 85,
      seasonalImpact: 'Lower in winter months',
      riskFactors: ['Fuel prices', 'Car maintenance'],
      recommendations: ['Fuel-efficient driving', 'Public transport', 'Carpooling']
    },
    {
      category: 'Shopping',
      currentAverage: 470,
      predictedGrowth: 5.2,
      confidence: 75,
      seasonalImpact: 'Spike during holiday season',
      riskFactors: ['Impulse buying', 'Sales events'],
      recommendations: ['Shopping lists', 'Budget limits', 'Wait periods']
    },
    {
      category: 'Utilities',
      currentAverage: 245,
      predictedGrowth: 3.1,
      confidence: 92,
      seasonalImpact: 'Higher in winter',
      riskFactors: ['Energy price increases', 'Usage changes'],
      recommendations: ['Energy efficiency', 'Smart meters', 'Usage monitoring']
    }
  ];

  const aiInsights = [
    {
      type: 'trend',
      title: 'Holiday Season Spike',
      description: 'Expect 15-20% increase in expenses during November-December',
      impact: 'high',
      category: 'Shopping',
      confidence: 87
    },
    {
      type: 'opportunity',
      title: 'Transport Optimization',
      description: 'Winter months show lower transport costs - good time for vehicle maintenance',
      impact: 'medium',
      category: 'Transportation',
      confidence: 82
    },
    {
      type: 'warning',
      title: 'Utility Price Alert',
      description: 'Energy prices expected to rise 8% in Q1 2026',
      impact: 'medium',
      category: 'Utilities',
      confidence: 78
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'opportunity': return <Target className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Expense Forecasting</h2>
            <p className="text-gray-600">AI-powered predictions and trend analysis</p>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-purple-700">AI Powered</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Forecast Period:</label>
          <div className="flex space-x-2">
            {[
              { value: '3months', label: '3 Months' },
              { value: '6months', label: '6 Months' },
              { value: '12months', label: '12 Months' }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setForecastPeriod(period.value as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  forecastPeriod === period.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Forecast Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Total Expense Forecast</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(value as number), name]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              {/* Historical data */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                fill="#3b82f680"
                strokeWidth={3}
                name="Actual Expenses"
                connectNulls={false}
              />
              {/* Predicted data */}
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#ef4444"
                fill="#ef444480"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted Expenses"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span>Historical Data</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2" style={{ opacity: 0.8 }}></div>
            <span>AI Predictions</span>
          </div>
        </div>
      </div>

      {/* Category Forecasts */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category-wise Forecasts</h3>
        <div className="grid gap-4">
          {categoryForecasts.map((forecast, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{forecast.category}</h4>
                  <p className="text-sm text-gray-600">Current avg: {formatCurrency(forecast.currentAverage)}/month</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(forecast.confidence)}`}>
                      {forecast.confidence}% confidence
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      +{forecast.predictedGrowth}% growth
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 block">Seasonal Impact:</span>
                  <span className="font-medium">{forecast.seasonalImpact}</span>
                </div>
                <div>
                  <span className="text-gray-600 block">Risk Factors:</span>
                  <span className="font-medium">{forecast.riskFactors.join(', ')}</span>
                </div>
                <div>
                  <span className="text-gray-600 block">Recommendations:</span>
                  <span className="font-medium">{forecast.recommendations.slice(0, 2).join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Predicted Category Breakdown</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecastData.slice(0, 4)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `£${value}`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="Food" stackId="a" fill="#ef4444" name="Food & Dining" />
              <Bar dataKey="Transport" stackId="a" fill="#f97316" name="Transportation" />
              <Bar dataKey="Shopping" stackId="a" fill="#eab308" name="Shopping" />
              <Bar dataKey="Utilities" stackId="a" fill="#22c55e" name="Utilities" />
              <Bar dataKey="Entertainment" stackId="a" fill="#8b5cf6" name="Entertainment" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-medium text-gray-900">AI-Generated Insights</h3>
        </div>
        <div className="space-y-4">
          {aiInsights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                    {insight.confidence}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Category: {insight.category}</span>
                  <span>Impact: {insight.impact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Forecast Summary</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-blue-700">Expected Monthly Average</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(6200)}</p>
            <p className="text-xs text-blue-600">Next 6 months</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-yellow-700">Peak Month</p>
            <p className="text-2xl font-bold text-yellow-800">December</p>
            <p className="text-xs text-yellow-600">{formatCurrency(6850)} predicted</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-green-700">Optimization Potential</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(280)}</p>
            <p className="text-xs text-green-600">Monthly savings possible</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForecastComponent;