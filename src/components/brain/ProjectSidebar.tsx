'use client'

import { Plus } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';

const ProjectSidebar = () => {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    setIsCreateProjectOpen,
  } = useBrainContext();

  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="flex h-full w-60 flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          Projects
        </h3>
        <button
          onClick={() => setIsCreateProjectOpen(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          title="New project"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* Overview item */}
        <button
          onClick={() => setActiveProject(null)}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
            !activeProjectId
              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/20 dark:text-blue-200'
              : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-gray-400" />
          <span className="truncate">Overview</span>
        </button>

        {activeProjects.map((project) => (
          <button
            key={project.id}
            onClick={() => setActiveProject(project.id)}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
              activeProjectId === project.id
                ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/20 dark:text-blue-200'
                : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <span
              className="flex h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="flex-1 truncate">{project.name}</span>
            {project._count?.nodes != null && (
              <span className="text-[10px] text-gray-400 dark:text-slate-500">
                {project._count.nodes}
              </span>
            )}
          </button>
        ))}

        {activeProjects.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400">No projects yet</p>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Create your first project
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSidebar;
