'use client';

import React from 'react';
import {
  Dumbbell,
  PersonStanding,
  Waves,
  Bike,
  Footprints,
  Trophy,
  Flower2,
  Heart,
  MoreHorizontal,
} from 'lucide-react';
import { useWizard } from '../WizardContext';
import type { ActivityType } from '@/types/fitness.types';

interface ActivityOption {
  id: ActivityType;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const activityOptions: ActivityOption[] = [
  {
    id: 'gym',
    label: 'Gym / Weights',
    icon: Dumbbell,
    color: '#EF4444',
    description: 'Weight training, machines, free weights',
  },
  {
    id: 'run',
    label: 'Running',
    icon: PersonStanding,
    color: '#3B82F6',
    description: 'Outdoor or treadmill run',
  },
  {
    id: 'swim',
    label: 'Swimming',
    icon: Waves,
    color: '#06B6D4',
    description: 'Pool or open water swim',
  },
  {
    id: 'cycle',
    label: 'Cycling',
    icon: Bike,
    color: '#10B981',
    description: 'Road cycling or spin class',
  },
  {
    id: 'walk',
    label: 'Walking',
    icon: Footprints,
    color: '#8B5CF6',
    description: 'Walk or hike',
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: Trophy,
    color: '#F59E0B',
    description: 'Football, tennis, basketball, etc.',
  },
  {
    id: 'yoga',
    label: 'Yoga / Pilates',
    icon: Flower2,
    color: '#EC4899',
    description: 'Yoga, pilates, stretching',
  },
  {
    id: 'cardio',
    label: 'Cardio',
    icon: Heart,
    color: '#F97316',
    description: 'HIIT, aerobics, other cardio',
  },
  {
    id: 'other',
    label: 'Other',
    icon: MoreHorizontal,
    color: '#6B7280',
    description: 'Any other physical activity',
  },
];

const ActivityTypeStep: React.FC = () => {
  const { dispatch } = useWizard();

  const handleSelectActivity = (activityType: ActivityType) => {
    dispatch({ type: 'SET_ACTIVITY_TYPE', activityType });
  };

  return (
    <div className="space-y-6">
      {/* Conversational header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          What did you do today?
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Select the type of activity you want to log
        </p>
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {activityOptions.map((activity) => (
          <button
            key={activity.id}
            onClick={() => handleSelectActivity(activity.id)}
            className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all group"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors"
              style={{ backgroundColor: `${activity.color}20` }}
            >
              <activity.icon
                className="w-7 h-7"
                style={{ color: activity.color }}
              />
            </div>
            <span className="font-medium text-gray-900 dark:text-slate-100 text-sm text-center">
              {activity.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1 line-clamp-2">
              {activity.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActivityTypeStep;
