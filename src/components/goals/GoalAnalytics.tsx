'use client'

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Clock,
  Users,
  Star,
  Award,
  Filter,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface GoalAnalyticsProps {
  goals: any[];
  achievements: any[];
}

const GoalAnalytics: React.FC<GoalAnalyticsProps> = ({ goals, achievements }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'performance' | 'trends' | 'insights'>('overview');

  // Calculate analytics data
  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  const averageProgress = totalGoals > 0 ? goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals : 0;

  // Progress trends data
  const progressTrends = [
    { week: 'W1', individual: 65, family: 70, total: 67 },
    { week: 'W2', individual: 72, family: 68, total: 70 },
    { week: 'W3', individual: 68, family: 75, total: 71 },
    { week: 'W4', individual: 75, family: 72, total: 73 },
    { week: 'W5', individual: 78, family: 78, total: 78 },
    { week: 'W6', individual: 82, family: 74, total: 78 },
    { week: 'W7', individual: 79, family: 81, total: 80 },
    { week: 'W8', individual: 85, family: 79, total: 82 }
  ];

  // Category performance data
  const categoryPerformance = [
    { category: 'Fitness', goals: 8, completed: 3, progress: 68, color: '#EF4444' },
    { category: 'Education', goals: 5, completed: 2, progress: 75, color: '#3B82F6' },
    { category: 'Health', goals: 6, completed: 4, progress: 82, color: '#EC4899' },
    { category: 'Family', goals: 4, completed: 2, progress: 70, color: '#8B5CF6' },
    { category: 'Personal', goals: 3, completed: 1, progress: 60, color: '#F59E0B' },
    { category: 'Finance', goals: 2, completed: 1, progress: 55, color: '#10B981' }
  ];

  // Monthly activity data
  const monthlyActivity = [
    { month: 'Jan', goals: 5, milestones: 12, achievements: 3, points: 750 },
    { month: 'Feb', goals: 7, milestones: 18, achievements: 5, points: 1200 },
    { month: 'Mar', goals: 6, milestones: 15, achievements: 4, points: 950 },
    { month: 'Apr', goals: 8, milestones: 22, achievements: 6, points: 1400 },
    { month: 'May', goals: 9, milestones: 25, achievements: 7, points: 1650 },
    { month: 'Jun', goals: 7, milestones: 20, achievements: 5, points: 1150 },
    { month: 'Jul', goals: 10, milestones: 28, achievements: 8, points: 1800 },
    { month: 'Aug', goals: 8, milestones: 24, achievements: 6, points: 1350 }
  ];

  // Goal completion velocity
  const completionVelocity = [
    { period: 'Week 1', planned: 3, actual: 2, velocity: 67 },
    { period: 'Week 2', planned: 4, actual: 3, velocity: 75 },
    { period: 'Week 3', planned: 3, actual: 4, velocity: 133 },
    { period: 'Week 4', planned: 5, actual: 3, velocity: 60 },
    { period: 'Week 5', planned: 4, actual: 5, velocity: 125 },
    { period: 'Week 6', planned: 6, actual: 4, velocity: 67 },
    { period: 'Week 7', planned: 3, actual: 3, velocity: 100 },
    { period: 'Week 8', planned: 5, actual: 6, velocity: 120 }
  ];

  // Performance metrics
  const performanceMetrics = [
    {
      metric: 'Goal Completion Rate',
      value: completionRate,
      unit: '%',
      trend: 'up',
      change: '+12%',
      color: '#10B981'
    },
    {
      metric: 'Average Progress',
      value: averageProgress,
      unit: '%',
      trend: 'up',
      change: '+8%',
      color: '#3B82F6'
    },
    {
      metric: 'Weekly Milestone Rate',
      value: 3.2,
      unit: 'per week',
      trend: 'up',
      change: '+15%',
      color: '#F59E0B'
    },
    {
      metric: 'Family Engagement',
      value: 87,
      unit: '%',
      trend: 'stable',
      change: '+2%',
      color: '#8B5CF6'
    }
  ];

  // Productivity insights
  const productivityInsights = [
    {
      title: 'Peak Performance Days',
      insight: 'Family achieves 23% more progress on Saturdays and Sundays',
      recommendation: 'Schedule important milestones on weekends',
      impact: 'high'
    },
    {
      title: 'Goal Category Success',
      insight: 'Health goals have 82% completion rate vs 55% for finance goals',
      recommendation: 'Apply health goal strategies to finance goals',
      impact: 'medium'
    },
    {
      title: 'Milestone Timing',
      insight: 'Goals with weekly milestones complete 40% faster',
      recommendation: 'Break down monthly goals into weekly milestones',
      impact: 'high'
    },
    {
      title: 'Family vs Individual',
      insight: 'Family goals show 15% higher engagement but slower completion',
      recommendation: 'Balance collaboration with individual accountability',
      impact: 'medium'
    }
  ];

  // Predictive data
  const predictions = [
    {
      goal: 'Sub-22 minute 5K',
      currentProgress: 78,
      predictedCompletion: new Date('2024-10-15'),
      confidence: 85,
      factors: ['consistent weekly progress', 'seasonal weather improvement']
    },
    {
      goal: 'German A2 Level',
      currentProgress: 45,
      predictedCompletion: new Date('2024-11-30'),
      confidence: 72,
      factors: ['steady lesson attendance', 'homework completion rate']
    },
    {
      goal: 'Learn to swim 25m',
      currentProgress: 60,
      predictedCompletion: new Date('2024-10-30'),
      confidence: 90,
      factors: ['rapid skill acquisition', 'regular practice']
    }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{metric.metric}</h3>
              {metric.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : metric.trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <div className="w-4 h-4 bg-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold" style={{ color: metric.color }}>
                {metric.value.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">{metric.unit}</span>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${
                metric.trend === 'up' ? 'text-green-600' :
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metric.change} from last period
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Trends */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress Trends</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Progress']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="individual"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Individual Goals"
              />
              <Line
                type="monotone"
                dataKey="family"
                stroke="#8B5CF6"
                strokeWidth={2}
                name="Family Goals"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#10B981"
                strokeWidth={3}
                name="Overall Progress"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Performance */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Performance</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="category" type="category" width={80} />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Progress']} />
                <Bar dataKey="progress" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Activity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="milestones"
                  stackId="1"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  name="Milestones"
                />
                <Area
                  type="monotone"
                  dataKey="achievements"
                  stackId="1"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  name="Achievements"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-8">
      {/* Completion Velocity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Goal Completion Velocity</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionVelocity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="planned" fill="#E5E7EB" name="Planned" />
              <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance by Member */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Individual Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Ade', progress: 82, goals: 5, completed: 2, color: '#3B82F6' },
            { name: 'Angela', progress: 75, goals: 3, completed: 2, color: '#EC4899' },
            { name: 'Amari', progress: 68, goals: 4, completed: 1, color: '#F59E0B' },
            { name: 'Askia', progress: 70, goals: 2, completed: 1, color: '#10B981' }
          ].map((member) => (
            <div key={member.name} className="text-center p-4 border border-gray-200 rounded-lg">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: member.color }}
              >
                {member.name[0]}
              </div>
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div>{member.progress}% avg progress</div>
                <div>{member.completed}/{member.goals} goals completed</div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${member.progress}%`,
                    backgroundColor: member.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Success Factors */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Success Factors Analysis</h2>
        <div className="space-y-4">
          {[
            { factor: 'Clear Milestones', impact: 92, description: 'Goals with defined milestones complete 92% more often' },
            { factor: 'Regular Check-ins', impact: 78, description: 'Weekly progress updates increase completion by 78%' },
            { factor: 'Family Support', impact: 65, description: 'Family goals show 65% higher engagement' },
            { factor: 'Realistic Timeline', impact: 84, description: 'Achievable deadlines improve success rate by 84%' },
            { factor: 'Progress Tracking', impact: 71, description: 'Visible progress increases motivation by 71%' }
          ].map((factor, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{factor.factor}</h4>
                <p className="text-sm text-gray-600">{factor.description}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">+{factor.impact}%</div>
                  <div className="text-xs text-gray-500">Impact</div>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${factor.impact}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-8">
      {/* Productivity Insights */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Productivity Insights</h2>
        <div className="space-y-6">
          {productivityInsights.map((insight, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  insight.impact === 'high'
                    ? 'bg-red-100 text-red-800'
                    : insight.impact === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {insight.impact} impact
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-3">{insight.insight}</p>
              <div className="flex items-center space-x-2 text-sm">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700 font-medium">Recommendation:</span>
                <span className="text-gray-700">{insight.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Predictions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Goal Completion Predictions</h2>
        <div className="space-y-4">
          {predictions.map((prediction, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{prediction.goal}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    prediction.confidence >= 80
                      ? 'bg-green-100 text-green-800'
                      : prediction.confidence >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {prediction.confidence}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Progress:</span>
                  <div className="font-medium">{prediction.currentProgress}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full"
                      style={{ width: `${prediction.currentProgress}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Predicted Completion:</span>
                  <div className="font-medium">{prediction.predictedCompletion.toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Key Factors:</span>
                  <div className="text-xs space-y-1 mt-1">
                    {prediction.factors.map((factor, idx) => (
                      <div key={idx} className="text-gray-700">• {factor}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Smart Recommendations</h2>
        <div className="space-y-4">
          {[
            {
              type: 'goal_suggestion',
              title: 'New Goal Suggestion',
              message: 'Based on your fitness progress, consider adding a strength training goal',
              action: 'Create Goal',
              priority: 'medium'
            },
            {
              type: 'milestone_adjustment',
              title: 'Milestone Optimization',
              message: 'Break down "German A2 Level" into smaller weekly milestones for better progress',
              action: 'Adjust Milestones',
              priority: 'high'
            },
            {
              type: 'engagement_boost',
              title: 'Engagement Opportunity',
              message: 'Askia hasn\'t updated progress in 5 days. Send encouragement?',
              action: 'Send Message',
              priority: 'low'
            }
          ].map((rec, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    rec.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{rec.message}</p>
              </div>
              <button className="ml-4 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                {rec.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['overview', 'performance', 'trends', 'insights'].map((view) => (
            <button
              key={view}
              onClick={() => setAnalyticsView(view as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                analyticsView === view
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>

          <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {analyticsView === 'overview' && renderOverview()}
      {analyticsView === 'performance' && renderPerformance()}
      {analyticsView === 'trends' && renderOverview()} {/* Reusing overview for trends */}
      {analyticsView === 'insights' && renderInsights()}
    </div>
  );
};

export default GoalAnalytics;