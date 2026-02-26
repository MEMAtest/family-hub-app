'use client'

import { Plus } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { NODE_STATUS_CONFIG } from '@/types/brain.types';
import TodayFocusPanel from './TodayFocusPanel';

const ProjectOverview = () => {
  const { projects, setActiveProject, setIsCreateProjectOpen } = useBrainContext();

  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="space-y-6 overflow-y-auto p-3 sm:p-4 lg:p-6">
      {/* Today's Focus */}
      <TodayFocusPanel />

      {/* Project cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Projects</h3>
          <button
            onClick={() => setIsCreateProjectOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">No projects yet</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Create your first project to start organising ideas visually.
            </p>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => setActiveProject(project.id)}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: project.color }}
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <span>{project._count?.nodes ?? 0} nodes</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectOverview;
