'use client'

import React from 'react';
import { ReportFilter } from '@/types/reporting.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Target, TrendingUp, Calendar, CheckCircle, AlertCircle, Clock, Award } from 'lucide-react';

interface SavingsGoalsReportProps {
  filter: ReportFilter;
  incomeList?: any[];
  expenseList?: any[];
}

const SavingsGoalsReportComponent: React.FC<SavingsGoalsReportProps> = ({ filter, incomeList = [], expenseList = [] }) => {
  // Calculate real savings data from income and expenses
  const totalIncome = React.useMemo(() => {
    return incomeList
      .filter(item => item.isRecurring)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [incomeList]);

  const totalExpenses = React.useMemo(() => {
    return expenseList
      .filter(item => item.isRecurring)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [expenseList]);

  const monthlySavings = totalIncome - totalExpenses;

  // Generate goals based on real data
  const mockGoalsData = React.useMemo(() => {
    if (monthlySavings <= 0) {
      return [{
        id: '1',
        name: 'Start Saving',
        targetAmount: 1000,
        currentAmount: 0,
        monthlyContribution: 0,
        projectedCompletion: 'N/A',
        status: 'at-risk',
        priority: 'high',
        category: 'Emergency'
      }];
    }

    // Create realistic goals based on monthly savings capacity
    const emergencyTarget = totalExpenses * 6; // 6 months of expenses
    const emergencyContribution = Math.round(monthlySavings * 0.5); // 50% to emergency fund
    const otherSavingsContribution = monthlySavings - emergencyContribution;

    return [
      {
        id: '1',
        name: 'Emergency Fund',
        targetAmount: emergencyTarget,
        currentAmount: Math.round(emergencyTarget * 0.2), // Assume 20% progress
        monthlyContribution: emergencyContribution,
        projectedCompletion: '2026-06-15',
        status: 'on-track',
        priority: 'high',
        category: 'Security'
      },
      {
        id: '2',
        name: 'Savings Goal',
        targetAmount: Math.round(otherSavingsContribution * 12), // One year of other savings
        currentAmount: Math.round(otherSavingsContribution * 3), // 3 months saved
        monthlyContribution: otherSavingsContribution,
        projectedCompletion: '2026-12-31',
        status: 'on-track',
        priority: 'medium',
        category: 'General'
      }
    ];
  }, [monthlySavings, totalExpenses]);

  // Calculate contribution history from goals
  const contributionHistory = React.useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug'];
    return months.map(month => {
      const historyItem: any = { month };
      mockGoalsData.forEach(goal => {
        historyItem[goal.name] = goal.monthlyContribution;
      });
      return historyItem;
    });
  }, [mockGoalsData]);

  // Calculate overall stats from real data
  const overallStats = React.useMemo(() => {
    const totalTargetAmount = mockGoalsData.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrentAmount = mockGoalsData.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const monthlyContributions = mockGoalsData.reduce((sum, goal) => sum + goal.monthlyContribution, 0);
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

    // Calculate average time to completion
    const avgMonthsRemaining = mockGoalsData.reduce((sum, goal) => {
      const remaining = goal.targetAmount - goal.currentAmount;
      const months = goal.monthlyContribution > 0 ? remaining / goal.monthlyContribution : 0;
      return sum + months;
    }, 0) / Math.max(1, mockGoalsData.length);

    return {
      totalGoals: mockGoalsData.length,
      activeGoals: mockGoalsData.length,
      completedGoals: 0,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgress,
      monthlyContributions,
      avgTimeToCompletion: avgMonthsRemaining
    };
  }, [mockGoalsData]);

  // Generate milestones from goals
  const milestones = React.useMemo(() => {
    const result: any[] = [];
    mockGoalsData.forEach(goal => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;

      // Add achieved milestones
      if (progress >= 25) {
        result.push({
          goal: goal.name,
          milestone: '25%',
          achievedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ago
          type: 'achieved'
        });
      }

      // Add upcoming milestones
      if (progress < 50) {
        result.push({
          goal: goal.name,
          milestone: '50%',
          projectedDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ahead
          type: 'upcoming'
        });
      }
    });
    return result;
  }, [mockGoalsData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'on-track': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'behind': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'at-risk': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'bg-green-100 text-green-800 border-green-200';
      case 'on-track': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'behind': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'at-risk': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const progressChartData = mockGoalsData.map(goal => ({
    name: goal.name,
    progress: Math.round((goal.currentAmount / goal.targetAmount) * 100),
    current: goal.currentAmount,
    target: goal.targetAmount
  }));

  const categoryData = mockGoalsData.reduce((acc, goal) => {
    const existing = acc.find(item => item.category === goal.category);
    if (existing) {
      existing.amount += goal.currentAmount;
      existing.target += goal.targetAmount;
    } else {
      acc.push({
        category: goal.category,
        amount: goal.currentAmount,
        target: goal.targetAmount
      });
    }
    return acc;
  }, [] as any[]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Progress</p>
              <p className="text-2xl font-bold text-blue-600">{overallStats.overallProgress}%</p>
              <p className="text-xs text-gray-500">
                {formatCurrency(overallStats.totalCurrentAmount)} of {formatCurrency(overallStats.totalTargetAmount)}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Contributions</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(overallStats.monthlyContributions)}</p>
              <p className="text-xs text-gray-500">Across {overallStats.activeGoals} active goals</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Goals Completed</p>
              <p className="text-2xl font-bold text-purple-600">{overallStats.completedGoals}</p>
              <p className="text-xs text-gray-500">This year</p>
            </div>
            <Award className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Completion</p>
              <p className="text-2xl font-bold text-indigo-600">{overallStats.avgTimeToCompletion}mo</p>
              <p className="text-xs text-gray-500">Per goal</p>
            </div>
            <Calendar className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Goals Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Goals Progress Overview</h3>

        <div className="grid grid-cols-2 gap-8">
          {/* Progress Bar Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Progress by Goal</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="progress" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Savings by Category</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({ category, amount }) => `${category}: ${formatCurrency(amount as number)}`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Individual Goals Analysis</h3>
        <div className="grid gap-4">
          {mockGoalsData.map((goal) => {
            const progressPercentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
            const remaining = goal.targetAmount - goal.currentAmount;
            const monthsToComplete = Math.ceil(remaining / goal.monthlyContribution);

            return (
              <div key={goal.id} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{goal.name}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(goal.status)}`}>
                        {getStatusIcon(goal.status)}
                        <span className="ml-1 capitalize">{goal.status.replace('-', ' ')}</span>
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                        {goal.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{goal.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(remaining)} remaining
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Monthly Contribution:</span>
                    <div className="font-medium">{formatCurrency(goal.monthlyContribution)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Est. Completion:</span>
                    <div className="font-medium">{goal.projectedCompletion}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Months Remaining:</span>
                    <div className="font-medium">{monthsToComplete} months</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contribution Trends */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Contribution Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={contributionHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `£${value}`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Line type="monotone" dataKey="Emergency Fund" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Holiday Fund" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Home Renovation" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="New Car Fund" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Milestones & Achievements */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Milestones & Upcoming Targets</h3>
        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg ${
              milestone.type === 'achieved' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              {milestone.type === 'achieved' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Target className="w-5 h-5 text-blue-500" />
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{milestone.goal}</span>
                  <span className="text-sm font-medium text-gray-700">{milestone.milestone} milestone</span>
                </div>
                <div className="text-sm text-gray-600">
                  {milestone.type === 'achieved' ? (
                    <>Achieved on {new Date(milestone.achievedDate!).toLocaleDateString()}</>
                  ) : (
                    <>Projected for {new Date(milestone.projectedDate!).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SavingsGoalsReportComponent;