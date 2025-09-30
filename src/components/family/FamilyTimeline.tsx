'use client';

import React, { useState } from 'react';
import { FamilyMilestone, FamilyMember, MilestoneType } from '@/types/family.types';
import {
  Calendar,
  Users,
  Heart,
  Home,
  GraduationCap,
  Baby,
  Briefcase,
  MapPin,
  Gift,
  Trophy,
  Camera,
  Plus,
  Filter,
  Search,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Share2
} from 'lucide-react';

interface FamilyTimelineProps {
  milestones: FamilyMilestone[];
  familyMembers: FamilyMember[];
  onAddMilestone: (milestone: Partial<FamilyMilestone>) => void;
  onEditMilestone: (id: string, milestone: Partial<FamilyMilestone>) => void;
  onDeleteMilestone: (id: string) => void;
}

export const FamilyTimeline: React.FC<FamilyTimelineProps> = ({
  milestones: initialMilestones,
  familyMembers,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone
}) => {
  const mockMilestones: FamilyMilestone[] = [
    {
      id: '1',
      title: 'Omosanya Family Established',
      description: 'Ade and Angela got married and started their beautiful family journey together.',
      date: new Date('2010-06-15'),
      type: 'family_event' as const,
      participants: ['ade', 'angela'],
      photos: ['https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800'],
      // location: 'Lagos, Nigeria',
      isPrivate: false,
      tags: ['wedding', 'love', 'beginning'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2010-06-15')
    },
    {
      id: '2',
      title: 'Moved to New Home',
      description: 'The family moved to their dream home in a wonderful neighborhood.',
      date: new Date('2012-03-20'),
      type: 'achievement' as const,
      participants: ['ade', 'angela'],
      photos: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['home', 'milestone', 'new-chapter'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2012-03-20')
    },
    {
      id: '3',
      title: 'Askia Born',
      description: 'Welcome to the world, Askia! Our first bundle of joy brought so much happiness to our family.',
      date: new Date('2013-08-10'),
      type: 'life_event' as const,
      participants: ['ade', 'angela', 'askia'],
      photos: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['birth', 'first-child', 'joy'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2013-08-10')
    },
    {
      id: '4',
      title: 'Amari Born',
      description: 'Our family is complete! Amari joined us and filled our hearts with even more love.',
      date: new Date('2016-04-22'),
      type: 'life_event' as const,
      participants: ['ade', 'angela', 'askia', 'amari'],
      photos: ['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800'],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['birth', 'second-child', 'complete-family'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2016-04-22')
    },
    {
      id: '5',
      title: 'Ade\'s Promotion',
      description: 'Ade got promoted to Senior Manager at his company. A well-deserved recognition!',
      date: new Date('2018-11-15'),
      type: 'achievement' as const,
      participants: ['ade'],
      photos: [],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['career', 'promotion', 'success'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2018-11-15')
    },
    {
      id: '6',
      title: 'First Family Vacation',
      description: 'Our amazing trip to Disney World. The kids had the time of their lives!',
      date: new Date('2019-07-04'),
      type: 'family_event' as const,
      participants: ['ade', 'angela', 'askia', 'amari'],
      photos: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800'
      ],
      // location: 'Orlando, FL',
      isPrivate: false,
      tags: ['vacation', 'disney', 'family-fun'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2019-07-04')
    },
    {
      id: '7',
      title: 'Askia\'s First Soccer Trophy',
      description: 'Askia won their first soccer trophy! We\'re so proud of their dedication and teamwork.',
      date: new Date('2020-10-30'),
      type: 'achievement' as const,
      participants: ['askia'],
      photos: ['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800'],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['sports', 'achievement', 'soccer'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2020-10-30')
    },
    {
      id: '8',
      title: 'Angela\'s Master\'s Degree',
      description: 'Angela graduated with her Master\'s degree in Education. Years of hard work paid off!',
      date: new Date('2021-05-18'),
      type: 'achievement' as const,
      participants: ['angela'],
      photos: ['https://images.unsplash.com/photo-1523050854058-8df90110c9d1?w=800'],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['education', 'graduation', 'achievement'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2021-05-18')
    },
    {
      id: '9',
      title: 'Family Pet Adoption',
      description: 'We adopted our beloved dog Max! He\'s been the perfect addition to our family.',
      date: new Date('2022-02-14'),
      type: 'other' as const,
      participants: ['ade', 'angela', 'askia', 'amari'],
      photos: ['https://images.unsplash.com/photo-1552053831-71594a27632d?w=800'],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['pet', 'adoption', 'valentine'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2022-02-14')
    },
    {
      id: '10',
      title: 'Amari\'s Piano Recital',
      description: 'Amari performed beautifully at their first piano recital. Such talent and confidence!',
      date: new Date('2023-12-10'),
      type: 'achievement' as const,
      participants: ['amari'],
      photos: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'],
      // location: 'Atlanta, GA',
      isPrivate: false,
      tags: ['music', 'piano', 'performance'],
      isRecurring: false,
      reminderDays: [],
      createdBy: 'ade',
      createdAt: new Date('2023-12-10')
    }
  ];

  const [milestones, setMilestones] = useState<FamilyMilestone[]>(
    initialMilestones && initialMilestones.length > 0 ? initialMilestones : mockMilestones
  );
  const [selectedFilter, setSelectedFilter] = useState<MilestoneType | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);

  const milestoneTypeConfig = {
    birthday: { icon: Baby, color: 'pink', label: 'Birthday' },
    anniversary: { icon: Heart, color: 'purple', label: 'Anniversary' },
    achievement: { icon: Trophy, color: 'yellow', label: 'Achievement' },
    life_event: { icon: Briefcase, color: 'green', label: 'Life Event' },
    family_event: { icon: MapPin, color: 'teal', label: 'Family Event' },
    other: { icon: Star, color: 'gray', label: 'Other' }
  } as Record<MilestoneType, { icon: any; color: string; label: string }>;

  const filteredMilestones = milestones
    .filter(milestone => {
      if (selectedFilter !== 'all' && milestone.type !== selectedFilter) return false;
      if (selectedYear !== 'all' && new Date(milestone.date).getFullYear() !== selectedYear) return false;
      if (searchTerm && !milestone.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !milestone.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getAvailableYears = () => {
    const years = milestones.map(m => new Date(m.date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  };

  const getMemberById = (id: string) => {
    return familyMembers.find(member => member.id === id);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInYears = Math.floor(diffInMs / (365.25 * 24 * 60 * 60 * 1000));

    if (diffInYears === 0) {
      return 'This year';
    } else if (diffInYears === 1) {
      return '1 year ago';
    } else {
      return `${diffInYears} years ago`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Family Timeline</h2>
              <p className="text-sm text-gray-600">
                {filteredMilestones.length} milestone{filteredMilestones.length !== 1 ? 's' : ''} in your family history
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search milestones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as MilestoneType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(milestoneTypeConfig).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Years</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {filteredMilestones.length > 0 ? (
          <div className="space-y-6">
            {filteredMilestones.map((milestone, index) => {
              const config = milestoneTypeConfig[milestone.type];
              const IconComponent = config.icon;
              const isExpanded = expandedMilestone === milestone.id;

              return (
                <div key={milestone.id} className="relative">
                  {index < filteredMilestones.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-full bg-gray-200" />
                  )}

                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 bg-${config.color}-100 rounded-full flex items-center justify-center`}>
                      <IconComponent className={`w-6 h-6 text-${config.color}-600`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                              <span className={`px-2 py-1 bg-${config.color}-100 text-${config.color}-800 text-xs font-medium rounded-full`}>
                                {config.label}
                              </span>
                            </div>

                            <p className="text-gray-700 mb-3">{milestone.description}</p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(milestone.date)}</span>
                                <span className="text-gray-400">•</span>
                                <span>{getTimeAgo(milestone.date)}</span>
                              </div>

                              {/* location field not available in FamilyMilestone type */}

                              {milestone.participants.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>
                                    {milestone.participants
                                      .map((id: string) => getMemberById(id)?.firstName || 'Unknown')
                                      .join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {milestone.tags && milestone.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {milestone.tags.map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {milestone.photos && milestone.photos.length > 0 && (
                              <div className="mt-4">
                                <button
                                  onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  <Camera className="w-4 h-4" />
                                  {milestone.photos.length} photo{milestone.photos.length !== 1 ? 's' : ''}
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                    {milestone.photos.map((photo, photoIndex) => (
                                      <img
                                        key={photoIndex}
                                        src={photo}
                                        alt={`${milestone.title} - Photo ${photoIndex + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 ml-4">
                            <button
                              onClick={() => {}}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Share milestone"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {}}
                              className="p-1 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Edit milestone"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteMilestone(milestone.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete milestone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Milestones Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedFilter !== 'all' || selectedYear !== 'all'
                ? 'Try adjusting your filters to see more milestones.'
                : 'Start building your family timeline by adding your first milestone.'}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Milestone
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add New Milestone</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Milestone Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter milestone title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe this special moment..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      {Object.entries(milestoneTypeConfig).map(([type, config]) => (
                        <option key={type} value={type}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Where did this happen?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Members Involved
                  </label>
                  <div className="space-y-2">
                    {familyMembers.map((member) => (
                      <label key={member.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {member.firstName} {member.lastName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Milestone
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};