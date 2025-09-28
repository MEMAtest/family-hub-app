'use client'

import React, { useState, useEffect } from 'react';
import { NutritionAnalysis, NutritionGoals, WeeklyNutritionSummary, NutritionInfo } from '@/types/meals.types';
import {
  Activity,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  Download,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadialBarChart, RadialBar, Legend } from 'recharts';

interface NutritionTrackerProps {
  onClose?: () => void;
}

const NutritionTracker: React.FC<NutritionTrackerProps> = ({ onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPerson, setSelectedPerson] = useState<'all' | string>('all');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [nutritionAnalysis, setNutritionAnalysis] = useState<NutritionAnalysis | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyNutritionSummary | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const mockNutritionGoals: NutritionGoals = {
    dailyCalories: 2000,
    dailyProtein: 150,
    dailyCarbs: 250,
    dailyFat: 67,
    dailyFiber: 25,
    dailySodium: 2300,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockDailyAnalysis: NutritionAnalysis = {
    date: selectedDate,
    actual: {
      calories: 1850,
      protein: 128,
      carbs: 210,
      fat: 62,
      fiber: 22,
      sugar: 45,
      sodium: 1950
    },
    goals: mockNutritionGoals,
    score: 8.5,
    percentages: {
      calories: 92.5,
      protein: 85.3,
      carbs: 84.0,
      fat: 92.5,
      fiber: 88.0
    },
    status: {
      calories: 'within',
      protein: 'under',
      carbs: 'within',
      fat: 'within'
    },
    recommendations: [
      'Add a protein-rich snack to meet daily protein goals',
      'Include more fiber-rich foods like beans or whole grains',
      'Great job staying within calorie limits!'
    ]
  };

  const mockWeeklyData: WeeklyNutritionSummary = {
    averageDaily: {
      calories: 1920,
      protein: 135,
      carbs: 225,
      fat: 65,
      fiber: 24,
      sugar: 48,
      sodium: 2100
    },
    weeklyTotals: {
      calories: 13440,
      protein: 945,
      carbs: 1575,
      fat: 455,
      fiber: 168,
      sugar: 336,
      sodium: 14700
    },
    nutritionScore: 8.2,
    deficiencies: ['Vitamin D', 'Omega-3'],
    excesses: ['Sodium'],
    recommendations: [
      'Add fatty fish twice per week for Omega-3',
      'Consider vitamin D supplement',
      'Reduce processed foods to lower sodium'
    ]
  };

  const familyMembers = [
    { id: 'all', name: 'All Family', color: '#3b82f6' },
    { id: 'alice', name: 'Alice', color: '#ef4444' },
    { id: 'bob', name: 'Bob', color: '#10b981' },
    { id: 'charlie', name: 'Charlie', color: '#f59e0b' },
    { id: 'diana', name: 'Diana', color: '#8b5cf6' }
  ];

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setNutritionAnalysis(mockDailyAnalysis);
      setWeeklyData(mockWeeklyData);
      setGoals(mockNutritionGoals);
      setIsLoading(false);
    }, 1000);
  }, [selectedDate, selectedPerson]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'daily':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'weekly':
        newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'monthly':
        newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'within': return 'text-green-600 bg-green-100';
      case 'under': return 'text-yellow-600 bg-yellow-100';
      case 'over': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Chart data
  const macroData = nutritionAnalysis ? [
    { name: 'Protein', value: nutritionAnalysis.actual.protein, color: '#ef4444', goal: nutritionAnalysis.goals.dailyProtein },
    { name: 'Carbs', value: nutritionAnalysis.actual.carbs, color: '#3b82f6', goal: nutritionAnalysis.goals.dailyCarbs },
    { name: 'Fat', value: nutritionAnalysis.actual.fat, color: '#f59e0b', goal: nutritionAnalysis.goals.dailyFat }
  ] : [];

  const progressData = nutritionAnalysis ? [
    { name: 'Calories', percentage: nutritionAnalysis.percentages.calories, color: '#8b5cf6' },
    { name: 'Protein', percentage: nutritionAnalysis.percentages.protein, color: '#ef4444' },
    { name: 'Carbs', percentage: nutritionAnalysis.percentages.carbs, color: '#3b82f6' },
    { name: 'Fat', percentage: nutritionAnalysis.percentages.fat, color: '#f59e0b' },
    { name: 'Fiber', percentage: nutritionAnalysis.percentages.fiber, color: '#10b981' }
  ] : [];

  // Mock trend data
  const trendData = [
    { date: 'Mon', calories: 1890, protein: 125, score: 8.1 },
    { date: 'Tue', calories: 2050, protein: 140, score: 7.8 },
    { date: 'Wed', calories: 1920, protein: 135, score: 8.3 },
    { date: 'Thu', calories: 1850, protein: 128, score: 8.5 },
    { date: 'Fri', calories: 2100, protein: 145, score: 7.9 },
    { date: 'Sat', calories: 1980, protein: 138, score: 8.2 },
    { date: 'Sun', calories: 1850, protein: 130, score: 8.4 }
  ];

  const renderDailyView = () => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Calories</p>
              <p className="text-2xl font-bold text-gray-900">
                {nutritionAnalysis?.actual.calories || 0}
              </p>
              <p className="text-xs text-gray-500">
                of {nutritionAnalysis?.goals.dailyCalories || 0}
              </p>
            </div>
            <div className={`p-2 rounded-full ${getStatusColor(nutritionAnalysis?.status.calories || 'within')}`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Protein</p>
              <p className="text-2xl font-bold text-gray-900">
                {nutritionAnalysis?.actual.protein || 0}g
              </p>
              <p className="text-xs text-gray-500">
                of {nutritionAnalysis?.goals.dailyProtein || 0}g
              </p>
            </div>
            <div className={`p-2 rounded-full ${getStatusColor(nutritionAnalysis?.status.protein || 'within')}`}>
              <Target className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Carbs</p>
              <p className="text-2xl font-bold text-gray-900">
                {nutritionAnalysis?.actual.carbs || 0}g
              </p>
              <p className="text-xs text-gray-500">
                of {nutritionAnalysis?.goals.dailyCarbs || 0}g
              </p>
            </div>
            <div className={`p-2 rounded-full ${getStatusColor(nutritionAnalysis?.status.carbs || 'within')}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nutrition Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(nutritionAnalysis?.score || 0)}`}>
                {nutritionAnalysis?.score.toFixed(1) || '0.0'}/10
              </p>
              <p className="text-xs text-gray-500">Today's rating</p>
            </div>
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Macro Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Macronutrient Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}g`}
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Progress</h3>
          <div className="space-y-4">
            {progressData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: item.color
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {nutritionAnalysis?.recommendations && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Info className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900">Daily Recommendations</h3>
          </div>
          <div className="space-y-3">
            {nutritionAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderWeeklyView = () => (
    <div className="space-y-6">
      {/* Weekly Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {weeklyData?.nutritionScore.toFixed(1) || '0.0'}
            </p>
            <p className="text-sm text-gray-600">Avg Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(weeklyData?.averageDaily.calories || 0)}
            </p>
            <p className="text-sm text-gray-600">Avg Calories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(weeklyData?.averageDaily.protein || 0)}g
            </p>
            <p className="text-sm text-gray-600">Avg Protein</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(weeklyData?.averageDaily.fiber || 0)}g
            </p>
            <p className="text-sm text-gray-600">Avg Fiber</p>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="calories" stroke="#3b82f6" strokeWidth={2} name="Calories" />
              <Line yAxisId="left" type="monotone" dataKey="protein" stroke="#ef4444" strokeWidth={2} name="Protein (g)" />
              <Line yAxisId="right" type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} name="Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Insights */}
      {weeklyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deficiencies */}
          {weeklyData.deficiencies.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-medium text-gray-900">Nutrient Gaps</h3>
              </div>
              <div className="space-y-2">
                {weeklyData.deficiencies.map((def, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="text-sm font-medium text-yellow-800">{def}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Excesses */}
          {weeklyData.excesses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-medium text-gray-900">Watch Out For</h3>
              </div>
              <div className="space-y-2">
                {weeklyData.excesses.map((excess, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-red-50 border border-red-200 rounded">
                    <span className="text-sm font-medium text-red-800">{excess}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading nutrition data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Nutrition Tracker</h1>
            <p className="text-gray-600">Monitor your family's nutritional intake and goals</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Goals</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* View Mode */}
          <div className="flex items-center border border-gray-300 rounded-sm">
            {['daily', 'weekly', 'monthly'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-3 py-2 text-sm font-medium capitalize ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Person Selector */}
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="border border-gray-300 rounded-sm px-3 py-2 text-sm"
          >
            {familyMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-medium text-gray-900 min-w-[200px] text-center">
            {viewMode === 'daily' && formatDate(selectedDate)}
            {viewMode === 'weekly' && `Week of ${selectedDate.toLocaleDateString('en-GB')}`}
            {viewMode === 'monthly' && selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'daily' && renderDailyView()}
      {viewMode === 'weekly' && renderWeeklyView()}
      {viewMode === 'monthly' && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly View</h3>
          <p className="text-gray-600">Monthly nutrition analysis coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default NutritionTracker;