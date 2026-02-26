'use client'

import { useState } from 'react';
import { X } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { PROJECT_COLORS, PROJECT_ICONS } from '@/types/brain.types';

const CreateProjectModal = () => {
  const { isCreateProjectOpen, setIsCreateProjectOpen, createProject } = useBrainContext();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);
  const [saving, setSaving] = useState(false);

  if (!isCreateProjectOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      });
      setName('');
      setDescription('');
      setColor(PROJECT_COLORS[0]);
      setIcon(PROJECT_ICONS[0]);
      setIsCreateProjectOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">New Project</h3>
        <button
          type="button"
          onClick={() => setIsCreateProjectOpen(false)}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description (optional)"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Color picker */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-slate-400">Colour</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-gray-900 dark:border-white' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-slate-400">Icon</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  icon === i
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-3 dark:border-slate-700" style={{ paddingBottom: isDesktop ? undefined : 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateProjectOpen(false)} />
        <div className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900">
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateProjectOpen(false)} />
      <div className="relative max-h-[85vh] rounded-t-xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
        {formContent}
      </div>
    </div>
  );
};

export default CreateProjectModal;
