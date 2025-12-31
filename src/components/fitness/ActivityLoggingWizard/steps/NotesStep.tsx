'use client';

import React, { useState } from 'react';
import { MessageSquare, Smile, Frown, Meh, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useWizard } from '../WizardContext';

type Feeling = 'great' | 'good' | 'okay' | 'tired' | 'struggled';
type EnergyLevel = 'high' | 'normal' | 'low';

const feelingOptions: { value: Feeling; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { value: 'great', label: 'Great', icon: Smile, color: '#10B981' },
  { value: 'good', label: 'Good', icon: Smile, color: '#22C55E' },
  { value: 'okay', label: 'Okay', icon: Meh, color: '#F59E0B' },
  { value: 'tired', label: 'Tired', icon: Frown, color: '#F97316' },
  { value: 'struggled', label: 'Struggled', icon: Frown, color: '#EF4444' },
];

const energyOptions: { value: EnergyLevel; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'high', label: 'High Energy', icon: TrendingUp },
  { value: 'normal', label: 'Normal', icon: Minus },
  { value: 'low', label: 'Low Energy', icon: TrendingDown },
];

const quickNotes = [
  'Personal best!',
  'Increased weight',
  'Shorter rest periods',
  'Felt strong today',
  'Need more sleep',
  'Good form throughout',
  'Tried new exercise',
  'Post-work session',
  'Morning workout',
];

const NotesStep: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWizard();
  const [notes, setNotes] = useState(state.notes || '');
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    dispatch({ type: 'SET_NOTES', notes: value });
  };

  const addQuickNote = (quickNote: string) => {
    const newNotes = notes ? `${notes}\n${quickNote}` : quickNote;
    handleNotesChange(newNotes);
  };

  const handleContinue = () => {
    // Combine feeling and energy into notes if selected
    let finalNotes = notes;
    if (feeling || energy) {
      const extras: string[] = [];
      if (feeling) extras.push(`Feeling: ${feeling}`);
      if (energy) extras.push(`Energy: ${energy}`);
      if (extras.length > 0) {
        finalNotes = finalNotes ? `${finalNotes}\n\n${extras.join(' | ')}` : extras.join(' | ');
      }
    }
    dispatch({ type: 'SET_NOTES', notes: finalNotes });
    nextStep();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          How did it go?
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Add any notes about your workout (optional)
        </p>
      </div>

      {/* Feeling selector */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-3">
          How did you feel?
        </label>
        <div className="flex flex-wrap gap-2">
          {feelingOptions.map((option) => {
            const Icon = option.icon;
            const selected = feeling === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setFeeling(selected ? null : option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  selected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: selected ? option.color : '#9CA3AF' }}
                />
                <span
                  className={`text-sm font-medium ${
                    selected
                      ? 'text-gray-900 dark:text-slate-100'
                      : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Energy level */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-3">
          Energy level during workout
        </label>
        <div className="flex gap-3">
          {energyOptions.map((option) => {
            const Icon = option.icon;
            const selected = energy === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setEnergy(selected ? null : option.value)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${
                    selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    selected
                      ? 'text-gray-900 dark:text-slate-100'
                      : 'text-gray-600 dark:text-slate-400'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-3">
          Quick add
        </label>
        <div className="flex flex-wrap gap-2">
          {quickNotes.map((quickNote) => (
            <button
              key={quickNote}
              onClick={() => addQuickNote(quickNote)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              + {quickNote}
            </button>
          ))}
        </div>
      </div>

      {/* Notes textarea */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
          <MessageSquare className="w-4 h-4" />
          Additional notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Any other thoughts about your workout..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          {notes.length} / 500 characters
        </p>
      </div>

      {/* Skip hint */}
      <p className="text-center text-sm text-gray-500 dark:text-slate-400">
        No notes? Just click Continue to skip this step.
      </p>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default NotesStep;
