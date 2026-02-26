'use client'

import { AlertCircle, Clock } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { NODE_STATUS_CONFIG } from '@/types/brain.types';

const TodayFocusPanel = () => {
  const { todayData, setActiveProject, selectNode } = useBrainContext();

  if (!todayData || todayData.total === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
          <Clock className="h-5 w-5 text-blue-500" /> Today&apos;s Focus
        </h3>
        <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
          No brain nodes due today. Well done!
        </p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
          <Clock className="h-5 w-5 text-blue-500" /> Today&apos;s Focus
        </h3>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
          {todayData.total} items
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {todayData.groups.map((group) => (
          <div key={group.project.id}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: group.project.color }}
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                {group.project.name}
              </span>
            </div>
            <div className="space-y-1.5 pl-4">
              {group.nodes.map((node) => {
                const isOverdue = node.dueDate && new Date(node.dueDate) < now;
                const statusCfg = NODE_STATUS_CONFIG[node.status as keyof typeof NODE_STATUS_CONFIG];
                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      setActiveProject(group.project.id);
                      setTimeout(() => selectNode(node.id), 100);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                        {node.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium ${statusCfg?.color || 'text-gray-500'}`}>
                          {statusCfg?.label || node.status}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600">
                            <AlertCircle className="h-3 w-3" /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodayFocusPanel;
