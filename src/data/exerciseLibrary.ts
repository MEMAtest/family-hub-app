/**
 * Pre-built exercise library organized by muscle group
 */

import type { ExerciseDefinition, ExerciseLibrary } from '@/types/fitness.types';

export const exerciseLibrary: ExerciseLibrary = {
  chest: [
    { name: 'Bench Press', equipment: 'barbell', category: 'chest', muscleGroups: ['pectorals', 'triceps', 'shoulders'] },
    { name: 'Incline Bench Press', equipment: 'barbell', category: 'chest', muscleGroups: ['upper pectorals', 'shoulders'] },
    { name: 'Dumbbell Press', equipment: 'dumbbell', category: 'chest', muscleGroups: ['pectorals', 'triceps'] },
    { name: 'Incline Dumbbell Press', equipment: 'dumbbell', category: 'chest', muscleGroups: ['upper pectorals'] },
    { name: 'Chest Fly', equipment: 'dumbbell', category: 'chest', muscleGroups: ['pectorals'] },
    { name: 'Cable Fly', equipment: 'cable', category: 'chest', muscleGroups: ['pectorals'] },
    { name: 'Push-ups', equipment: 'bodyweight', category: 'chest', muscleGroups: ['pectorals', 'triceps', 'core'] },
    { name: 'Dips (Chest)', equipment: 'bodyweight', category: 'chest', muscleGroups: ['pectorals', 'triceps'] },
    { name: 'Pec Deck', equipment: 'machine', category: 'chest', muscleGroups: ['pectorals'] },
    { name: 'Decline Press', equipment: 'barbell', category: 'chest', muscleGroups: ['lower pectorals'] },
  ],
  back: [
    { name: 'Deadlift', equipment: 'barbell', category: 'back', muscleGroups: ['lower back', 'hamstrings', 'glutes'] },
    { name: 'Pull-ups', equipment: 'bodyweight', category: 'back', muscleGroups: ['lats', 'biceps'] },
    { name: 'Chin-ups', equipment: 'bodyweight', category: 'back', muscleGroups: ['lats', 'biceps'] },
    { name: 'Lat Pulldown', equipment: 'cable', category: 'back', muscleGroups: ['lats'] },
    { name: 'Barbell Row', equipment: 'barbell', category: 'back', muscleGroups: ['lats', 'rhomboids', 'biceps'] },
    { name: 'Dumbbell Row', equipment: 'dumbbell', category: 'back', muscleGroups: ['lats', 'rhomboids'] },
    { name: 'Seated Cable Row', equipment: 'cable', category: 'back', muscleGroups: ['lats', 'rhomboids'] },
    { name: 'T-Bar Row', equipment: 'barbell', category: 'back', muscleGroups: ['lats', 'rhomboids'] },
    { name: 'Face Pulls', equipment: 'cable', category: 'back', muscleGroups: ['rear deltoids', 'traps'] },
    { name: 'Hyperextensions', equipment: 'bodyweight', category: 'back', muscleGroups: ['lower back', 'glutes'] },
  ],
  legs: [
    { name: 'Squats', equipment: 'barbell', category: 'legs', muscleGroups: ['quads', 'glutes', 'hamstrings'] },
    { name: 'Front Squats', equipment: 'barbell', category: 'legs', muscleGroups: ['quads', 'core'] },
    { name: 'Leg Press', equipment: 'machine', category: 'legs', muscleGroups: ['quads', 'glutes'] },
    { name: 'Romanian Deadlift', equipment: 'barbell', category: 'legs', muscleGroups: ['hamstrings', 'glutes'] },
    { name: 'Lunges', equipment: 'dumbbell', category: 'legs', muscleGroups: ['quads', 'glutes'] },
    { name: 'Bulgarian Split Squats', equipment: 'dumbbell', category: 'legs', muscleGroups: ['quads', 'glutes'] },
    { name: 'Leg Curls', equipment: 'machine', category: 'legs', muscleGroups: ['hamstrings'] },
    { name: 'Leg Extensions', equipment: 'machine', category: 'legs', muscleGroups: ['quads'] },
    { name: 'Calf Raises', equipment: 'machine', category: 'legs', muscleGroups: ['calves'] },
    { name: 'Hip Thrusts', equipment: 'barbell', category: 'legs', muscleGroups: ['glutes', 'hamstrings'] },
    { name: 'Goblet Squats', equipment: 'dumbbell', category: 'legs', muscleGroups: ['quads', 'glutes'] },
  ],
  shoulders: [
    { name: 'Overhead Press', equipment: 'barbell', category: 'shoulders', muscleGroups: ['deltoids', 'triceps'] },
    { name: 'Dumbbell Shoulder Press', equipment: 'dumbbell', category: 'shoulders', muscleGroups: ['deltoids'] },
    { name: 'Lateral Raises', equipment: 'dumbbell', category: 'shoulders', muscleGroups: ['lateral deltoids'] },
    { name: 'Front Raises', equipment: 'dumbbell', category: 'shoulders', muscleGroups: ['front deltoids'] },
    { name: 'Rear Delt Fly', equipment: 'dumbbell', category: 'shoulders', muscleGroups: ['rear deltoids'] },
    { name: 'Arnold Press', equipment: 'dumbbell', category: 'shoulders', muscleGroups: ['deltoids'] },
    { name: 'Upright Rows', equipment: 'barbell', category: 'shoulders', muscleGroups: ['deltoids', 'traps'] },
    { name: 'Shrugs', equipment: 'dumbbell', category: 'shoulders', muscleGroups: ['traps'] },
    { name: 'Cable Lateral Raises', equipment: 'cable', category: 'shoulders', muscleGroups: ['lateral deltoids'] },
  ],
  arms: [
    { name: 'Bicep Curls', equipment: 'dumbbell', category: 'arms', muscleGroups: ['biceps'] },
    { name: 'Barbell Curls', equipment: 'barbell', category: 'arms', muscleGroups: ['biceps'] },
    { name: 'Hammer Curls', equipment: 'dumbbell', category: 'arms', muscleGroups: ['biceps', 'forearms'] },
    { name: 'Preacher Curls', equipment: 'dumbbell', category: 'arms', muscleGroups: ['biceps'] },
    { name: 'Tricep Dips', equipment: 'bodyweight', category: 'arms', muscleGroups: ['triceps'] },
    { name: 'Tricep Pushdowns', equipment: 'cable', category: 'arms', muscleGroups: ['triceps'] },
    { name: 'Skull Crushers', equipment: 'barbell', category: 'arms', muscleGroups: ['triceps'] },
    { name: 'Overhead Tricep Extension', equipment: 'dumbbell', category: 'arms', muscleGroups: ['triceps'] },
    { name: 'Close-Grip Bench Press', equipment: 'barbell', category: 'arms', muscleGroups: ['triceps', 'chest'] },
    { name: 'Concentration Curls', equipment: 'dumbbell', category: 'arms', muscleGroups: ['biceps'] },
  ],
  core: [
    { name: 'Plank', equipment: 'bodyweight', category: 'core', muscleGroups: ['abs', 'obliques'] },
    { name: 'Side Plank', equipment: 'bodyweight', category: 'core', muscleGroups: ['obliques'] },
    { name: 'Crunches', equipment: 'bodyweight', category: 'core', muscleGroups: ['abs'] },
    { name: 'Russian Twists', equipment: 'bodyweight', category: 'core', muscleGroups: ['obliques'] },
    { name: 'Leg Raises', equipment: 'bodyweight', category: 'core', muscleGroups: ['lower abs'] },
    { name: 'Hanging Leg Raises', equipment: 'bodyweight', category: 'core', muscleGroups: ['lower abs'] },
    { name: 'Ab Wheel Rollout', equipment: 'bodyweight', category: 'core', muscleGroups: ['abs'] },
    { name: 'Cable Woodchops', equipment: 'cable', category: 'core', muscleGroups: ['obliques'] },
    { name: 'Dead Bug', equipment: 'bodyweight', category: 'core', muscleGroups: ['abs', 'core stability'] },
    { name: 'Mountain Climbers', equipment: 'bodyweight', category: 'core', muscleGroups: ['abs', 'hip flexors'] },
  ],
  cardio: [
    { name: 'Treadmill Run', equipment: 'machine', category: 'cardio', muscleGroups: ['legs', 'cardiovascular'] },
    { name: 'Treadmill Walk', equipment: 'machine', category: 'cardio', muscleGroups: ['legs'] },
    { name: 'Stationary Bike', equipment: 'machine', category: 'cardio', muscleGroups: ['legs', 'cardiovascular'] },
    { name: 'Rowing Machine', equipment: 'machine', category: 'cardio', muscleGroups: ['full body', 'cardiovascular'] },
    { name: 'Elliptical', equipment: 'machine', category: 'cardio', muscleGroups: ['legs', 'cardiovascular'] },
    { name: 'Stair Climber', equipment: 'machine', category: 'cardio', muscleGroups: ['legs', 'glutes'] },
    { name: 'Jump Rope', equipment: 'bodyweight', category: 'cardio', muscleGroups: ['calves', 'cardiovascular'] },
    { name: 'Battle Ropes', equipment: 'bodyweight', category: 'cardio', muscleGroups: ['arms', 'core', 'cardiovascular'] },
    { name: 'Burpees', equipment: 'bodyweight', category: 'cardio', muscleGroups: ['full body'] },
    { name: 'Box Jumps', equipment: 'bodyweight', category: 'cardio', muscleGroups: ['legs', 'explosive power'] },
  ],
  full_body: [
    { name: 'Clean and Press', equipment: 'barbell', category: 'full_body', muscleGroups: ['full body'] },
    { name: 'Thrusters', equipment: 'barbell', category: 'full_body', muscleGroups: ['legs', 'shoulders'] },
    { name: 'Kettlebell Swings', equipment: 'kettlebell', category: 'full_body', muscleGroups: ['glutes', 'hamstrings', 'core'] },
    { name: 'Turkish Get-ups', equipment: 'kettlebell', category: 'full_body', muscleGroups: ['full body', 'stability'] },
    { name: 'Farmers Walk', equipment: 'dumbbell', category: 'full_body', muscleGroups: ['grip', 'core', 'traps'] },
    { name: 'Man Makers', equipment: 'dumbbell', category: 'full_body', muscleGroups: ['full body'] },
  ],
};

// Get all exercises as a flat array
export const getAllExercises = (): ExerciseDefinition[] => {
  return Object.values(exerciseLibrary).flat();
};

// Search exercises by name
export const searchExercises = (query: string): ExerciseDefinition[] => {
  const lowerQuery = query.toLowerCase();
  return getAllExercises().filter(exercise =>
    exercise.name.toLowerCase().includes(lowerQuery)
  );
};

// Get exercises by category
export const getExercisesByCategory = (category: string): ExerciseDefinition[] => {
  return exerciseLibrary[category] || [];
};

// Get category display names
export const categoryDisplayNames: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  cardio: 'Cardio',
  full_body: 'Full Body',
};

// Get category icons (for UI display)
export const categoryIcons: Record<string, string> = {
  chest: '💪',
  back: '🔙',
  legs: '🦵',
  shoulders: '🤷',
  arms: '💪',
  core: '🎯',
  cardio: '❤️',
  full_body: '🏋️',
};

export default exerciseLibrary;
