'use client'

import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Medal,
  Crown,
  Gift,
  Calendar,
  User,
  Users,
  Filter,
  Search,
  Share,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
  Heart,
  Target,
  Award
} from 'lucide-react';

interface AchievementTrackerProps {
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
    earnedBy: string;
    earnedDate: Date;
    points: number;
    badge: { name: string; icon: string; color: string };
  }>;
  familyMembers: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
  }>;
}

const AchievementTracker: React.FC<AchievementTrackerProps> = ({
  achievements,
  familyMembers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock additional data for achievements system
  const availableBadges = [
    { id: 'first-goal', name: 'Goal Setter', icon: '🎯', color: '#3B82F6', description: 'Set your first goal', unlocked: true },
    { id: 'streak-master', name: 'Streak Master', icon: '🔥', color: '#EF4444', description: 'Maintain a 7-day streak', unlocked: true },
    { id: 'team-player', name: 'Team Player', icon: '🤝', color: '#10B981', description: 'Complete 3 family goals', unlocked: false },
    { id: 'overachiever', name: 'Overachiever', icon: '⭐', color: '#F59E0B', description: 'Complete 10 goals', unlocked: false },
    { id: 'mentor', name: 'Mentor', icon: '🎓', color: '#8B5CF6', description: 'Help 3 family members achieve goals', unlocked: false },
    { id: 'consistency', name: 'Consistent', icon: '📅', color: '#06B6D4', description: 'Update progress daily for 30 days', unlocked: true },
    { id: 'champion', name: 'Champion', icon: '👑', color: '#DC2626', description: 'Earn 1000 points', unlocked: false },
    { id: 'explorer', name: 'Explorer', icon: '🗺️', color: '#059669', description: 'Try goals in 5 different categories', unlocked: false }
  ];

  const leaderboard = familyMembers.map(member => {
    const memberAchievements = achievements.filter(a => a.earnedBy === member.id);
    const totalPoints = memberAchievements.reduce((sum, a) => sum + a.points, 0);
    const badgeCount = memberAchievements.length;

    return {
      ...member,
      totalPoints,
      badgeCount,
      level: Math.floor(totalPoints / 250) + 1,
      nextLevelPoints: (Math.floor(totalPoints / 250) + 1) * 250,
      recentAchievement: memberAchievements.sort((a, b) =>
        new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime()
      )[0]
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const categories = [
    { id: 'fitness', name: 'Fitness', icon: '💪', count: achievements.filter(a => a.type === 'fitness').length },
    { id: 'education', name: 'Education', icon: '📚', count: achievements.filter(a => a.type === 'education').length },
    { id: 'health', name: 'Health', icon: '❤️', count: achievements.filter(a => a.type === 'health').length },
    { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦', count: achievements.filter(a => a.type === 'family').length },
    { id: 'personal', name: 'Personal', icon: '🌟', count: achievements.filter(a => a.type === 'personal').length },
    { id: 'sport', name: 'Sport', icon: '⚽', count: achievements.filter(a => a.type === 'sport').length }
  ];

  const filteredAchievements = achievements.filter(achievement => {
    const matchesSearch = achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         achievement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || achievement.difficulty === filterDifficulty;
    const matchesPerson = filterPerson === 'all' || achievement.earnedBy === filterPerson;
    const matchesType = filterType === 'all' || achievement.type === filterType;

    return matchesSearch && matchesDifficulty && matchesPerson && matchesType;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: '🥉' };
      case 'silver': return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: '🥈' };
      case 'gold': return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: '🥇' };
      case 'platinum': return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: '💎' };
      case 'legendary': return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', icon: '👑' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: '🏅' };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const renderLeaderboard = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Family Leaderboard</h2>

      <div className="space-y-4">
        {leaderboard.map((member, index) => (
          <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                }`}>
                  {index + 1}
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: member.color }}
                >
                  {member.icon}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Level {member.level}</span>
                  <span>{member.badgeCount} badges</span>
                  <span>{member.totalPoints} points</span>
                </div>
                <div className="mt-1 w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((member.totalPoints % 250) / 250) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="text-right">
              {member.recentAchievement && (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{member.recentAchievement.title}</p>
                  <p className="text-gray-500">{formatTimeAgo(member.recentAchievement.earnedDate)}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBadgeCollection = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Badge Collection</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {availableBadges.map(badge => (
          <div
            key={badge.id}
            className={`relative p-4 border rounded-lg text-center transition-all cursor-pointer ${
              badge.unlocked
                ? 'border-gray-300 hover:border-blue-500 bg-white'
                : 'border-gray-200 bg-gray-50 opacity-60'
            }`}
            title={badge.description}
          >
            <div
              className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl ${
                badge.unlocked ? '' : 'grayscale'
              }`}
              style={{ backgroundColor: badge.unlocked ? badge.color + '20' : '#f3f4f6' }}
            >
              {badge.icon}
            </div>
            <h4 className={`font-medium text-sm ${badge.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
              {badge.name}
            </h4>
            <p className="text-xs text-gray-500 mt-1">{badge.description}</p>

            {!badge.unlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 rounded-lg">
                <div className="text-gray-400">
                  <Trophy className="w-6 h-6" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAchievementGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredAchievements.map(achievement => {
        const person = familyMembers.find(p => p.id === achievement.earnedBy);
        const difficulty = getDifficultyColor(achievement.difficulty);
        const isExpanded = selectedAchievement === achievement.id;

        return (
          <div
            key={achievement.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: person?.color }}
                >
                  {person?.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                  <p className="text-sm text-gray-600">{person?.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs border ${difficulty.bg} ${difficulty.text} ${difficulty.border}`}>
                  {difficulty.icon} {achievement.difficulty}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">{achievement.description}</p>

            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-500">
                {formatTimeAgo(achievement.earnedDate)}
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-yellow-600">+{achievement.points} pts</span>
                <button
                  onClick={() => setSelectedAchievement(
                    isExpanded ? null : achievement.id
                  )}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{achievement.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date Earned:</span>
                    <span className="font-medium">{achievement.earnedDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Badge:</span>
                    <span className="font-medium">{achievement.badge.name}</span>
                  </div>
                </div>

                <div className="flex space-x-2 mt-4">
                  <button className="flex items-center space-x-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
                    <Share className="w-3 h-3" />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center space-x-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                    <Eye className="w-3 h-3" />
                    <span>View Goal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderAchievementList = () => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Achievement
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Earned By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAchievements.map(achievement => {
              const person = familyMembers.find(p => p.id === achievement.earnedBy);
              const difficulty = getDifficultyColor(achievement.difficulty);

              return (
                <tr key={achievement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{achievement.title}</div>
                      <div className="text-sm text-gray-500">{achievement.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: person?.color }}
                      >
                        {person?.icon}
                      </div>
                      <span className="text-sm text-gray-900">{person?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${difficulty.bg} ${difficulty.text}`}>
                      {difficulty.icon} {achievement.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-yellow-600">+{achievement.points}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimeAgo(achievement.earnedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Share className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Achievements</p>
              <p className="text-3xl font-bold text-gray-900">{achievements.length}</p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Points Earned</p>
              <p className="text-3xl font-bold text-gray-900">
                {achievements.reduce((sum, a) => sum + a.points, 0).toLocaleString()}
              </p>
            </div>
            <Star className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-gray-900">
                {achievements.filter(a =>
                  new Date(a.earnedDate).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Badges Unlocked</p>
              <p className="text-3xl font-bold text-gray-900">
                {availableBadges.filter(b => b.unlocked).length}/{availableBadges.length}
              </p>
            </div>
            <Medal className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Achievements by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(category => (
            <div key={category.id} className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-2xl mb-2">{category.icon}</div>
              <h3 className="font-medium text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-600">{category.count} earned</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {renderLeaderboard()}

      {/* Badge Collection */}
      {renderBadgeCollection()}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search achievements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Difficulties</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="legendary">Legendary</option>
        </select>

        <select
          value={filterPerson}
          onChange={(e) => setFilterPerson(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Members</option>
          {familyMembers.map(person => (
            <option key={person.id} value={person.id}>{person.name}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>

        <div className="flex border border-gray-300 rounded-md">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm border-l border-gray-300 ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            List
          </button>
        </div>
      </div>

      {/* Achievements Display */}
      {filteredAchievements.length > 0 ? (
        viewMode === 'grid' ? renderAchievementGrid() : renderAchievementList()
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements found</h3>
          <p className="text-gray-600">
            {searchTerm || filterDifficulty !== 'all' || filterPerson !== 'all' || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Start completing goals to earn your first achievement!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AchievementTracker;