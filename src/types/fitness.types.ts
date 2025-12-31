/**
 * Fitness Tracking Types
 * Types for activity logging, gym workouts, and device integrations
 */

// Activity types
export type ActivityType = 'gym' | 'run' | 'swim' | 'cycle' | 'walk' | 'sports' | 'yoga' | 'cardio' | 'stretching' | 'other';
export type IntensityLevel = 'low' | 'moderate' | 'high';
export type ExerciseCategory = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full_body';
export type DataSource = 'manual' | 'garmin' | 'ultrahuman';

// Exercise set detail
export interface SetDetail {
  setNumber: number;
  reps?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  duration?: number;      // In seconds, for timed exercises
  distance?: number;      // In meters, for cardio
  restSeconds?: number;
}

// Exercise with sets
export interface ExerciseSet {
  id: string;
  exerciseName: string;
  category: ExerciseCategory;
  sets: SetDetail[];
  notes?: string;
}

// Additional activity (warmup, cooldown, etc.)
export interface AdditionalActivity {
  type: 'cardio' | 'stretching' | 'warmup' | 'cooldown' | 'core';
  durationMinutes: number;
  notes?: string;
}

// Main fitness activity record
export interface FitnessActivity {
  id: string;
  personId: string;
  activityType: ActivityType;
  durationMinutes: number;
  intensityLevel: IntensityLevel;
  activityDate: string;
  notes?: string;
  calories?: number;
  exercises?: ExerciseSet[];
  workoutName?: string;
  heartRateAvg?: number;
  heartRateMax?: number;
  source: DataSource;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
  // Included relation
  person?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

// Wizard step types
export type WizardStep =
  | 'activity_type'
  | 'duration'
  | 'gym_routines'
  | 'exercise_details'
  | 'additional_activities'
  | 'notes'
  | 'summary';

// Wizard state
export interface ActivityWizardState {
  step: WizardStep;
  activityType: ActivityType | null;
  duration: number;
  intensityLevel: IntensityLevel;
  workoutName: string;
  exercises: ExerciseSet[];
  additionalActivities: AdditionalActivity[];
  notes: string;
  activityDate: Date;
  personId: string;
}

// Stats types
export interface FitnessStats {
  period: 'week' | 'month' | 'year';
  totalWorkouts: number;
  totalMinutes: number;
  totalCalories: number;
  averageDuration: number;
  streakDays: number;
  activitiesByType: Partial<Record<ActivityType, number>>;
  progressToGoal?: {
    workouts: { current: number; target: number };
    activeHours: { current: number; target: number };
    steps?: { current: number; target: number };
  };
}

// Exercise library types
export interface ExerciseDefinition {
  name: string;
  equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell' | 'bands';
  category: ExerciseCategory;
  muscleGroups?: string[];
}

export interface ExerciseLibrary {
  [category: string]: ExerciseDefinition[];
}

// Device sync types (Phase 2)
export interface DeviceSyncConfig {
  id: string;
  personId: string;
  provider: 'garmin' | 'ultrahuman';
  enabled: boolean;
  lastSyncAt?: string;
  syncSettings?: {
    activities: boolean;
    sleep: boolean;
    heartRate: boolean;
    steps: boolean;
    hrv: boolean;
    recovery: boolean;
  };
}

// API request/response types
export interface CreateActivityRequest {
  personId: string;
  activityType: ActivityType;
  durationMinutes: number;
  intensityLevel: IntensityLevel;
  activityDate?: string;
  notes?: string;
  calories?: number;
  exercises?: ExerciseSet[];
  workoutName?: string;
  heartRateAvg?: number;
  heartRateMax?: number;
  source?: DataSource;
  externalId?: string;
}

export interface FitnessStatsRequest {
  personId?: string;
  period?: 'week' | 'month' | 'year';
}

export interface FitnessActivitiesRequest {
  personId?: string;
  startDate?: string;
  endDate?: string;
  activityType?: ActivityType;
  limit?: number;
  offset?: number;
}
