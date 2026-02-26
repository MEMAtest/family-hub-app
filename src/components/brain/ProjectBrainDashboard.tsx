'use client'

import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import ProjectSidebar from './ProjectSidebar';
import ProjectOverview from './ProjectOverview';
import MindMapCanvas from './MindMapCanvas';
import BrainFilterBar from './BrainFilterBar';
import NodeDetailPanel from './NodeDetailPanel';
import CreateNodeModal from './CreateNodeModal';
import CreateProjectModal from './CreateProjectModal';
import BrainFloatingActions from './BrainFloatingActions';
import { Plus } from 'lucide-react';

const MobileProjectSelector = () => {
  const { projects, activeProjectId, setActiveProject, setIsCreateProjectOpen } = useBrainContext();
  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 scrollbar-hide dark:border-slate-700 dark:bg-slate-900">
      <button
        onClick={() => setActiveProject(null)}
        className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          !activeProjectId
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
        }`}
      >
        Overview
      </button>
      {activeProjects.map((p) => (
        <button
          key={p.id}
          onClick={() => setActiveProject(p.id)}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeProjectId === p.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
          }`}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}
        </button>
      ))}
      <button
        onClick={() => setIsCreateProjectOpen(true)}
        className="flex-shrink-0 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const ProjectBrainDashboard = () => {
  const { activeProjectId, isLoading } = useBrainContext();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Mobile: horizontal project selector */}
      {!isDesktop && <MobileProjectSelector />}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {isDesktop && <ProjectSidebar />}

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeProjectId ? (
            <>
              <BrainFilterBar />
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    </div>
                  ) : (
                    <MindMapCanvas />
                  )}
                </div>
                {/* Desktop node detail panel */}
                {isDesktop && <NodeDetailPanel />}
              </div>
              {/* Mobile node detail panel (bottom sheet) */}
              {!isDesktop && <NodeDetailPanel />}
            </>
          ) : (
            <ProjectOverview />
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      {!isDesktop && <BrainFloatingActions />}

      {/* Modals */}
      <CreateNodeModal />
      <CreateProjectModal />
    </div>
  );
};

export default ProjectBrainDashboard;
