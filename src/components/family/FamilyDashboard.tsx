'use client'

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Settings,
  UserPlus,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  Crown,
  Shield,
  Clock,
  Star,
  Heart,
  Award,
  Camera,
  FileText,
  MessageCircle,
  Bell,
  Activity,
  TrendingUp,
  BarChart3,
  Eye,
  Share,
  Download,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FamilyMemberForm } from './FamilyMemberForm';
import { FamilySettings } from './FamilySettings';
import { FamilyTimeline } from './FamilyTimeline';
import Breadcrumb from '../common/Breadcrumb';

interface FamilyDashboardProps {
  onClose?: () => void;
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ onClose }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'members' | 'settings' | 'timeline' | 'analytics'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);

  // Mock family data
  const familyInfo = {
    id: 'fam1',
    name: 'The Omosanya Family',
    description: 'A loving family focused on growth, health, and togetherness',
    type: 'nuclear' as const,
    address: {
      street: '123 Tremaine Road',
      city: 'London',
      state: 'Greater London',
      postalCode: 'SE20 7UA',
      country: 'United Kingdom',
      type: 'home' as const,
      isPrimary: true
    },
    timezone: 'Europe/London',
    language: 'en-GB',
    currency: 'GBP',
    createdAt: new Date('2023-01-15')
  };

  const familyMembers = [
    {
      id: 'ade',
      firstName: 'Ade',
      lastName: 'Omosanya',
      displayName: 'Ade',
      dateOfBirth: new Date('1985-03-15'),
      age: 39,
      gender: 'male' as const,
      relationship: { type: 'parent' as const, isPrimary: true, isLegal: true },
      role: { name: 'Admin', level: 'admin' as const, canManageFamily: true },
      status: 'active' as const,
      avatar: '🏃',
      color: '#3B82F6',
      email: 'ade@omosanya.family',
      phone: '+44 7700 900123',
      lastActiveAt: new Date(),
      preferences: {
        notifications: { email: true, push: true, frequency: 'real_time' as const },
        privacy: { profileVisibility: 'family' as const, activityVisibility: 'family' as const },
        theme: { mode: 'light' as const, primaryColor: '#3B82F6' }
      },
      statistics: {
        loginCount: 245,
        goalsCompleted: 8,
        eventsCreated: 32,
        photosUploaded: 127,
        achievementPoints: 850
      },
      tags: ['fitness', 'technology', 'running'],
      createdAt: new Date('2023-01-15')
    },
    {
      id: 'angela',
      firstName: 'Angela',
      lastName: 'Omosanya',
      displayName: 'Angela',
      dateOfBirth: new Date('1987-07-22'),
      age: 37,
      gender: 'female' as const,
      relationship: { type: 'parent' as const, isPrimary: true, isLegal: true },
      role: { name: 'Admin', level: 'admin' as const, canManageFamily: true },
      status: 'active' as const,
      avatar: '💼',
      color: '#EC4899',
      email: 'angela@omosanya.family',
      phone: '+44 7700 900124',
      lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      preferences: {
        notifications: { email: true, push: false, frequency: 'daily' as const },
        privacy: { profileVisibility: 'family' as const, activityVisibility: 'family' as const },
        theme: { mode: 'light' as const, primaryColor: '#EC4899' }
      },
      statistics: {
        loginCount: 189,
        goalsCompleted: 6,
        eventsCreated: 28,
        photosUploaded: 98,
        achievementPoints: 720
      },
      tags: ['business', 'organization', 'wellness'],
      createdAt: new Date('2023-01-15')
    },
    {
      id: 'askia',
      firstName: 'Askia',
      lastName: 'Omosanya',
      displayName: 'Askia',
      nickname: 'Little Explorer',
      dateOfBirth: new Date('2020-11-08'),
      age: 3,
      gender: 'male' as const,
      relationship: { type: 'child' as const, relationTo: 'ade', isPrimary: false, isLegal: true },
      role: { name: 'Child', level: 'child' as const, canManageFamily: false },
      status: 'active' as const,
      avatar: '🎓',
      color: '#10B981',
      preferences: {
        notifications: { email: false, push: false, frequency: 'weekly' as const },
        privacy: { profileVisibility: 'family' as const, activityVisibility: 'parents_only' as const },
        theme: { mode: 'light' as const, primaryColor: '#10B981' }
      },
      statistics: {
        loginCount: 12,
        goalsCompleted: 3,
        eventsCreated: 2,
        photosUploaded: 45,
        achievementPoints: 900
      },
      tags: ['preschool', 'creative', 'swimming'],
      createdAt: new Date('2023-01-15')
    },
    {
      id: 'amari',
      firstName: 'Amari',
      lastName: 'Omosanya',
      displayName: 'Amari',
      nickname: 'Football Star',
      dateOfBirth: new Date('2015-05-12'),
      age: 9,
      gender: 'male' as const,
      relationship: { type: 'child' as const, relationTo: 'ade', isPrimary: false, isLegal: true },
      role: { name: 'Child', level: 'child' as const, canManageFamily: false },
      status: 'active' as const,
      avatar: '⚽',
      color: '#F59E0B',
      email: 'amari@omosanya.family',
      preferences: {
        notifications: { email: false, push: true, frequency: 'daily' as const },
        privacy: { profileVisibility: 'family' as const, activityVisibility: 'family' as const },
        theme: { mode: 'light' as const, primaryColor: '#F59E0B' }
      },
      statistics: {
        loginCount: 78,
        goalsCompleted: 5,
        eventsCreated: 8,
        photosUploaded: 67,
        achievementPoints: 1200
      },
      tags: ['football', 'school', 'german', 'drama'],
      createdAt: new Date('2023-01-15')
    }
  ];

  const familyRoles = [
    { id: 'admin', name: 'Admin', level: 'admin', permissions: ['all'], color: '#DC2626' },
    { id: 'parent', name: 'Parent', level: 'parent', permissions: ['manage_family', 'view_all'], color: '#059669' },
    { id: 'teen', name: 'Teen', level: 'teen', permissions: ['limited'], color: '#7C3AED' },
    { id: 'child', name: 'Child', level: 'child', permissions: ['basic'], color: '#2563EB' },
    { id: 'guest', name: 'Guest', level: 'guest', permissions: ['view_only'], color: '#6B7280' }
  ];

  const familyStatistics = {
    totalMembers: familyMembers.length,
    activeMembers: familyMembers.filter(m => m.status === 'active').length,
    averageAge: familyMembers.reduce((sum, m) => sum + m.age, 0) / familyMembers.length,
    membershipDuration: Math.floor((new Date().getTime() - new Date('2023-01-15').getTime()) / (1000 * 60 * 60 * 24)),
    totalPhotos: familyMembers.reduce((sum, m) => sum + (m.statistics?.photosUploaded || 0), 0),
    totalEvents: familyMembers.reduce((sum, m) => sum + (m.statistics?.eventsCreated || 0), 0),
    totalGoals: familyMembers.reduce((sum, m) => sum + (m.statistics?.goalsCompleted || 0), 0),
    totalPoints: familyMembers.reduce((sum, m) => sum + (m.statistics?.achievementPoints || 0), 0)
  };

  const recentActivity = [
    {
      id: '1',
      type: 'member_updated',
      memberId: 'ade',
      message: 'Ade updated their fitness goals',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      icon: '🎯'
    },
    {
      id: '2',
      type: 'photo_uploaded',
      memberId: 'angela',
      message: 'Angela uploaded 5 new family photos',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: '📷'
    },
    {
      id: '3',
      type: 'milestone_reached',
      memberId: 'amari',
      message: 'Amari completed their German homework streak!',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      icon: '🏆'
    },
    {
      id: '4',
      type: 'achievement_earned',
      memberId: 'askia',
      message: 'Askia earned the "Swimming Progress" badge',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      icon: '🏊'
    }
  ];

  const upcomingBirthdays = [
    {
      memberId: 'askia',
      name: 'Askia',
      date: new Date('2024-11-08'),
      age: 4,
      daysUntil: 48
    }
  ];

  const engagementData = [
    { name: 'Mon', logins: 8, events: 3, photos: 5 },
    { name: 'Tue', logins: 12, events: 7, photos: 8 },
    { name: 'Wed', logins: 6, events: 2, photos: 3 },
    { name: 'Thu', logins: 15, events: 5, photos: 12 },
    { name: 'Fri', logins: 18, events: 8, photos: 15 },
    { name: 'Sat', logins: 22, events: 12, photos: 20 },
    { name: 'Sun', logins: 16, events: 6, photos: 10 }
  ];

  const memberActivityData = familyMembers.map(member => ({
    name: member.firstName,
    points: member.statistics?.achievementPoints || 0,
    goals: member.statistics?.goalsCompleted || 0,
    events: member.statistics?.eventsCreated || 0,
    color: member.color
  }));

  const filteredMembers = familyMembers.filter(member => {
    const matchesSearch = member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role.level === filterRole;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'away': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (level: string) => {
    const role = familyRoles.find(r => r.level === level);
    return role?.color || '#6B7280';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Generate family breadcrumb items
  const getFamilyBreadcrumbItems = () => {
    const items = [
      { label: 'Family', onClick: () => setActiveView('dashboard') }
    ];

    if (activeView !== 'dashboard') {
      const viewNames = {
        'members': 'Members',
        'settings': 'Settings',
        'timeline': 'Timeline',
        'analytics': 'Analytics'
      };

      items.push({
        label: viewNames[activeView] || activeView,
        onClick: () => {}
      });
    }

    return items;
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Family Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{familyInfo.name}</h2>
            <p className="text-gray-600">{familyInfo.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{familyInfo.address.city}, {familyInfo.address.country}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>Family since {familyInfo.createdAt.getFullYear()}</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveView('settings')}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Family Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">{familyStatistics.totalMembers}</p>
            <p className="text-sm text-blue-600">Family Members</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Star className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-800">{familyStatistics.totalPoints.toLocaleString()}</p>
            <p className="text-sm text-green-600">Total Points</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Camera className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-800">{familyStatistics.totalPhotos}</p>
            <p className="text-sm text-purple-600">Photos Shared</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Calendar className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-800">{familyStatistics.totalEvents}</p>
            <p className="text-sm text-orange-600">Events Created</p>
          </div>
        </div>
      </div>

      {/* Family Members Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Family Members</h2>
          <button
            onClick={() => setActiveView('members')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage All →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {familyMembers.map(member => (
            <div key={member.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{member.displayName}</h3>
                  <p className="text-sm text-gray-600">{member.relationship.type}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(member.status)}`}>
                  {member.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-medium">{member.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span
                    className="font-medium text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: getRoleColor(member.role.level) + '20', color: getRoleColor(member.role.level) }}
                  >
                    {member.role.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Points:</span>
                  <span className="font-medium text-yellow-600">{member.statistics?.achievementPoints || 0}</span>
                </div>
                {member.lastActiveAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Active:</span>
                    <span className="font-medium">{formatTimeAgo(member.lastActiveAt)}</span>
                  </div>
                )}
              </div>

              {member.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {member.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {member.tags.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{member.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            <button
              onClick={() => setActiveView('timeline')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Timeline →
            </button>
          </div>

          <div className="space-y-4">
            {recentActivity.map(activity => {
              const member = familyMembers.find(m => m.id === activity.memberId);
              return (
                <div key={activity.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                  <div className="text-2xl">{activity.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                  {member && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.avatar}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Family Insights */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Family Insights</h2>
            <button
              onClick={() => setActiveView('analytics')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Analytics →
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-blue-800">High Engagement</span>
              </div>
              <p className="text-sm text-blue-700">Family activity increased 23% this week</p>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Award className="w-4 h-4 text-green-500" />
                <span className="font-medium text-green-800">Achievement Streak</span>
              </div>
              <p className="text-sm text-green-700">Amari leads with 1,200 achievement points</p>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Heart className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-purple-800">Family Bonding</span>
              </div>
              <p className="text-sm text-purple-700">3 family events scheduled for next week</p>
            </div>
          </div>

          {upcomingBirthdays.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Upcoming Birthdays</h3>
              {upcomingBirthdays.map(birthday => {
                const member = familyMembers.find(m => m.id === birthday.memberId);
                return (
                  <div key={birthday.memberId} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {member && (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.avatar}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{birthday.name} turns {birthday.age}</p>
                        <p className="text-sm text-gray-600">{birthday.date.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-800">{birthday.daysUntil} days</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Engagement Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Family Engagement</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="logins" fill="#3B82F6" name="Logins" />
              <Bar dataKey="events" fill="#10B981" name="Events" />
              <Bar dataKey="photos" fill="#F59E0B" name="Photos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderMembersList = () => (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search family members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          {familyRoles.map(role => (
            <option key={role.id} value={role.level}>{role.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowNewMemberForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map(member => (
          <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{member.displayName}</h3>
                  {member.nickname && (
                    <p className="text-sm text-gray-600">"{member.nickname}"</p>
                  )}
                  <p className="text-sm text-gray-500">{member.relationship.type}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSelectedMember(member.id);
                    setShowMemberDetails(true);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedMember(member.id);
                    setShowNewMemberForm(true);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-red-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Age:</span>
                <span className="font-medium">{member.age} years old</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role:</span>
                <span
                  className="text-xs px-2 py-1 rounded font-medium"
                  style={{ backgroundColor: getRoleColor(member.role.level) + '20', color: getRoleColor(member.role.level) }}
                >
                  {member.role.name}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(member.status)}`}>
                  {member.status}
                </span>
              </div>

              {member.email && (
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">{member.email}</span>
                </div>
              )}

              {member.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">{member.phone}</span>
                </div>
              )}

              {member.lastActiveAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Active:</span>
                  <span className="text-sm font-medium">{formatTimeAgo(member.lastActiveAt)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Achievement Points:</span>
                <span className="font-medium text-yellow-600">{member.statistics?.achievementPoints || 0}</span>
              </div>
            </div>

            {member.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-1">
                  {member.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No family members found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterRole !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Add your first family member to get started'}
          </p>
          <button
            onClick={() => setShowNewMemberForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Family Member</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={getFamilyBreadcrumbItems()}
        onHomeClick={onClose || (() => {})}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              {activeView === 'dashboard' && 'Family Management'}
              {activeView === 'members' && 'Family Members'}
              {activeView === 'settings' && 'Family Settings'}
              {activeView === 'timeline' && 'Family Timeline'}
              {activeView === 'analytics' && 'Family Analytics'}
            </h1>
            <p className="text-gray-600">
              {activeView === 'dashboard' && 'Manage your family members and settings'}
              {activeView === 'members' && 'View and manage all family members'}
              {activeView === 'settings' && 'Configure family preferences and settings'}
              {activeView === 'timeline' && 'View family history and milestones'}
              {activeView === 'analytics' && 'Analyze family engagement and activity'}
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

      {/* Navigation Tabs */}
      {activeView === 'dashboard' && (
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('members')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Members</span>
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'members' && renderMembersList()}
      {activeView === 'settings' && (
        <FamilySettings
          settings={({
            general: {
              familyName: familyInfo.name,
              description: familyInfo.description,
              timezone: familyInfo.timezone,
              language: familyInfo.language,
              currency: familyInfo.currency,
              dateFormat: 'MM/DD/YYYY',
              timeFormat: '24h',
              firstDayOfWeek: 'monday',
              defaultReminders: true,
              autoArchive: false,
              dataRetention: 365
            },
            privacy: {
              profileVisibility: 'family_only',
              dataSharing: false,
              locationSharing: false,
              activitySharing: false,
              allowSearch: false,
              publicProfile: false,
              twoFactorAuth: false
            },
            security: {
              passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                expiryDays: 90
              },
              sessionTimeout: 60,
              loginAttempts: 5,
              twoFactorRequired: false,
              biometricAuth: false,
              trustedDevices: []
            },
            notifications: {
              email: true,
              push: true,
              sms: false,
              reminders: true,
              updates: true,
              events: true,
              budget: true,
              goals: true,
              shopping: true,
              meals: true,
              quietHours: {
                enabled: true,
                start: '22:00',
                end: '07:00'
              }
            },
            features: {
              calendar: true,
              budget: true,
              goals: true,
              shopping: true,
              meals: true,
              timeline: true,
              reports: true,
              integrations: false
            },
            integrations: {
              google: { enabled: false, settings: {} },
              apple: { enabled: false, settings: {} },
              microsoft: { enabled: false, settings: {} },
              amazon: { enabled: false, settings: {} }
            },
            backup: {
              autoBackup: true,
              frequency: 'weekly',
              retention: 30,
              includePhotos: true,
              encryption: true
            }
          }) as any}
          onUpdateSettings={(updates) => {
            console.log('Settings updated:', updates);
          }}
          familyMembers={familyMembers as any}
        />
      )}
      {activeView === 'timeline' && (
        <FamilyTimeline
          milestones={[]}
          familyMembers={familyMembers as any}
          onAddMilestone={(milestone) => console.log('Add milestone:', milestone)}
          onEditMilestone={(id, milestone) => console.log('Edit milestone:', id, milestone)}
          onDeleteMilestone={(id) => console.log('Delete milestone:', id)}
        />
      )}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Family Size</p>
                  <p className="text-3xl font-bold text-gray-900">{familyMembers.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Active members</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Age</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(familyMembers.reduce((sum, m) => sum + m.age, 0) / familyMembers.length)}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Years old</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Members</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {familyMembers.filter(m => (m as any).isActive !== false).length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Currently active</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {familyMembers.filter(m => m.role.level === 'admin').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Admin users</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Distribution Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { ageGroup: '0-10', count: familyMembers.filter(m => m.age <= 10).length },
                  { ageGroup: '11-20', count: familyMembers.filter(m => m.age > 10 && m.age <= 20).length },
                  { ageGroup: '21-40', count: familyMembers.filter(m => m.age > 20 && m.age <= 40).length },
                  { ageGroup: '41+', count: familyMembers.filter(m => m.age > 40).length }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Role Distribution Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'Admin',
                        value: familyMembers.filter(m => m.role.level === 'admin').length,
                        fill: '#EF4444'
                      },
                      {
                        name: 'Parent',
                        value: familyMembers.filter(m => m.role.level === 'parent').length,
                        fill: '#3B82F6'
                      },
                      {
                        name: 'Teen',
                        value: familyMembers.filter(m => m.role.level === 'teen').length,
                        fill: '#8B5CF6'
                      },
                      {
                        name: 'Child',
                        value: familyMembers.filter(m => m.role.level === 'child').length,
                        fill: '#10B981'
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  >
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {familyMembers.slice(0, 5).map((member, index) => (
                <div key={member.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                    <p className="text-sm text-gray-600">
                      {member.isActive ? 'Active now' : `Last seen ${Math.floor(Math.random() * 24)} hours ago`}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.role.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Family Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Insights</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    Family established {familyInfo.createdAt.getFullYear()}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    Located in {familyInfo.address.city}, {familyInfo.address.country}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    Average member age: {Math.round(familyMembers.reduce((sum, m) => sum + m.age, 0) / familyMembers.length)} years
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    {familyMembers.filter(m => m.gender === 'male').length} male, {familyMembers.filter(m => m.gender === 'female').length} female members
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveView('members')}
                  className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Users className="w-5 h-5 mx-auto mb-1" />
                  View Members
                </button>
                <button
                  onClick={() => setActiveView('timeline')}
                  className="p-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  <Calendar className="w-5 h-5 mx-auto mb-1" />
                  Timeline
                </button>
                <button
                  onClick={() => setActiveView('settings')}
                  className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  <Settings className="w-5 h-5 mx-auto mb-1" />
                  Settings
                </button>
                <button
                  onClick={() => setShowNewMemberForm(true)}
                  className="p-3 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" />
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Member Form Modal */}
      {showNewMemberForm && (
        <FamilyMemberForm
          member={selectedMember ? familyMembers.find(m => m.id === selectedMember) : undefined}
          onCancel={() => {
            setShowNewMemberForm(false);
            setSelectedMember(null);
          }}
          onSave={(memberData) => {
            console.log(selectedMember ? 'Edit member:' : 'New member:', memberData);
            setShowNewMemberForm(false);
            setSelectedMember(null);
          }}
          isEditing={!!selectedMember}
        />
      )}

      {/* Member Details Modal */}
      {showMemberDetails && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {(() => {
                const member = familyMembers.find(m => m.id === selectedMember);
                if (!member) return null;

                return (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Member Details</h2>
                      <button
                        onClick={() => {
                          setShowMemberDetails(false);
                          setSelectedMember(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Member Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {member.firstName} {member.lastName}
                            </h3>
                            <p className="text-gray-600">{member.displayName}</p>
                            <p className="text-sm text-gray-500">{member.role.name}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500">Age:</span>
                            <span className="text-sm text-gray-900">{member.age} years old</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500">Gender:</span>
                            <span className="text-sm text-gray-900 capitalize">{member.gender}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500">Status:</span>
                            <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(member.status)}`}>
                              {member.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500">Date of Birth:</span>
                            <span className="text-sm text-gray-900">
                              {member.dateOfBirth.toLocaleDateString()}
                            </span>
                          </div>
                          {member.email && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Email:</span>
                              <span className="text-sm text-gray-900">{member.email}</span>
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Phone:</span>
                              <span className="text-sm text-gray-900">{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Family Role & Permissions</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Level:</span>
                              <span className="text-sm text-gray-900 capitalize">{member.role.level}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Can Manage Family:</span>
                              <span className="text-sm text-gray-900">
                                {member.role.canManageFamily ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Activity</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Member Since:</span>
                              <span className="text-sm text-gray-900">
                                {member.createdAt.toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                              <span className="text-sm text-gray-900">
                                {member.updatedAt.toLocaleDateString()}
                              </span>
                            </div>
                            {member.lastActiveAt && (
                              <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-500">Last Active:</span>
                                <span className="text-sm text-gray-900">
                                  {member.lastActiveAt.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {member.notes && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Notes</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                              {member.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowMemberDetails(false);
                          setShowNewMemberForm(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Edit Member
                      </button>
                      <button
                        onClick={() => {
                          setShowMemberDetails(false);
                          setSelectedMember(null);
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyDashboard;