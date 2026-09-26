'use client'

import { useState } from 'react';
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
import BrainTaskList from './BrainTaskList';
import BrainNotesView from './BrainNotesView';
import { FileText, GitBranch, ListChecks, Plus } from 'lucide-react';

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
  const [mode, setMode] = useState<'notes' | 'map' | 'tasks'>('notes');

  return (
    <div className="flex min-h-[680px] flex-col overflow-visible">
      {/* Mobile: horizontal project selector */}
      {!isDesktop && <MobileProjectSelector />}

      <div className="flex flex-1 overflow-visible">
        {/* Desktop sidebar */}
        {isDesktop && <ProjectSidebar />}

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-visible">
          {activeProjectId ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setMode('notes')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      mode === 'notes'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                        : 'text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('map')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      mode === 'map'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                        : 'text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
                    }`}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('tasks')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      mode === 'tasks'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                        : 'text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
                    }`}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    Tasks
                  </button>
                </div>
              </div>
              <BrainFilterBar />
              <div className={`flex flex-1 ${mode === 'notes' ? 'overflow-visible' : 'overflow-hidden'}`}>
                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    </div>
                  ) : mode === 'notes' ? (
                    <BrainNotesView />
                  ) : mode === 'tasks' ? (
                    <BrainTaskList />
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
