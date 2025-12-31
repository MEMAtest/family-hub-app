'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Grid3X3 } from 'lucide-react';
import { PropertySectionHeader } from '../common/PropertySectionHeader';
import type { PropertyTask, PropertyComponent } from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';

// Dynamic import for 3D viewer
const Property3DViewer = dynamic(() => import('../Property3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading 3D viewer...</p>
      </div>
    </div>
  ),
});

const floorLabels: Record<string, string> = {
  cellar: 'Cellar',
  ground: 'Ground Floor',
  first: 'First Floor',
  second: 'Second Floor',
  roof: 'Roof',
  exterior: 'Exterior',
};

interface PropertyDigitalTwinTabProps {
  components: PropertyComponent[];
  tasks: PropertyTask[];
  selectedComponent: string | null;
  onSelectComponent: (componentId: string | null) => void;
}

export const PropertyDigitalTwinTab = ({
  components,
  tasks,
  selectedComponent,
  onSelectComponent,
}: PropertyDigitalTwinTabProps) => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');

  // Group components by floor
  const floors = useMemo(() => {
    const grouped = new Map<string, PropertyComponent[]>();
    components.forEach((component) => {
      const list = grouped.get(component.floor) ?? [];
      grouped.set(component.floor, [...list, component]);
    });
    return Array.from(grouped.entries());
  }, [components]);

  // Calculate stats for each component
  const componentStats = useMemo(() => {
    const stats = new Map<
      string,
      { taskCount: number; lastRepair?: string; nextDue?: string; evidenceCount: number }
    >();

    components.forEach((component) => {
      const relatedTasks = tasks.filter((task) =>
        task.components?.includes(component.id)
      );
      const workLogs = relatedTasks.flatMap((task) => task.workLogs);
      const lastRepair = workLogs
        .map((log) => log.completedDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const nextDue = relatedTasks
        .filter((task) => task.nextDueDate && task.status !== 'completed')
        .map((task) => task.nextDueDate as string)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
      const evidence =
        relatedTasks.reduce(
          (count, task) => count + (task.attachments?.length ?? 0),
          0
        ) +
        workLogs.reduce(
          (count, log) => count + (log.attachments?.length ?? 0),
          0
        );

      stats.set(component.id, {
        taskCount: relatedTasks.length,
        lastRepair,
        nextDue,
        evidenceCount: evidence,
      });
    });

    return stats;
  }, [components, tasks]);

  const selectedComponentData = selectedComponent
    ? components.find((c) => c.id === selectedComponent)
    : null;
  const selectedStats = selectedComponent
    ? componentStats.get(selectedComponent)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Digital Twin Viewer */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <PropertySectionHeader
              title={viewMode === '3d' ? 'Digital Twin (3D Model)' : 'Digital Twin (2D Map)'}
              subtitle="Tap a room or element to view details"
              icon={viewMode === '3d' ? Box : Grid3X3}
            />
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-slate-700">
              <button
                onClick={() => setViewMode('2d')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === '2d'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                2D
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === '3d'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                3D
              </button>
            </div>
          </div>

          <div className="mt-4">
            {viewMode === '3d' ? (
              <Property3DViewer
                components={components}
                tasks={tasks}
                selectedComponent={selectedComponent}
                onSelectComponent={onSelectComponent}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {floors.map(([floor, floorComponents]) => (
                  <div
                    key={floor}
                    className="rounded-xl border border-gray-200 p-3 dark:border-slate-800"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {floorLabels[floor] || floor}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {floorComponents.map((component) => {
                        const stats = componentStats.get(component.id);
                        const isActive = selectedComponent === component.id;
                        return (
                          <button
                            key={component.id}
                            onClick={() =>
                              onSelectComponent(isActive ? null : component.id)
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            {component.label}{' '}
                            {stats?.taskCount ? `(${stats.taskCount})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Component Snapshot Panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PropertySectionHeader
            title="Component Snapshot"
            subtitle="Last repair, next due, evidence"
          />
          <div className="mt-4 space-y-4">
            {selectedComponentData ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {selectedComponentData.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {floorLabels[selectedComponentData.floor] || selectedComponentData.floor}
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Last repair
                    </p>
                    <p>
                      {selectedStats?.lastRepair
                        ? formatDate(selectedStats.lastRepair)
                        : 'No repairs logged'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Next due
                    </p>
                    <p>
                      {selectedStats?.nextDue
                        ? formatDate(selectedStats.nextDue)
                        : 'Not scheduled'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Evidence
                    </p>
                    <p>
                      {selectedStats?.evidenceCount
                        ? `${selectedStats.evidenceCount} file(s)`
                        : 'No evidence yet'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Related tasks
                    </p>
                    <p>{selectedStats?.taskCount || 0} tasks</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Select a component to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
