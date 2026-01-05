'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { PropertyProject, ProjectCategory, ProjectStatus } from '@/types/property.types';
import { createId } from '@/utils/id';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreateProject: (project: PropertyProject) => void;
}

const categories: { value: ProjectCategory; label: string; icon: string }[] = [
  { value: 'Bathroom', label: 'Bathroom', icon: '🛁' },
  { value: 'Kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'Electrics', label: 'Electrics', icon: '🔌' },
  { value: 'Plumbing', label: 'Plumbing', icon: '🚰' },
  { value: 'Heating', label: 'Heating', icon: '🔥' },
  { value: 'Roofing', label: 'Roofing', icon: '🏠' },
  { value: 'Extension', label: 'Extension', icon: '🏗️' },
  { value: 'Garden', label: 'Garden', icon: '🌳' },
  { value: 'Decoration', label: 'Decoration', icon: '🎨' },
  { value: 'Other', label: 'Other', icon: '📋' },
];

export const CreateProjectModal = ({
  open,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('Other');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [targetStartDate, setTargetStartDate] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    const now = new Date().toISOString();
    const newProject: PropertyProject = {
      id: createId('project'),
      title: title.trim(),
      description: description.trim() || undefined,
      status: 'planning' as ProjectStatus,
      category,
      budgetMin: budgetMin ? parseInt(budgetMin, 10) : undefined,
      budgetMax: budgetMax ? parseInt(budgetMax, 10) : undefined,
      currency: 'GBP',
      targetStartDate: targetStartDate || undefined,
      targetCompletionDate: targetCompletionDate || undefined,
      milestones: [],
      emails: [],
      tasks: [],
      contacts: [],
      quotes: [],
      scheduledVisits: [],
      followUps: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    onCreateProject(newProject);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('Other');
    setBudgetMin('');
    setBudgetMax('');
    setTargetStartDate('');
    setTargetCompletionDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            New Project
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Bathroom Renovation"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Category
              </label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex flex-col items-center rounded-lg border p-2 text-center transition-colors ${
                      category === cat.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="mt-1 text-xs text-gray-600 dark:text-slate-400">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the project..."
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Budget Range (£)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Min"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Max"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                />
              </div>
            </div>

            {/* Target Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Target Start
                </label>
                <input
                  type="date"
                  value={targetStartDate}
                  onChange={(e) => setTargetStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Target Completion
                </label>
                <input
                  type="date"
                  value={targetCompletionDate}
                  onChange={(e) => setTargetCompletionDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
