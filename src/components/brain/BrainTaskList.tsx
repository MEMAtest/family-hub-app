'use client';

import { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Circle, Plus } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { NODE_PRIORITY_CONFIG, NODE_STATUS_CONFIG, type BrainNodePriority, type BrainNodeStatus } from '@/types/brain.types';

const statusOrder: Record<BrainNodeStatus, number> = {
  todo: 0,
  in_progress: 1,
  blocked: 2,
  idea: 3,
  done: 4,
};

const BrainTaskList = () => {
  const {
    nodes,
    createNode,
    updateNode,
    selectNode,
    statusFilter,
    searchQuery,
  } = useBrainContext();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const visibleNodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return nodes
      .filter((node) => (statusFilter ? node.status === statusFilter : true))
      .filter((node) => {
        if (!query) return true;
        return (
          node.title.toLowerCase().includes(query) ||
          (node.content || '').toLowerCase().includes(query) ||
          node.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        const dueA = a.dueDate || '9999-12-31';
        const dueB = b.dueDate || '9999-12-31';
        return dueA.localeCompare(dueB);
      });
  }, [nodes, searchQuery, statusFilter]);

  const addTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || adding) return;

    setAdding(true);
    try {
      await createNode({
        title,
        nodeType: 'task',
        status: 'todo',
        priority: 'medium',
      });
      setNewTaskTitle('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-slate-950">
      <div className="border-b border-gray-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void addTask();
            }}
            placeholder="Add a task..."
            spellCheck
            lang="en-GB"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => void addTask()}
            disabled={!newTaskTitle.trim() || adding}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {visibleNodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No tasks found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {visibleNodes.map((node) => {
                const done = node.status === 'done';
                return (
                  <div key={node.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => void updateNode(node.id, { status: done ? 'todo' : 'done' })}
                      className="self-start rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                      aria-label={done ? 'Mark not done' : 'Mark done'}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => selectNode(node.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through dark:text-slate-500' : 'text-gray-900 dark:text-slate-100'}`}>
                        {node.title}
                      </p>
                      {node.content && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">
                          {node.content}
                        </p>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                      <select
                        value={node.status}
                        onChange={(event) => void updateNode(node.id, { status: event.target.value as BrainNodeStatus })}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {(Object.entries(NODE_STATUS_CONFIG) as [BrainNodeStatus, typeof NODE_STATUS_CONFIG[BrainNodeStatus]][]).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>

                      <select
                        value={node.priority}
                        onChange={(event) => void updateNode(node.id, { priority: event.target.value as BrainNodePriority })}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {(Object.entries(NODE_PRIORITY_CONFIG) as [BrainNodePriority, typeof NODE_PRIORITY_CONFIG[BrainNodePriority]][]).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>

                      <label className="col-span-2 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 sm:col-span-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <input
                          type="date"
                          value={node.dueDate ? node.dueDate.split('T')[0] : ''}
                          onChange={(event) => void updateNode(node.id, {
                            dueDate: event.target.value || null,
                            showOnCalendar: Boolean(event.target.value),
                          })}
                          className="min-w-0 border-0 bg-transparent p-0 text-xs text-gray-700 focus:ring-0 dark:text-slate-200"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrainTaskList;
