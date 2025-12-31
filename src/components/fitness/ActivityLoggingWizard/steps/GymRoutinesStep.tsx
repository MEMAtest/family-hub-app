'use client';

import React, { useState } from 'react';
import { Plus, ChevronDown, Search, X, Check } from 'lucide-react';
import { useWizard } from '../WizardContext';
import { exerciseLibrary, categoryDisplayNames, categoryIcons } from '@/data/exerciseLibrary';
import type { ExerciseCategory } from '@/types/fitness.types';

const GymRoutinesStep: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWizard();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('chest');
  const [workoutName, setWorkoutName] = useState(state.workoutName);

  // Predefined workout templates
  const workoutTemplates = [
    { name: 'Push Day', exercises: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Tricep Pushdowns', 'Lateral Raises'] },
    { name: 'Pull Day', exercises: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Bicep Curls', 'Face Pulls'] },
    { name: 'Leg Day', exercises: ['Squats', 'Romanian Deadlift', 'Leg Press', 'Leg Curls', 'Calf Raises'] },
    { name: 'Upper Body', exercises: ['Bench Press', 'Pull-ups', 'Overhead Press', 'Dumbbell Row', 'Bicep Curls'] },
    { name: 'Full Body', exercises: ['Squats', 'Bench Press', 'Deadlift', 'Pull-ups', 'Overhead Press'] },
  ];

  const handleAddExercise = (category: string, exerciseName: string) => {
    // Check if exercise is already added
    if (state.exercises.some((ex) => ex.exerciseName === exerciseName)) {
      return;
    }

    const newExercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      exerciseName,
      category: category as ExerciseCategory,
      sets: [{ setNumber: 1, reps: 10, weight: 0, weightUnit: 'kg' as const }],
      notes: '',
    };
    dispatch({ type: 'ADD_EXERCISE', exercise: newExercise });
  };

  const handleRemoveExercise = (index: number) => {
    dispatch({ type: 'REMOVE_EXERCISE', index });
  };

  const handleLoadTemplate = (template: typeof workoutTemplates[0]) => {
    setWorkoutName(template.name);
    dispatch({ type: 'SET_WORKOUT_NAME', name: template.name });

    // Clear existing exercises and add template exercises
    state.exercises.forEach((_, index) => {
      dispatch({ type: 'REMOVE_EXERCISE', index: 0 });
    });

    template.exercises.forEach((exerciseName) => {
      // Find the exercise in the library
      for (const [category, exercises] of Object.entries(exerciseLibrary)) {
        const exercise = exercises.find((ex) => ex.name === exerciseName);
        if (exercise) {
          handleAddExercise(category, exerciseName);
          break;
        }
      }
    });
  };

  const handleWorkoutNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkoutName(e.target.value);
    dispatch({ type: 'SET_WORKOUT_NAME', name: e.target.value });
  };

  // Filter exercises by search term
  const filteredCategories = Object.entries(exerciseLibrary).map(([category, exercises]) => ({
    category,
    exercises: exercises.filter((ex) =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(({ exercises }) => exercises.length > 0);

  const isExerciseSelected = (name: string) =>
    state.exercises.some((ex) => ex.exerciseName === name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          What exercises did you do?
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Select exercises from the library or use a template
        </p>
      </div>

      {/* Workout name input */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">
          Workout name (optional)
        </label>
        <input
          type="text"
          value={workoutName}
          onChange={handleWorkoutNameChange}
          placeholder="e.g., Push Day, Upper Body, Leg Day"
          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {/* Quick templates */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">
          Quick templates
        </label>
        <div className="flex flex-wrap gap-2">
          {workoutTemplates.map((template) => (
            <button
              key={template.name}
              onClick={() => handleLoadTemplate(template)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selected exercises */}
      {state.exercises.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-3">
            Selected exercises ({state.exercises.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {state.exercises.map((ex, idx) => (
              <span
                key={ex.id}
                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-2"
              >
                {ex.exerciseName}
                <button
                  onClick={() => handleRemoveExercise(idx)}
                  className="hover:text-blue-600 dark:hover:text-blue-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {/* Exercise categories accordion */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredCategories.map(({ category, exercises }) => (
          <div
            key={category}
            className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedCategory(expandedCategory === category ? null : category)
              }
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <span className="font-medium flex items-center gap-2">
                <span>{categoryIcons[category] || '💪'}</span>
                <span className="capitalize">{categoryDisplayNames[category] || category}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  ({exercises.length})
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  expandedCategory === category ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expandedCategory === category && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-slate-900">
                {exercises.map((exercise) => {
                  const selected = isExerciseSelected(exercise.name);
                  return (
                    <button
                      key={exercise.name}
                      onClick={() =>
                        selected
                          ? handleRemoveExercise(
                              state.exercises.findIndex(
                                (ex) => ex.exerciseName === exercise.name
                              )
                            )
                          : handleAddExercise(category, exercise.name)
                      }
                      className={`text-left px-3 py-2 text-sm border rounded-md transition-colors flex items-center justify-between ${
                        selected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{exercise.name}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                          ({exercise.equipment})
                        </span>
                      </div>
                      {selected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={state.exercises.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to sets & reps
        </button>
      </div>
    </div>
  );
};

export default GymRoutinesStep;
