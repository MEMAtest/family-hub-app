'use client'

import { useState } from 'react';
import { X } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { NODE_STATUS_CONFIG, NODE_PRIORITY_CONFIG, type BrainNodeStatus, type BrainNodePriority, type BrainNodeType } from '@/types/brain.types';

const NODE_TYPES: { value: BrainNodeType; label: string }[] = [
  { value: 'thought', label: 'Thought' },
  { value: 'task', label: 'Task' },
  { value: 'idea', label: 'Idea' },
  { value: 'note', label: 'Note' },
  { value: 'milestone', label: 'Milestone' },
];

const CreateNodeModal = () => {
  const { isCreateNodeOpen, setIsCreateNodeOpen, createNode } = useBrainContext();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [title, setTitle] = useState('');
  const [nodeType, setNodeType] = useState<BrainNodeType>('thought');
  const [status, setStatus] = useState<BrainNodeStatus>('todo');
  const [priority, setPriority] = useState<BrainNodePriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isCreateNodeOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createNode({
        title: title.trim(),
        nodeType,
        status,
        priority,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setNodeType('thought');
      setStatus('todo');
      setPriority('medium');
      setDueDate('');
      setIsCreateNodeOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Add Node</h3>
        <button
          type="button"
          onClick={() => setIsCreateNodeOpen(false)}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            autoFocus
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Type</label>
            <select
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value as BrainNodeType)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {NODE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BrainNodeStatus)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {(Object.entries(NODE_STATUS_CONFIG) as [BrainNodeStatus, typeof NODE_STATUS_CONFIG[BrainNodeStatus]][]).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as BrainNodePriority)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {(Object.entries(NODE_PRIORITY_CONFIG) as [BrainNodePriority, typeof NODE_PRIORITY_CONFIG[BrainNodePriority]][]).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-3 dark:border-slate-700" style={{ paddingBottom: isDesktop ? undefined : 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <button
          type="submit"
          disabled={!title.trim() || saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Node'}
        </button>
      </div>
    </form>
  );

  // Desktop: centered modal
  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateNodeOpen(false)} />
        <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-900">
          {formContent}
        </div>
      </div>
    );
  }

  // Mobile: bottom sheet
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateNodeOpen(false)} />
      <div className="relative rounded-t-xl bg-white dark:bg-slate-900 shadow-xl">
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
        {formContent}
      </div>
    </div>
  );
};

export default CreateNodeModal;
