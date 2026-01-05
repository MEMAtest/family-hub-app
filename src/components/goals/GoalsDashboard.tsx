'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useFamilyStore, GoalsData } from '@/store/familyStore';
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
  ChevronDown,
  ChevronRight,
  Home,
  RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';
import GoalForm from './GoalForm';
import AchievementTracker from './AchievementTracker';
import GoalAnalytics from './GoalAnalytics';
import databaseService from '@/services/databaseService';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { AIGoalCoachPlan, AIGoalProgressSummary } from '@/types/goals.types';

interface GoalsDashboardProps {
  onClose?: () => void;
}

const toUiGoal = (goal: any) => ({
  id: goal.id,
  title: goal.goalTitle ?? goal.title ?? 'Goal',
  description: goal.goalDescription ?? goal.description ?? '',
  category: goal.category ?? 'personal',
  type: goal.goalType ?? goal.type ?? 'family',
  participants: goal.participants || [],
  priority: goal.priority ?? 'medium',
  status: goal.status ?? 'active',
  progress: goal.currentProgress ?? goal.progress ?? 0,
  target: { type: 'numeric', value: goal.targetValue ?? goal.target?.value ?? '' },
  current: { value: goal.currentProgress ?? goal.progress ?? 0, lastUpdated: new Date(goal.updatedAt ?? goal.createdAt ?? Date.now()) },
  startDate: goal.createdAt ? new Date(goal.createdAt) : new Date(),
  targetDate: goal.deadline ? new Date(goal.deadline) : (goal.targetDate ? new Date(goal.targetDate) : null),
  milestones: goal.milestones || [],
  tags: goal.tags || [],
  createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date(),
});

const normaliseGoalForStore = (goal: any) => {
  const createdAt = goal?.createdAt ? new Date(goal.createdAt).toISOString() : new Date().toISOString();
  const deadline = goal?.deadline ?? goal?.targetDate ?? null;
  const progress = Number(goal?.currentProgress ?? goal?.progress ?? 0);

  return {
    id: goal?.id ?? `goal-${Math.random().toString(36).slice(2, 8)}`,
    title: goal?.goalTitle ?? goal?.title ?? 'Goal',
    description: goal?.goalDescription ?? goal?.description ?? '',
    type: goal?.goalType ?? goal?.type ?? 'family',
    participants: Array.isArray(goal?.participants) ? goal.participants : [],
    progress,
    currentProgress: progress,
    targetValue: goal?.targetValue ?? goal?.target?.value ?? '',
    deadline,
    createdAt,
    updatedAt: goal?.updatedAt ? new Date(goal.updatedAt).toISOString() : createdAt,
  };
};

const buildGoalsData = (goals: any[]): GoalsData => {
  const familyGoals: any[] = [];
  const individualGoals: any[] = [];

  goals.forEach((goal) => {
    const record = normaliseGoalForStore(goal);
    const type = String(record.type ?? '').toLowerCase();
    if (type === 'individual' || type === 'personal') {
      individualGoals.push(record);
    } else {
      familyGoals.push(record);
    }
  });

  return {
    familyGoals,
    individualGoals,
    achievements: [],
    rewardSystem: {
      points: {},
      badges: {},
    },
  };
};

