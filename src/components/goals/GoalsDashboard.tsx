'use client'

import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  TrendingUp,
  Star,
  Users,
  Calendar,
  Award,
  Trophy,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Filter,
  Search,
  User,
  Zap,
  Heart,
  Crown,
  Medal,
  Gift,
  Flag,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Edit,
  Trash2,
  Share,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';
import GoalForm from './GoalForm';
import AchievementTracker from './AchievementTracker';
import GoalAnalytics from './GoalAnalytics';
import databaseService from '@/services/databaseService';

interface GoalsDashboardProps {
  onClose?: () => void;
}

const GoalsDashboard: React.FC<GoalsDashboardProps> = ({ onClose }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'family' | 'individual' | 'achievements' | 'analytics'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [filterType, setFilterType] = useState<'all' | 'family' | 'individual'>('all');
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>('all');

  // Mobile states
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mock data for goals system
  const familyMembers = [
    { id: 'ade', name: 'Ade', color: '#3B82F6', avatar: '🏃' },
    { id: 'angela', name: 'Angela', color: '#EC4899', avatar: '💼' },
    { id: 'askia', name: 'Askia', color: '#10B981', avatar: '🎓' },
    { id: 'amari', name: 'Amari', color: '#F59E0B', avatar: '⚽' }
  ];

  const goalCategories = [
    { id: 'fitness', name: 'Fitness', icon: '💪', color: '#EF4444' },
    { id: 'education', name: 'Education', icon: '📚', color: '#3B82F6' },
    { id: 'health', name: 'Health', icon: '❤️', color: '#EC4899' },
    { id: 'finance', name: 'Finance', icon: '💰', color: '#10B981' },
    { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦', color: '#8B5CF6' },
    { id: 'personal', name: 'Personal', icon: '🌟', color: '#F59E0B' },
    { id: 'career', name: 'Career', icon: '💼', color: '#6366F1' },
    { id: 'hobby', name: 'Hobby', icon: '🎨', color: '#06B6D4' }
  ];

  const mockGoals = [
    {
      id: '1',
      title: 'Family Fitness Challenge',
      description: 'Each member achieves weekly fitness targets',
      category: 'fitness',
      type: 'family',
      participants: ['ade', 'angela', 'amari', 'askia'],
      priority: 'high',
      status: 'active',
      progress: 68,
      target: { type: 'numeric', value: 100, unit: '%' },
      current: { value: 68, lastUpdated: new Date() },
      startDate: new Date('2024-08-01'),
      targetDate: new Date('2024-12-31'),
      milestones: [
        { id: '1', title: 'First Month Complete', targetValue: 25, isCompleted: true, order: 1 },
        { id: '2', title: 'Half Way Point', targetValue: 50, isCompleted: true, order: 2 },
        { id: '3', title: 'Three Quarters Done', targetValue: 75, isCompleted: false, order: 3 },
        { id: '4', title: 'Goal Achieved', targetValue: 100, isCompleted: false, order: 4 }
      ],
      tags: ['fitness', 'family', 'challenge'],
      createdAt: new Date('2024-08-01')
    },
    {
      id: '2',
      title: 'Sub-22 minute 5K',
      description: 'Achieve a 5K run time under 22 minutes',
      category: 'fitness',
      type: 'individual',
      assignedTo: 'ade',
      participants: ['ade'],
      priority: 'high',
      status: 'active',
      progress: 78,
      target: { type: 'numeric', value: 22, unit: 'minutes' },
      current: { value: 22.45, lastUpdated: new Date() },
      startDate: new Date('2024-07-01'),
      targetDate: new Date('2024-10-31'),
      milestones: [
        { id: '1', title: 'Under 24 minutes', targetValue: 24, isCompleted: true, order: 1 },
        { id: '2', title: 'Under 23 minutes', targetValue: 23, isCompleted: true, order: 2 },
        { id: '3', title: 'Under 22.5 minutes', targetValue: 22.5, isCompleted: true, order: 3 },
        { id: '4', title: 'Under 22 minutes', targetValue: 22, isCompleted: false, order: 4 }
      ],
      tags: ['running', 'fitness', 'personal'],
      createdAt: new Date('2024-07-01')
    },
    {
      id: '3',
      title: 'German A2 Level',
      description: 'Achieve A2 level proficiency in German',
      category: 'education',
      type: 'individual',
      assignedTo: 'amari',
      participants: ['amari'],
      priority: 'medium',
      status: 'active',
      progress: 45,
      target: { type: 'milestone', value: 'A2 Certificate' },
      current: { value: 'A1 Complete', lastUpdated: new Date() },
      startDate: new Date('2024-01-15'),
      targetDate: new Date('2024-12-15'),
      milestones: [
        { id: '1', title: 'A1 Foundation', targetValue: 'A1', isCompleted: true, order: 1 },
        { id: '2', title: 'A1 Complete', targetValue: 'A1+', isCompleted: true, order: 2 },
        { id: '3', title: 'A2 Foundation', targetValue: 'A2-', isCompleted: false, order: 3 },
        { id: '4', title: 'A2 Complete', targetValue: 'A2', isCompleted: false, order: 4 }
      ],
      tags: ['language', 'education', 'german'],
      createdAt: new Date('2024-01-15')
    },
    {
      id: '4',
      title: 'Healthy Eating Goals',
      description: 'Plan and eat 5 home-cooked meals per week',
      category: 'health',
      type: 'family',
      participants: ['ade', 'angela', 'amari', 'askia'],
      priority: 'medium',
      status: 'active',
      progress: 80,
      target: { type: 'numeric', value: 5, unit: 'meals/week' },
      current: { value: 4, lastUpdated: new Date() },
      startDate: new Date('2024-08-01'),
      targetDate: new Date('2024-09-30'),
      milestones: [
        { id: '1', title: '3 meals per week', targetValue: 3, isCompleted: true, order: 1 },
        { id: '2', title: '4 meals per week', targetValue: 4, isCompleted: true, order: 2 },
        { id: '3', title: '5 meals per week', targetValue: 5, isCompleted: false, order: 3 }
      ],
      tags: ['health', 'nutrition', 'family'],
      createdAt: new Date('2024-08-01')
    },
    {
      id: '5',
      title: 'Learn to swim 25m',
      description: 'Complete a 25-meter swim without stopping',
      category: 'fitness',
      type: 'individual',
      assignedTo: 'askia',
      participants: ['askia'],
      priority: 'medium',
      status: 'active',
      progress: 60,
      target: { type: 'numeric', value: 25, unit: 'meters' },
      current: { value: 15, lastUpdated: new Date() },
      startDate: new Date('2024-06-01'),
      targetDate: new Date('2024-11-30'),
      milestones: [
        { id: '1', title: '5 meters', targetValue: 5, isCompleted: true, order: 1 },
        { id: '2', title: '10 meters', targetValue: 10, isCompleted: true, order: 2 },
        { id: '3', title: '15 meters', targetValue: 15, isCompleted: true, order: 3 },
        { id: '4', title: '25 meters', targetValue: 25, isCompleted: false, order: 4 }
      ],
      tags: ['swimming', 'fitness', 'milestone'],
      createdAt: new Date('2024-06-01')
    }
  ];

  const achievements: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
    earnedBy: string;
    earnedDate: Date;
    points: number;
    badge: { name: string; icon: string; color: string };
  }> = [
    {
      id: '1',
      title: 'First Goal Scorer',
      description: 'Scored first goal of the season',
      type: 'sport',
      difficulty: 'bronze',
      earnedBy: 'amari',
      earnedDate: new Date('2024-08-15'),
      points: 100,
      badge: { name: 'Goal Scorer', icon: '⚽', color: '#10B981' }
    },
    {
      id: '2',
      title: 'Swimming Badge',
      description: 'Completed 10m freestyle swim',
      type: 'fitness',
      difficulty: 'silver',
      earnedBy: 'askia',
      earnedDate: new Date('2024-08-20'),
      points: 250,
      badge: { name: 'Swimmer', icon: '🏊', color: '#3B82F6' }
    },
    {
      id: '3',
      title: 'Consistency Champion',
      description: 'Completed 4 workouts per week for 4 weeks',
      type: 'fitness',
      difficulty: 'gold',
      earnedBy: 'ade',
      earnedDate: new Date('2024-08-25'),
      points: 500,
      badge: { name: 'Consistent', icon: '🏋️', color: '#F59E0B' }
    }
  ];

  const recentActivity = [
    {
      id: '1',
      type: 'milestone_reached',
      personId: 'ade',
      goalId: '2',
      message: 'Ade reached milestone: Under 22.5 minutes for 5K run',
      timestamp: new Date('2024-09-18T10:30:00'),
      points: 100
    },
    {
      id: '2',
      type: 'progress_update',
      personId: 'askia',
      goalId: '5',
      message: 'Askia updated swimming progress: 15 meters completed',
      timestamp: new Date('2024-09-17T16:45:00'),
      points: 50
    },
    {
      id: '3',
      type: 'goal_completed',
      personId: 'amari',
      goalId: '3',
      message: 'Family completed weekly healthy eating goal',
      timestamp: new Date('2024-09-16T19:00:00'),
      points: 200
    }
  ];

  const [goals, setGoals] = useState(mockGoals);

  // Mobile Header Component
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600" />
          <h1 className="mobile-title">Goals</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="mobile-btn-secondary flex items-center gap-1 px-3 py-2"
          >
            <Filter className="w-4 h-4" />
            <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setShowMobileMenu(true)}
            className="mobile-btn-secondary p-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* View Tabs - Mobile */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Overview', icon: BarChart3 },
          { id: 'family', label: 'Family', icon: Users },
          { id: 'individual', label: 'Personal', icon: User },
          { id: 'achievements', label: 'Badges', icon: Trophy },
          { id: 'analytics', label: 'Stats', icon: TrendingUp }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as any)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeView === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Filters Dropdown */}
      {showMobileFilters && (
        <div className="absolute left-4 right-4 top-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search goals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-input pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="mobile-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="mobile-select"
            >
              <option value="all">All Types</option>
              <option value="family">Family</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="mobile-select w-full"
          >
            <option value="all">All Members</option>
            {familyMembers.map(person => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  // Mobile Menu Overlay Component
  const renderMobileMenu = () => {
    if (!showMobileMenu) return null;

    return (
      <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowMobileMenu(false)}>
        <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 pwa-safe-top">
            <h2 className="text-lg font-semibold text-gray-900">Goals Menu</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <button
              onClick={() => {
                setShowNewGoalForm(true);
                setShowMobileMenu(false);
              }}
              className="mobile-btn-primary w-full flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              New Goal
            </button>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">View Options</h3>
              <div className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard Overview', icon: BarChart3 },
                  { id: 'family', label: 'Family Goals', icon: Users },
                  { id: 'individual', label: 'Individual Goals', icon: User },
                  { id: 'achievements', label: 'Achievements', icon: Trophy },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveView(id as any);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      activeView === id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus;
    const matchesType = filterType === 'all' || goal.type === filterType;
    const matchesPerson = selectedPerson === 'all' ||
                         goal.participants.includes(selectedPerson) ||
                         goal.assignedTo === selectedPerson;

    return matchesSearch && matchesStatus && matchesType && matchesPerson;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (categoryId: string) => {
    const category = goalCategories.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10B981';
    if (progress >= 60) return '#F59E0B';
    if (progress >= 40) return '#EF4444';
    return '#6B7280';
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return { color: '#CD7F32', icon: '🥉' };
      case 'silver': return { color: '#C0C0C0', icon: '🥈' };
      case 'gold': return { color: '#FFD700', icon: '🥇' };
      case 'platinum': return { color: '#E5E4E2', icon: '💎' };
      case 'legendary': return { color: '#9932CC', icon: '👑' };
      default: return { color: '#6B7280', icon: '🏅' };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Calculate dashboard stats
  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const averageProgress = totalGoals > 0 ? goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals : 0;
  const totalAchievements = achievements.length;
  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);

  // Chart data
  const progressChartData = goals.map(goal => ({
    name: goal.title.substring(0, 20) + (goal.title.length > 20 ? '...' : ''),
    progress: goal.progress,
    target: 100,
    category: goal.category
  }));

  const categoryData = goalCategories.map(category => ({
    name: category.name,
    value: goals.filter(g => g.category === category.id).length,
    color: category.color
  })).filter(item => item.value > 0);

  const activityData = [
    { name: 'Mon', updates: 3, milestones: 1, points: 150 },
    { name: 'Tue', updates: 5, milestones: 2, points: 250 },
    { name: 'Wed', updates: 2, milestones: 0, points: 100 },
    { name: 'Thu', updates: 4, milestones: 1, points: 200 },
    { name: 'Fri', updates: 6, milestones: 3, points: 400 },
    { name: 'Sat', updates: 3, milestones: 1, points: 180 },
    { name: 'Sun', updates: 4, milestones: 2, points: 320 }
  ];

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className={`grid gap-6 ${
        isMobile
          ? 'grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        <div className={`bg-white border border-gray-200 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Active Goals</p>
              <p className={`font-bold text-gray-900 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>{activeGoals}</p>
            </div>
            <Target className={`text-blue-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          <div className="mt-2">
            <span className={`text-gray-500 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {totalGoals} total goals
            </span>
          </div>
        </div>

        <div className={`bg-white border border-gray-200 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Avg Progress</p>
              <p className={`font-bold text-gray-900 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>{averageProgress.toFixed(0)}%</p>
            </div>
            <TrendingUp className={`text-green-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          <div className="mt-2">
            <div className={`w-full bg-gray-200 rounded-full ${
              isMobile ? 'h-1.5' : 'h-2'
            }`}>
              <div
                className={`bg-green-500 rounded-full transition-all duration-300 ${
                  isMobile ? 'h-1.5' : 'h-2'
                }`}
                style={{ width: `${averageProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className={`bg-white border border-gray-200 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Achievements</p>
              <p className={`font-bold text-gray-900 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>{totalAchievements}</p>
            </div>
            <Trophy className={`text-yellow-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          <div className="mt-2">
            <span className={`text-gray-500 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {achievements.filter(a => new Date(a.earnedDate).getMonth() === new Date().getMonth()).length} this month
            </span>
          </div>
        </div>

        <div className={`bg-white border border-gray-200 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Total Points</p>
              <p className={`font-bold text-gray-900 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>{isMobile ? `${Math.round(totalPoints / 1000)}k` : totalPoints.toLocaleString()}</p>
            </div>
            <Star className={`text-purple-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          <div className="mt-2">
            <span className={`text-green-600 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              +320 this week
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`bg-white border border-gray-200 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <h2 className={`font-semibold text-gray-900 mb-4 ${
          isMobile ? 'text-lg' : 'text-xl'
        }`}>Quick Actions</h2>
        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          <button
            onClick={() => setShowNewGoalForm(true)}
            className={`flex items-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            }`}
          >
            <Plus className={`text-green-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 ${
                isMobile ? 'text-sm' : ''
              }`}>New Goal</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600">Create a new goal</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveView('achievements')}
            className={`flex items-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            }`}
          >
            <Award className={`text-yellow-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 ${
                isMobile ? 'text-sm' : ''
              }`}>Achievements</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600">View all badges</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            }`}
          >
            <BarChart3 className={`text-blue-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 ${
                isMobile ? 'text-sm' : ''
              }`}>Analytics</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600">View progress data</p>
              )}
            </div>
          </button>

          <button className={`flex items-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
            isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
          }`}>
            <Users className={`text-purple-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 ${
                isMobile ? 'text-sm' : ''
              }`}>Team Challenge</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600">Start a challenge</p>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className={`grid gap-8 ${
        isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
      }`}>
        {/* Active Goals Progress */}
        <div className={`bg-white border border-gray-200 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold text-gray-900 ${
              isMobile ? 'text-lg' : 'text-xl'
            }`}>Active Goals Progress</h2>
            <button
              onClick={() => setActiveView('family')}
              className={`text-blue-600 hover:text-blue-800 font-medium ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}
            >
              View All →
            </button>
          </div>

          <div className={isMobile ? 'h-48' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressChartData.slice(0, isMobile ? 3 : 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={isMobile ? 50 : 60}
                />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip
                  formatter={(value: any, name: string) => [`${value}%`, 'Progress']}
                />
                <Bar dataKey="progress" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>

          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const person = familyMembers.find(p => p.id === activity.personId);
              return (
                <div key={activity.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: person?.color }}
                  >
                    {person?.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                  {activity.points && (
                    <div className="text-sm font-medium text-yellow-600">
                      +{activity.points} pts
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals by Category */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Goals by Category</h2>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Activity</h2>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="updates" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="milestones" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="points" stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Achievements</h2>
          <button
            onClick={() => setActiveView('achievements')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.slice(0, 3).map((achievement) => {
            const person = familyMembers.find(p => p.id === achievement.earnedBy);
            const difficultyBadge = getDifficultyBadge(achievement.difficulty);

            return (
              <div key={achievement.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: person?.color }}
                  >
                    {person?.avatar}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span style={{ color: difficultyBadge.color }}>{difficultyBadge.icon}</span>
                    <span className="text-sm font-medium" style={{ color: difficultyBadge.color }}>
                      {achievement.difficulty.charAt(0).toUpperCase() + achievement.difficulty.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-yellow-600">
                    +{achievement.points} pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderGoalsList = () => (
    <div className="space-y-6">
      {/* Filters and Search - Desktop Only (Mobile uses header dropdown) */}
      {!isMobile && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search goals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="family">Family Goals</option>
            <option value="individual">Individual Goals</option>
          </select>

          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Members</option>
            {familyMembers.map(person => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowNewGoalForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      )}

      {/* Goals Grid */}
      <div className={`grid gap-6 ${
        isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {filteredGoals.map((goal) => {
          const category = goalCategories.find(c => c.id === goal.category);
          const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;

          return (
            <div key={goal.id} className={`bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow ${
              isMobile ? 'p-4' : 'p-6'
            }`}>
              <div className={`flex items-start justify-between ${
                isMobile ? 'mb-3' : 'mb-4'
              }`}>
                <div className={`flex items-center ${
                  isMobile ? 'space-x-1' : 'space-x-2'
                }`}>
                  <span style={{ color: category?.color }}>{category?.icon}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(goal.status)}`}>
                    {goal.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(goal.priority)}`}>
                    {goal.priority}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <button className="text-gray-400 hover:text-gray-600">
                    <Eye className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                  </button>
                </div>
              </div>

              <h3 className={`font-semibold text-gray-900 mb-2 ${
                isMobile ? 'text-base' : ''
              }`}>{goal.title}</h3>
              <p className={`text-gray-600 mb-4 ${
                isMobile ? 'text-sm line-clamp-2' : 'text-sm'
              }`}>{goal.description}</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${goal.progress}%`,
                      backgroundColor: getProgressColor(goal.progress)
                    }}
                  ></div>
                </div>
              </div>

              {/* Milestones */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Milestones</span>
                  <span>{completedMilestones}/{goal.milestones.length}</span>
                </div>
                <div className="flex space-x-1">
                  {goal.milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className={`flex-1 h-1 rounded ${
                        milestone.isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {goal.participants.slice(0, 3).map(participantId => {
                    const person = familyMembers.find(p => p.id === participantId);
                    return (
                      <div
                        key={participantId}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold"
                        style={{ backgroundColor: person?.color }}
                        title={person?.name}
                      >
                        {person?.avatar}
                      </div>
                    );
                  })}
                  {goal.participants.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700 font-bold">
                      +{goal.participants.length - 3}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  Due {new Date(goal.targetDate).toLocaleDateString()}
                </div>
              </div>

              {/* Tags */}
              {goal.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {goal.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredGoals.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first goal to get started'}
          </p>
          <button
            onClick={() => setShowNewGoalForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-gray-50 min-h-screen ${isMobile ? 'pb-safe-bottom' : 'p-3 sm:p-4 md:p-6 lg:p-8'}`}>
      {/* Mobile Header */}
      {isMobile && renderMobileHeader()}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 mb-2">
                {activeView === 'dashboard' && 'Goals & Achievements'}
                {activeView === 'family' && 'Family Goals'}
                {activeView === 'individual' && 'Individual Goals'}
                {activeView === 'achievements' && 'Achievements & Badges'}
                {activeView === 'analytics' && 'Goal Analytics'}
              </h1>
              <p className="text-gray-600">
                {activeView === 'dashboard' && 'Track your family\'s goals and celebrate achievements'}
                {activeView === 'family' && 'Collaborate on family goals and challenges'}
                {activeView === 'individual' && 'Personal goals and individual progress'}
                {activeView === 'achievements' && 'View earned badges and celebrate success'}
                {activeView === 'analytics' && 'Analyze goal patterns and performance'}
              </p>
            </div>

            {activeView !== 'dashboard' && (
              <button
                onClick={() => setActiveView('dashboard')}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tabs - Desktop Only */}
      {!isMobile && activeView === 'dashboard' && (
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('family')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Family Goals</span>
            </button>
            <button
              onClick={() => setActiveView('individual')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Individual</span>
            </button>
            <button
              onClick={() => setActiveView('achievements')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>Achievements</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={isMobile ? 'px-4' : ''}>
        {activeView === 'dashboard' && renderDashboard()}
        {(activeView === 'family' || activeView === 'individual') && renderGoalsList()}
        {activeView === 'achievements' && <AchievementTracker achievements={achievements} familyMembers={familyMembers} />}
        {activeView === 'analytics' && <GoalAnalytics goals={goals} achievements={achievements} />}
      </div>

      {/* Mobile Menu Overlay */}
      {renderMobileMenu()}

      {/* New Goal Form Modal */}
      {showNewGoalForm && (
        <GoalForm
          onClose={() => setShowNewGoalForm(false)}
          onSave={async (goalData) => {
            try {
              const newGoal = {
                id: `goal-${Date.now()}`,
                ...goalData,
                createdAt: new Date().toISOString(),
                currentProgress: 0,
              };

              console.log('Saving new goal:', newGoal);
              const savedGoal = await databaseService.saveGoal(newGoal);

              if (savedGoal) {
                console.log('Goal saved successfully:', savedGoal);
                // You would typically update local state here
                // setGoals(prev => [...prev, savedGoal]);
              }
            } catch (error) {
              console.error('Failed to save goal:', error);
            }
            setShowNewGoalForm(false);
          }}
          familyMembers={familyMembers}
          categories={goalCategories}
        />
      )}
    </div>
  );
};

export default GoalsDashboard;