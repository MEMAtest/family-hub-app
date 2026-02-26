'use client'

import { useEffect, useState } from 'react';
import { Brain, AlertCircle, ChevronRight } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { useAppView } from '@/contexts/familyHub/AppViewContext';

interface TodayNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface TodayGroup {
  project: { id: string; name: string; color: string };
  nodes: TodayNode[];
}

interface TodayData {
  total: number;
  groups: TodayGroup[];
}

const BrainFocusWidget = () => {
  const familyId = useFamilyStore((s) => s.databaseStatus.familyId);
  const setActiveBrainProject = useFamilyStore((s) => s.setActiveBrainProject);
  const { setView } = useAppView();
  const [data, setData] = useState<TodayData | null>(null);

  useEffect(() => {
    if (!familyId) return;
    const controller = new AbortController();
    fetch(`/api/families/${familyId}/brain/today`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
    return () => controller.abort();
  }, [familyId]);

  const handleNodeClick = (projectId: string) => {
    setActiveBrainProject(projectId);
    setView('brain');
  };

  if (!data || data.total === 0) return null;

  const now = new Date();
  const allNodes = data.groups.flatMap((g) =>
    g.nodes.map((n) => ({ ...n, projectColor: g.project.color, projectId: g.project.id, projectName: g.project.name }))
  );
  const displayNodes = allNodes.slice(0, 5);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
          <Brain className="h-5 w-5 text-indigo-500" /> Today&apos;s Focus
        </h3>
        <button
          onClick={() => setView('brain')}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {displayNodes.map((node) => {
          const isOverdue = node.dueDate && new Date(node.dueDate) < now;
          return (
            <button
              key={node.id}
              onClick={() => handleNodeClick(node.projectId)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: node.projectColor }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                  {node.title}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">{node.projectName}</p>
              </div>
              {isOverdue && (
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {data.total > 5 && (
        <p className="mt-2 text-center text-xs text-gray-400">
          +{data.total - 5} more items
        </p>
      )}
    </div>
  );
};

export default BrainFocusWidget;
