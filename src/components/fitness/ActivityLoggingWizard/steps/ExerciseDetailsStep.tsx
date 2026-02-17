'use client';

import React, { useState } from 'react';
import { Plus, Minus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useWizard } from '../WizardContext';
import type { SetDetail } from '@/types/fitness.types';

const ExerciseDetailsStep: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWizard();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  const currentExercise = state.exercises[currentExerciseIndex];

  if (!currentExercise) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-slate-400">No exercises selected</p>
        <button
          onClick={prevStep}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go back to add exercises
        </button>
      </div>
    );
  }

  const handleAddSet = () => {
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
    const newSet: SetDetail = {
      setNumber: currentExercise.sets.length + 1,
      reps: lastSet?.reps || 10,
      weight: lastSet?.weight || 0,
      weightUnit: lastSet?.weightUnit || 'kg',
    };

    const updatedExercise = {
      ...currentExercise,
      sets: [...currentExercise.sets, newSet],
    };
    dispatch({ type: 'UPDATE_EXERCISE', index: currentExerciseIndex, exercise: updatedExercise });
  };

  const handleRemoveSet = (setIndex: number) => {
    if (currentExercise.sets.length <= 1) return;

    const updatedSets = currentExercise.sets
      .filter((_, idx) => idx !== setIndex)
      .map((set, idx) => ({ ...set, setNumber: idx + 1 }));

    dispatch({
      type: 'UPDATE_EXERCISE',
      index: currentExerciseIndex,
      exercise: { ...currentExercise, sets: updatedSets },
    });
  };

  const handleUpdateSet = (setIndex: number, field: keyof SetDetail, value: number | string) => {
    const updatedSets = currentExercise.sets.map((set, idx) =>
      idx === setIndex ? { ...set, [field]: value } : set
    );
    dispatch({
      type: 'UPDATE_EXERCISE',
      index: currentExerciseIndex,
      exercise: { ...currentExercise, sets: updatedSets },
    });
  };

  const handleCopyPreviousSet = (setIndex: number) => {
    if (setIndex === 0) return;
    const previousSet = currentExercise.sets[setIndex - 1];
    handleUpdateSet(setIndex, 'reps', previousSet.reps || 0);
    handleUpdateSet(setIndex, 'weight', previousSet.weight || 0);
  };

  const navigateExercise = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentExerciseIndex > 0) {
      setCurrentExerciseIndex((prev) => prev - 1);
    } else if (direction === 'next' && currentExerciseIndex < state.exercises.length - 1) {
      setCurrentExerciseIndex((prev) => prev + 1);
    }
  };

  const isLastExercise = currentExerciseIndex === state.exercises.length - 1;
  const isFirstExercise = currentExerciseIndex === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          Add your sets and reps
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Exercise {currentExerciseIndex + 1} of {state.exercises.length}
        </p>
      </div>

      {/* Exercise navigation */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 rounded-lg p-3 sm:p-4 gap-2">
        <button
          onClick={() => navigateExercise('prev')}
          disabled={isFirstExercise}
          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-slate-100">
            {currentExercise.exerciseName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">
            {currentExercise.category}
          </p>
        </div>
        <button
          onClick={() => navigateExercise('next')}
          disabled={isLastExercise}
          className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Exercise dots indicator */}
      <div className="flex justify-center gap-2">
        {state.exercises.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentExerciseIndex(idx)}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentExerciseIndex
                ? 'bg-blue-600'
                : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500'
            }`}
          />
        ))}
      </div>

      {/* Sets table */}
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                  Set
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                  Reps
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                  Weight (kg)
                </th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {currentExercise.sets.map((set, idx) => (
                <tr key={idx} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      Set {set.setNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleUpdateSet(idx, 'reps', Math.max(1, (set.reps || 0) - 1))
                        }
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) =>
                          handleUpdateSet(idx, 'reps', parseInt(e.target.value) || 0)
                        }
                        className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                        min="0"
                      />
                      <button
                        onClick={() =>
                          handleUpdateSet(idx, 'reps', (set.reps || 0) + 1)
                        }
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleUpdateSet(idx, 'weight', Math.max(0, (set.weight || 0) - 2.5))
                        }
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) =>
                          handleUpdateSet(idx, 'weight', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                        min="0"
                        step="2.5"
                      />
                      <button
                        onClick={() =>
                          handleUpdateSet(idx, 'weight', (set.weight || 0) + 2.5)
                        }
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemoveSet(idx)}
                      disabled={currentExercise.sets.length <= 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add set button */}
      <button
        onClick={handleAddSet}
        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Set
      </button>

      {/* Quick volume summary */}
      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Volume Summary
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-gray-500 dark:text-slate-400">Total sets:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-slate-100">
              {currentExercise.sets.length}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-slate-400">Total reps:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-slate-100">
              {currentExercise.sets.reduce((sum, set) => sum + (set.reps || 0), 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-slate-400">Total volume:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-slate-100">
              {currentExercise.sets.reduce(
                (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
                0
              ).toFixed(1)}{' '}
              kg
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between pt-4">
        <button
          onClick={prevStep}
          className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (!isLastExercise) {
              setCurrentExerciseIndex((prev) => prev + 1);
            } else {
              nextStep();
            }
          }}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {isLastExercise ? 'Continue' : 'Next Exercise'}
        </button>
      </div>
    </div>
  );
};

export default ExerciseDetailsStep;
