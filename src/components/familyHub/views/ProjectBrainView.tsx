'use client'

import ProjectBrainDashboard from '@/components/brain/ProjectBrainDashboard';

export const ProjectBrainView = () => (
  <div className="flex min-h-[720px] flex-col overflow-visible">
    <div className="border-b border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Project Brain</h2>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Visual mind maps to organise ideas, tasks, and projects.</p>
    </div>
    <div className="flex-1 overflow-visible">
      <ProjectBrainDashboard />
    </div>
  </div>
);
