'use client';

import { useState, useCallback } from 'react';
import { PropertySectionHeader } from '../common/PropertySectionHeader';
import { TaskStatusPieChart } from '../charts/TaskStatusPieChart';
import { TaskPriorityBarChart } from '../charts/TaskPriorityBarChart';
import { CostTrackingChart } from '../charts/CostTrackingChart';
import { TaskCompletionTrend } from '../charts/TaskCompletionTrend';
import { MaintenanceGantt } from '../charts/MaintenanceGantt';
import { PropertyValueChart } from '../charts/PropertyValueChart';
import type { PropertyTask, PropertyValueEntry, PropertyBaseline, PropertyTaskStatus, PropertyTaskPriority } from '@/types/property.types';
import {
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Calendar,
  Wallet,
  Home,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface PropertyAnalyticsTabProps {
  tasks: PropertyTask[];
  values: PropertyValueEntry[];
  profile: PropertyBaseline;
  onTaskClick?: (task: PropertyTask) => void;
}

const statusLabels: Record<PropertyTaskStatus, string> = {
  outstanding: 'Outstanding',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  verify: 'Verify',
  completed: 'Completed',
};

const priorityLabels: Record<PropertyTaskPriority, string> = {
  urgent: 'Urgent',
  short: 'Short term',
  medium: 'Medium term',
  long: 'Long term',
};

const priorityColors: Record<PropertyTaskPriority, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  short: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  long: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const statusIcons: Record<PropertyTaskStatus, typeof AlertCircle> = {
  outstanding: AlertCircle,
  in_progress: Clock,
  blocked: AlertCircle,
  verify: CheckCircle2,
  completed: CheckCircle2,
};

export const PropertyAnalyticsTab = ({
  tasks,
  values,
  profile,
  onTaskClick,
}: PropertyAnalyticsTabProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState<PropertyTask[]>([]);
  const [filterLabel, setFilterLabel] = useState('');

  const handleStatusClick = useCallback((status: PropertyTaskStatus, tasks: PropertyTask[]) => {
    setFilteredTasks(tasks);
    setFilterLabel(`${statusLabels[status]} Tasks`);
    setModalOpen(true);
  }, []);

  const handlePriorityClick = useCallback((priority: PropertyTaskPriority, tasks: PropertyTask[]) => {
    setFilteredTasks(tasks);
    setFilterLabel(`${priorityLabels[priority]} Tasks`);
    setModalOpen(true);
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setFilteredTasks([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Row - Status & Priority */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PropertySectionHeader
            title="Task Status Distribution"
            subtitle="Overview of all tasks by current status"
            icon={PieChartIcon}
          />
          <div className="mt-4">
            <TaskStatusPieChart tasks={tasks} height={280} onSegmentClick={handleStatusClick} />
          </div>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-slate-400">
            Click a segment to view tasks
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PropertySectionHeader
            title="Priority Breakdown"
            subtitle="Tasks grouped by urgency level"
            icon={BarChart3}
          />
          <div className="mt-4">
            <TaskPriorityBarChart tasks={tasks} height={280} onBarClick={handlePriorityClick} />
          </div>
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-slate-400">
            Click a bar to view tasks
          </p>
        </div>
      </div>

      {/* Middle Row - Completion Trend & Cost Tracking */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PropertySectionHeader
            title="Completion Trend"
            subtitle="Tasks completed over time"
            icon={TrendingUp}
          />
          <div className="mt-4">
            <TaskCompletionTrend tasks={tasks} height={280} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PropertySectionHeader
            title="Cost by Category"
            subtitle="Actual spend vs estimated by category"
            icon={Wallet}
          />
          <div className="mt-4">
            <CostTrackingChart tasks={tasks} height={280} />
          </div>
        </div>
      </div>

      {/* Maintenance Timeline */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <PropertySectionHeader
          title="Maintenance Schedule"
          subtitle="Upcoming maintenance tasks timeline"
          icon={Calendar}
        />
        <div className="mt-4">
          <MaintenanceGantt tasks={tasks} height={350} />
        </div>
      </div>

      {/* Property Value */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <PropertySectionHeader
          title="Property Value Tracking"
          subtitle="Historical property valuations"
          icon={Home}
        />
        <div className="mt-4">
          <PropertyValueChart values={values} profile={profile} height={280} />
        </div>
      </div>

      {/* Filtered Tasks Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {filterLabel}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {filteredTasks.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-slate-400">No tasks found</p>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const StatusIcon = statusIcons[task.status];
                    return (
                      <div
                        key={task.id}
                        className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        onClick={() => {
                          if (onTaskClick) {
                            onTaskClick(task);
                            closeModal();
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <StatusIcon className="h-5 w-5 mt-0.5 text-gray-400 dark:text-slate-500" />
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-slate-100">
                                {task.title}
                              </h4>
                              {task.impact && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
                                  {task.impact}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
                                  {priorityLabels[task.priority]}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                  {statusLabels[task.status]}
                                </span>
                                {task.category && (
                                  <span className="text-xs text-gray-400 dark:text-slate-500">
                                    • {task.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {task.defaultCostRange && (
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100 whitespace-nowrap">
                              £{task.defaultCostRange.min.toLocaleString()} - £{task.defaultCostRange.max.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 dark:border-slate-700">
              <button
                onClick={closeModal}
                className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