const GoalsDashboard: React.FC<GoalsDashboardProps> = ({ onClose }) => {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [activeView, setActiveView] = useState<'dashboard' | 'family' | 'individual' | 'achievements' | 'analytics'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [filterType, setFilterType] = useState<'all' | 'family' | 'individual'>('all');
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [editingGoal, setEditingGoal] = useState<any | null>(null);

  // Mobile states
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [goalCoachPlan, setGoalCoachPlan] = useState<AIGoalCoachPlan | null>(null);
  const [isGeneratingCoach, setIsGeneratingCoach] = useState(false);
  const [goalCoachError, setGoalCoachError] = useState<string | null>(null);
  const [goalSummary, setGoalSummary] = useState<AIGoalProgressSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [goalSummaryError, setGoalSummaryError] = useState<string | null>(null);

  // Get family members from store
  const familyMembers = useFamilyStore((state) => state.people);

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

  const [goals, setGoals] = useState<any[]>([]);

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get familyId from store
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId) || 'cmg741w2h0000ljcb3f6fo19g';
  const goalsData = useFamilyStore((state) => state.goalsData);
  const setGoalsData = useFamilyStore((state) => state.setGoalsData);

  const persistGoalsData = useCallback((data: GoalsData) => {
    setGoalsData(data);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('goalsData', JSON.stringify(data));
      const flattened = [...(data.familyGoals || []), ...(data.individualGoals || [])];
      localStorage.setItem('familyGoals', JSON.stringify(flattened));
    } catch (error) {
      console.warn('Failed to persist goals cache', error);
    }
  }, [setGoalsData]);

  const upsertGoalInStore = useCallback((goal: any) => {
    const current = useFamilyStore.getState().goalsData;
    const existingGoals = current ? [...(current.familyGoals || []), ...(current.individualGoals || [])] : [];
    const nextGoals = [...existingGoals.filter((g) => g.id !== goal.id), normaliseGoalForStore(goal)];
    const nextData = buildGoalsData(nextGoals);
    nextData.achievements = current?.achievements ?? [];
    nextData.rewardSystem = current?.rewardSystem ?? { points: {}, badges: {} };
    persistGoalsData(nextData);
  }, [persistGoalsData]);

  const handleGenerateGoalCoach = async () => {
    if (!familyId) {
      alert('Family ID not available yet. Please try again.');
      return;
    }

    setIsGeneratingCoach(true);
    setGoalCoachError(null);

    try {
      const response = await fetch(`/api/families/${familyId}/goals/ai-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'AI service returned an error');
      }

      setGoalCoachPlan(payload.plan);
    } catch (err) {
      console.error('Failed to generate goal coaching plan', err);
      setGoalCoachError(err instanceof Error ? err.message : 'Failed to generate coaching plan');
    } finally {
      setIsGeneratingCoach(false);
    }
  };

  const handleGenerateGoalSummary = async () => {
    if (!familyId) {
      alert('Family ID not available yet. Please try again.');
      return;
    }

    setIsGeneratingSummary(true);
    setGoalSummaryError(null);
    setGoalSummary(null);

    try {
      const response = await fetch(`/api/families/${familyId}/goals/ai-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'AI service returned an error');
      }

      setGoalSummary(payload.summary);
    } catch (err) {
      console.error('Failed to generate goal progress summary', err);
      setGoalSummaryError(err instanceof Error ? err.message : 'Failed to summarise progress');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (!goalsData) return;
    const merged = [...(goalsData.familyGoals || []), ...(goalsData.individualGoals || [])];
    if (!merged.length) return;
    setGoals(merged.map(toUiGoal));
  }, [goalsData]);

  // Fetch goals from API
  useEffect(() => {
    const fetchGoals = async () => {
      if (!familyId) {
        setError('No family ID available');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/families/${familyId}/goals`);

        if (!response.ok) {
          throw new Error('Failed to fetch goals');
        }

        const data = await response.json();

        // Transform API data to match component's expected format
        const transformedGoals = data.map(toUiGoal);

        setGoals(transformedGoals);
        const currentGoalsData = useFamilyStore.getState().goalsData;
        const nextGoalsData = buildGoalsData(data);
        nextGoalsData.achievements = currentGoalsData?.achievements ?? [];
        nextGoalsData.rewardSystem = currentGoalsData?.rewardSystem ?? { points: {}, badges: {} };
        persistGoalsData(nextGoalsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching goals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load goals');
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [familyId, persistGoalsData]);

  // Update goal function
  const updateGoal = async (goalId: string, updates: any) => {
    if (!familyId) {
      alert('No family ID available');
      return;
    }

    try {
      const response = await fetch(`/api/families/${familyId}/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      const updatedGoal = await response.json();

      // Transform and update local state
      const transformedGoal = toUiGoal(updatedGoal);

      setGoals(prev => prev.map(g => g.id === goalId ? transformedGoal : g));
      upsertGoalInStore(updatedGoal);
      console.log('Goal updated successfully:', transformedGoal);
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert('Failed to update goal. Please try again.');
    }
  };

  // Mobile Header Component
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="mobile-title dark:text-slate-100">Goals</h1>
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
      <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
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
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Filters Dropdown */}
      {showMobileFilters && (
        <div className="absolute left-4 right-4 top-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 p-4 space-y-3">
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
        <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 pwa-safe-top">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Goals Menu</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 dark:text-slate-300" />
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

            <button
              onClick={() => {
                if (!isGeneratingCoach) {
                  handleGenerateGoalCoach();
                }
                setShowMobileMenu(false);
              }}
              className="mobile-btn-secondary w-full flex items-center gap-3"
              disabled={isGeneratingCoach}
            >
              <Target className="w-5 h-5" />
              {isGeneratingCoach ? 'Generating Coach...' : 'AI Goal Coach'}
            </button>

            <button
              onClick={() => {
                if (!isGeneratingSummary) {
                  handleGenerateGoalSummary();
                }
                setShowMobileMenu(false);
              }}
              className="mobile-btn-secondary w-full flex items-center gap-3"
              disabled={isGeneratingSummary}
            >
              <BarChart3 className="w-5 h-5" />
              {isGeneratingSummary ? 'Summarising…' : 'Progress Summary'}
            </button>

            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">View Options</h3>
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
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
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
        <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 dark:text-slate-400 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Active Goals</p>
              <p className={`font-bold text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>{activeGoals}</p>
            </div>
            <Target className={`text-blue-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          <div className="mt-2">
            <span className={`text-gray-500 dark:text-slate-500 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {totalGoals} total goals
            </span>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 dark:text-slate-400 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Avg Progress</p>
              <p className={`font-bold text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>{averageProgress.toFixed(0)}%</p>
            </div>
            <TrendingUp className={`text-green-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          <div className="mt-2">
            <div className={`w-full bg-gray-200 dark:bg-slate-700 rounded-full ${
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

        <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 dark:text-slate-400 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Achievements</p>
              <p className={`font-bold text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl'
              }`}>{totalAchievements}</p>
            </div>
            <Trophy className={`text-yellow-500 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
          <div className="mt-2">
            <span className={`text-gray-500 dark:text-slate-500 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {achievements.filter(a => new Date(a.earnedDate).getMonth() === new Date().getMonth()).length} this month
            </span>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-gray-600 dark:text-slate-400 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Total Points</p>
              <p className={`font-bold text-gray-900 dark:text-slate-100 ${
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
      <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <h2 className={`font-semibold text-gray-900 dark:text-slate-100 mb-4 ${
          isMobile ? 'text-lg' : 'text-xl'
        }`}>Quick Actions</h2>
        <div className={`grid gap-4 ${
          isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          <button
            onClick={() => setShowNewGoalForm(true)}
            className={`flex items-center border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            }`}
          >
            <Plus className={`text-green-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-sm' : ''
              }`}>New Goal</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600 dark:text-slate-400">Create a new goal</p>
              )}
            </div>
          </button>

          <button
            onClick={handleGenerateGoalCoach}
            disabled={isGeneratingCoach}
            className={`flex items-center border border-gray-200 dark:border-slate-700 rounded-lg transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            } ${isGeneratingCoach ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <Zap className={`text-purple-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-sm' : ''
              }`}>{isGeneratingCoach ? 'Generating…' : 'AI Goal Coach'}</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600">Personalised weekly focus</p>
              )}
            </div>
          </button>

          <button
            onClick={handleGenerateGoalSummary}
            disabled={isGeneratingSummary}
            className={`flex items-center border border-gray-200 dark:border-slate-700 rounded-lg transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            } ${isGeneratingSummary ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
          >
            <BarChart3 className={`text-blue-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-sm' : ''
              }`}>{isGeneratingSummary ? 'Summarising…' : 'Progress Summary'}</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600 dark:text-slate-400">Snapshot of progress & risks</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveView('achievements')}
            className={`flex items-center border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            }`}
          >
            <Award className={`text-yellow-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-sm' : ''
              }`}>Achievements</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600 dark:text-slate-400">View all badges</p>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
              isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
            }`}
          >
            <BarChart3 className={`text-blue-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-sm' : ''
              }`}>Analytics</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600 dark:text-slate-400">View progress data</p>
              )}
            </div>
          </button>

          <button className={`flex items-center border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
            isMobile ? 'flex-col space-y-2 p-3 text-center' : 'space-x-3 p-4'
          }`}>
            <Users className={`text-purple-500 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
            <div className={isMobile ? '' : 'text-left'}>
              <h3 className={`font-medium text-gray-900 dark:text-slate-100 ${
                isMobile ? 'text-sm' : ''
              }`}>Team Challenge</h3>
              {!isMobile && (
                <p className="text-sm text-gray-600 dark:text-slate-400">Start a challenge</p>
              )}
            </div>
          </button>
      </div>
    </div>

      {/* AI Goal Coach */}
      <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`font-semibold text-gray-900 dark:text-slate-100 ${
              isMobile ? 'text-lg' : 'text-xl'
            }`}>AI Goal Coach</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Celebrate wins, focus efforts, and get weekly action ideas
            </p>
          </div>
          <button
            onClick={handleGenerateGoalCoach}
            disabled={isGeneratingCoach}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              isGeneratingCoach ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGeneratingCoach ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Working…
              </>
            ) : (
              <>
                <Target className="w-4 h-4" /> Refresh Insights
              </>
            )}
          </button>
        </div>

        {goalCoachError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Unable to generate coaching plan: {goalCoachError}
          </div>
        )}

        {goalCoachPlan ? (
          <div className="space-y-4 text-sm text-gray-700">
            <p>{goalCoachPlan.summary}</p>

            {goalCoachPlan.celebration && goalCoachPlan.celebration.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Celebrations</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {goalCoachPlan.celebration.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {goalCoachPlan.focusGoal && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold mb-1">Primary focus</p>
                <p className="font-medium text-blue-900">{goalCoachPlan.focusGoal.title}</p>
                <p className="text-xs text-blue-700 mt-1">Progress {goalCoachPlan.focusGoal.progress}%</p>
                <p className="mt-2 text-sm text-blue-900">Next step: {goalCoachPlan.focusGoal.nextStep}</p>
                {goalCoachPlan.focusGoal.encouragement && (
                  <p className="mt-1 text-xs text-blue-700">{goalCoachPlan.focusGoal.encouragement}</p>
                )}
              </div>
            )}

            {goalCoachPlan.weeklyActions && goalCoachPlan.weeklyActions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">This week&apos;s actions</h3>
                <ul className="space-y-2">
                  {goalCoachPlan.weeklyActions.map((action, index) => (
                    <li key={index} className="border border-gray-200 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{action.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {action.owner ? `Owner: ${action.owner}` : 'Owner: Family'}
                        {action.dueDate ? ` • Due ${action.dueDate}` : ''}
                      </p>
                      {action.motivation && (
                        <p className="text-xs text-purple-600 mt-1">{action.motivation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {goalCoachPlan.blockers && goalCoachPlan.blockers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Potential blockers</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  {goalCoachPlan.blockers.map((blocker, index) => (
                    <li key={index}>{blocker}</li>
                  ))}
                </ul>
              </div>
            )}

            {goalCoachPlan.checkInQuestions && goalCoachPlan.checkInQuestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Check-in questions</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  {goalCoachPlan.checkInQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </div>
            )}

            {goalCoachPlan.encouragement && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {goalCoachPlan.encouragement}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Tap “Refresh Insights” to get a personalised focus goal, weekly actions, and motivational check-in prompts for the family.
          </div>
        )}
      </div>

      <div className={`grid gap-8 ${
        isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
      }`}>
        {/* Active Goals Progress */}
        <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
          isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold text-gray-900 dark:text-slate-100 ${
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

        {/* Active Goals Overview */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Active Goals</h2>
            <button
              onClick={() => setActiveView('family')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-3">No goals yet</p>
              <button
                onClick={() => setShowNewGoalForm(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Create your first goal →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 3).map((goal) => {
                const category = goalCategories.find(c => c.id === goal.category);
                return (
                  <div key={goal.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span>{category?.icon || '🎯'}</span>
                        <h3 className="font-medium text-gray-900">{goal.title}</h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(goal.status)}`}>
                        {goal.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${goal.progress}%`,
                              backgroundColor: getProgressColor(goal.progress)
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {goal.participants?.slice(0, 3).map((participantId: string) => {
                          const person = familyMembers.find(p => p.id === participantId);
                          return person ? (
                            <div
                              key={participantId}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: person.color }}
                              title={person.name}
                            >
                              {person.icon}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Goals by Category */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Goals by Category</h2>

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
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Weekly Activity</h2>

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
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Recent Achievements</h2>
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
                    {person?.icon}
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
          const completedMilestones = goal.milestones.filter((m: any) => m.isCompleted).length;

          return (
            <div key={goal.id} className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow ${
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
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGoal(goal);
                    }}
                  >
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
                  {goal.milestones.map((milestone: any, index: number) => (
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
                  {goal.participants.slice(0, 3).map((participantId: string) => {
                    const person = familyMembers.find(p => p.id === participantId);
                    return (
                      <div
                        key={participantId}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold"
                        style={{ backgroundColor: person?.color }}
                        title={person?.name}
                      >
                        {person?.icon}
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
                  {goal.tags.slice(0, 3).map((tag: string) => (
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
    <div className={`bg-gray-50 dark:bg-slate-950 min-h-screen ${isMobile ? 'pb-safe-bottom' : 'p-3 sm:p-4 md:p-6 lg:p-8'}`}>
      {/* Mobile Header */}
      {isMobile && renderMobileHeader()}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="mb-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm mb-4">
            <button
              onClick={() => onClose && onClose()}
              className="flex items-center text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            >
              <Home className="w-4 h-4 mr-1" />
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <span className="text-gray-900 dark:text-slate-100 font-medium">
              {activeView === 'dashboard' && 'Goals'}
              {activeView === 'family' && 'Family Goals'}
              {activeView === 'individual' && 'Individual Goals'}
              {activeView === 'achievements' && 'Achievements'}
              {activeView === 'analytics' && 'Analytics'}
            </span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 dark:text-slate-100 mb-2">
                {activeView === 'dashboard' && 'Goals & Achievements'}
                {activeView === 'family' && 'Family Goals'}
                {activeView === 'individual' && 'Individual Goals'}
                {activeView === 'achievements' && 'Achievements & Badges'}
                {activeView === 'analytics' && 'Goal Analytics'}
              </h1>
              <p className="text-gray-600 dark:text-slate-400">
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
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Goal Progress Summary */}
      {activeView === 'dashboard' && (
      <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg ${
        isMobile ? 'p-3' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`font-semibold text-gray-900 dark:text-slate-100 ${
              isMobile ? 'text-lg' : 'text-xl'
            }`}>Goal Progress Summary</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Understand overall momentum, risks, and suggested focus areas
            </p>
          </div>
          <button
            onClick={handleGenerateGoalSummary}
            disabled={isGeneratingSummary}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              isGeneratingSummary ? 'bg-blue-200 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGeneratingSummary ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Summarising…
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" /> Refresh summary
              </>
            )}
          </button>
        </div>

        {goalSummaryError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Unable to summarise progress: {goalSummaryError}
          </div>
        )}

        {goalSummary ? (
          <div className="space-y-4 text-sm text-gray-700">
            <p>{goalSummary.summary}</p>

            {goalSummary.metrics && goalSummary.metrics.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {goalSummary.metrics.map((metric, index) => (
                  <div key={`${metric.label}-${index}`} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">{metric.label}</p>
                    <p className="text-lg font-semibold text-blue-900">{metric.value}</p>
                    {metric.context && <p className="text-xs text-blue-700 mt-1">{metric.context}</p>}
                  </div>
                ))}
              </div>
            )}

            {goalSummary.goalBreakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Goal breakdown</h3>
                <div className="space-y-2">
                  {goalSummary.goalBreakdown.map((goal, index) => (
                    <div key={`${goal.title}-${index}`} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{goal.title}</p>
                        <span
                          className={`text-xs uppercase tracking-wide ${
                            goal.status === 'at_risk'
                              ? 'text-red-600'
                              : goal.status === 'behind'
                                ? 'text-orange-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          {goal.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Progress {goal.progress}%</p>
                      {goal.highlight && <p className="text-sm text-gray-700 mt-2">{goal.highlight}</p>}
                      {goal.nextStep && <p className="text-xs text-blue-600 mt-1">Next step: {goal.nextStep}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(goalSummary.momentum?.improving?.length || goalSummary.momentum?.slipping?.length) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {goalSummary.momentum?.improving?.length ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Improving streaks</p>
                    <ul className="list-disc pl-5 text-xs text-emerald-700 space-y-1 mt-1">
                      {goalSummary.momentum.improving.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {goalSummary.momentum?.slipping?.length ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-yellow-600 font-semibold">Needs attention</p>
                    <ul className="list-disc pl-5 text-xs text-yellow-700 space-y-1 mt-1">
                      {goalSummary.momentum.slipping.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {goalSummary.riskyGoals && goalSummary.riskyGoals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Goals at risk</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {goalSummary.riskyGoals.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {goalSummary.recommendations && goalSummary.recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Recommendations</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {goalSummary.recommendations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Generate a summary to see overall momentum, risks, and tailored suggestions for your current goals.
          </div>
        )}
      </div>
      )}

      {/* Navigation Tabs - Desktop Only */}
      {!isMobile && activeView === 'dashboard' && (
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('family')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Family Goals</span>
            </button>
            <button
              onClick={() => setActiveView('individual')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Individual</span>
            </button>
            <button
              onClick={() => setActiveView('achievements')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>Achievements</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
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
            if (!familyId) {
              alert('No family ID available');
              setShowNewGoalForm(false);
              return;
            }

            try {
              const response = await fetch(`/api/families/${familyId}/goals`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title: goalData.title,
                  description: goalData.description,
                  type: goalData.type,
                  targetValue: goalData.targetValue?.toString() || '',
                  currentProgress: 0,
                  deadline: goalData.targetDate ? new Date(goalData.targetDate).toISOString() : null,
                  participants: goalData.participants || [],
                  milestones: []
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to create goal');
              }

              const savedGoal = await response.json();

              // Transform and add to local state
              const transformedGoal = toUiGoal(savedGoal);

              setGoals(prev => [transformedGoal, ...prev]);
              upsertGoalInStore(savedGoal);
              console.log('Goal created successfully:', transformedGoal);
            } catch (error) {
              console.error('Failed to save goal:', error);
              alert('Failed to create goal. Please try again.');
            }
            setShowNewGoalForm(false);
          }}
          familyMembers={familyMembers}
          categories={goalCategories}
        />
      )}

      {/* Edit Goal Form Modal */}
      {editingGoal && (
        <GoalForm
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={async (goalData) => {
            if (!familyId || !editingGoal) {
              alert('No family ID or goal available');
              setEditingGoal(null);
              return;
            }

            try {
              await updateGoal(editingGoal.id, {
                title: goalData.title,
                description: goalData.description,
                type: goalData.type,
                targetValue: goalData.targetValue?.toString() || '',
                currentProgress: editingGoal.progress,
                deadline: goalData.targetDate ? new Date(goalData.targetDate).toISOString() : null,
                participants: goalData.participants || [],
                milestones: editingGoal.milestones || []
              });
            } catch (error) {
              console.error('Failed to update goal:', error);
            }
            setEditingGoal(null);
          }}
          familyMembers={familyMembers}
          categories={goalCategories}
        />
      )}
    </div>
  );
};

export default GoalsDashboard;
