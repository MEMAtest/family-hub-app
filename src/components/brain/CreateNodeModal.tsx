'use client'

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { NODE_STATUS_CONFIG, NODE_PRIORITY_CONFIG, type BrainNodeStatus, type BrainNodePriority, type BrainNodeType } from '@/types/brain.types';
import { BrainTitleField, BrainContentField } from './BrainWritingFields';
import { useBrainWritingAssist } from './useBrainWritingAssist';

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
  const [content, setContent] = useState('');
  const [nodeType, setNodeType] = useState<BrainNodeType>('note');
  const [status, setStatus] = useState<BrainNodeStatus>('todo');
  const [priority, setPriority] = useState<BrainNodePriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const assist = useBrainWritingAssist({ identity: isCreateNodeOpen ? 'create-open' : 'create-closed', enabled: isCreateNodeOpen && !saving, title, content, nodeType, onTitle: setTitle, onContent: setContent });

  if (!isCreateNodeOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = content.trim();
    const derivedTitle =
      title.trim() ||
      (trimmedContent
        ? trimmedContent.split('\n')[0].slice(0, 90)
        : '');
    if (!derivedTitle) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createNode({
        title: derivedTitle,
        content: trimmedContent || undefined,
        nodeType,
        status,
        priority,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setContent('');
      setNodeType('note');
      setStatus('todo');
      setPriority('medium');
      setDueDate('');
      setIsCreateNodeOpen(false);
    } catch (error) {
      console.warn('Failed to create brain node:', error);
      setSaveError('Could not save this item. Your draft is still here.');
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{nodeType === 'task' ? 'Add Task' : 'Add Note'}</h3>
        <button
          type="button"
          aria-label="Close note"
          onClick={() => setIsCreateNodeOpen(false)}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Title</label>
          <BrainTitleField assist={assist} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Type</label>
            <select
              aria-label="Item type"
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

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Note</label>
          <BrainContentField
            assist={assist}
            rows={7}
            placeholder="Write the note, checklist, or linked thought..."
          />
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
          disabled={!(title.trim() || content.trim()) || saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Creating...' : nodeType === 'task' ? 'Create Task' : 'Create Note'}
        </button>
        {saveError && <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-300">{saveError}</p>}
      </div>
    </form>
  );

  // Desktop: centered modal
  if (isDesktop) {
    return createPortal(
      <div role="dialog" aria-modal="true" aria-label="Add note" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateNodeOpen(false)} />
        <div className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900">
          {formContent}
        </div>
      </div>, document.body
    );
  }

  // Mobile: bottom sheet
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Add note" className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={() => setIsCreateNodeOpen(false)} />
      <div className="relative flex max-h-[90dvh] min-h-0 flex-col overflow-hidden rounded-t-lg bg-white dark:bg-slate-900 shadow-xl">
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
        {formContent}
      </div>
    </div>, document.body
  );
};

export default CreateNodeModal;
