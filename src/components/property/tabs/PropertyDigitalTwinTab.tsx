'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Box, CheckCircle2, Grid3X3, PoundSterling } from 'lucide-react';
import { PropertySectionHeader } from '../common/PropertySectionHeader';
import type { PropertyTask, PropertyComponent } from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';

// Dynamic import for 3D viewer
const Property3DViewer = dynamic(() => import('../Property3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
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
  const [focusFloor, setFocusFloor] = useState('all');

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
  const selectedTasks = useMemo(
    () => selectedComponent
      ? tasks.filter((task) => task.components?.includes(selectedComponent))
      : [],
    [selectedComponent, tasks]
  );
  const selectedEstimate = selectedTasks
    .filter((task) => task.status !== 'completed' && task.defaultCostRange)
    .reduce((total, task) => ({
      min: total.min + (task.defaultCostRange?.min ?? 0),
      max: total.max + (task.defaultCostRange?.max ?? 0),
    }), { min: 0, max: 0 });
  const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  const floorOptions = ['all', 'exterior', 'roof', 'second', 'first', 'ground', 'cellar'];

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,.6fr)]">
        {/* Digital Twin Viewer */}
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <PropertySectionHeader
              title={viewMode === '3d' ? '21 Tremaine Road model' : 'Tremaine component map'}
              subtitle="Photo-referenced exterior with survey findings mapped to building elements"
              icon={viewMode === '3d' ? Box : Grid3X3}
            />
            <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1 dark:border-slate-700">
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

          <div className="scrollbar-hide mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-700" aria-label="Model floor">
            {floorOptions.map((floor) => {
              const count = floor === 'all' ? components.length : components.filter((component) => component.floor === floor).length;
              return (
                <button key={floor} type="button" onClick={() => setFocusFloor(floor)} className={`min-h-9 shrink-0 rounded-md px-3 text-xs font-semibold ${focusFloor === floor ? 'bg-slate-900 text-white dark:bg-blue-600' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                  {floor === 'all' ? 'Whole house' : floorLabels[floor] || floor} <span className="opacity-65">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 min-w-0">
            {viewMode === '3d' ? (
              <Property3DViewer
                components={components}
                tasks={tasks}
                selectedComponent={selectedComponent}
                onSelectComponent={onSelectComponent}
                focusFloor={focusFloor}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {floors.filter(([floor]) => focusFloor === 'all' || floor === focusFloor).map(([floor, floorComponents]) => (
                  <div
                    key={floor}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
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
        </section>

        {/* Component Snapshot Panel */}
        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <PropertySectionHeader
            title="Selected element"
            subtitle="Condition, actions and likely cost"
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
                <div className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
                  <div className="bg-white p-3 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Last repair
                    </p>
                    <p>
                      {selectedStats?.lastRepair
                        ? formatDate(selectedStats.lastRepair)
                        : 'No repairs logged'}
                    </p>
                  </div>
                  <div className="bg-white p-3 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Next due
                    </p>
                    <p>
                      {selectedStats?.nextDue
                        ? formatDate(selectedStats.nextDue)
                        : 'Not scheduled'}
                    </p>
                  </div>
                  <div className="bg-white p-3 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Evidence
                    </p>
                    <p>
                      {selectedStats?.evidenceCount
                        ? `${selectedStats.evidenceCount} file(s)`
                        : 'No evidence yet'}
                    </p>
                  </div>
                  <div className="bg-white p-3 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Related tasks
                    </p>
                    <p>{selectedStats?.taskCount || 0} tasks</p>
                  </div>
                </div>
                {selectedEstimate.max > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <PoundSterling className="mt-0.5 h-4 w-4 shrink-0" />
                    <div><p className="font-semibold">{money.format(selectedEstimate.min)}–{money.format(selectedEstimate.max)}</p><p className="text-xs opacity-80">Likely remaining app estimate for this element</p></div>
                  </div>
                )}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-start gap-2 py-3 text-xs">
                      {task.status === 'completed' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${task.priority === 'urgent' ? 'text-rose-600' : 'text-amber-500'}`} />}
                      <div><p className="font-semibold text-slate-900 dark:text-white">{task.title}</p><p className="mt-1 text-slate-500">{task.status === 'completed' ? 'Recorded complete' : task.status === 'verify' ? 'Needs completion evidence' : task.timeframe}</p></div>
                    </div>
                  ))}
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
          <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-700">
            Model basis: front and rear property photos plus the survey component map. Room positions are indicative until measured floor plans are added.
          </p>
        </aside>
      </div>
    </div>
  );
};
