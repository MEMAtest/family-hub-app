'use client';

import { useMemo, useState } from 'react';
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
  FileUp,
  Download,
} from 'lucide-react';
import { PropertyMetricCard } from '../common/PropertyMetricCard';
import { PropertySectionHeader } from '../common/PropertySectionHeader';
import { TaskStatusPieChart } from '../charts/TaskStatusPieChart';
import { TaskPriorityBarChart } from '../charts/TaskPriorityBarChart';
import { MetricDetailModal, type MetricType } from '../modals/MetricDetailModal';
import type { PropertyTask, PropertyBaseline } from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

interface PropertyOverviewTabProps {
  tasks: PropertyTask[];
  profile: PropertyBaseline;
  isReadOnly?: boolean;
  onAddTask?: () => void;
  onImportSurvey?: () => void;
  onExport?: () => void;
  onViewTask?: (task: PropertyTask) => void;
}

export const PropertyOverviewTab = ({
  tasks,
  profile,
  isReadOnly = false,
  onAddTask,
  onImportSurvey,
  onExport,
  onViewTask,
}: PropertyOverviewTabProps) => {
  const now = useMemo(() => new Date(), []);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<MetricType>('outstanding');

  const outstandingTasks = useMemo(
    () => tasks.filter((t) => t.status === 'outstanding'),
    [tasks]
  );

  const dueSoonTasks = useMemo(() => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    return tasks.filter((task) => {
      if (!task.nextDueDate || task.status === 'completed') return false;
      const due = new Date(task.nextDueDate);
      return due >= now && due <= soon;
    });
  }, [tasks, now]);

  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.nextDueDate || task.status === 'completed') return false;
        return new Date(task.nextDueDate) < now;
      }),
    [tasks, now]
  );

  const tasksWithSpend = useMemo(
    () =>
      tasks.filter((task) =>
        task.workLogs.some((log) => log.cost > 0)
      ),
    [tasks]
  );

  const totalSpent = useMemo(
    () =>
      tasks.reduce(
        (sum, task) =>
          sum + task.workLogs.reduce((total, log) => total + (log.cost || 0), 0),
        0
      ),
    [tasks]
  );

  const tasksWithEvidence = useMemo(
    () =>
      tasks.filter((task) =>
        (task.attachments?.length || 0) > 0 ||
        task.workLogs.some((log) => (log.attachments?.length || 0) > 0)
      ),
    [tasks]
  );

  const evidenceCount = useMemo(() => {
    const taskAttachments = tasks.reduce(
      (count, task) => count + (task.attachments?.length ?? 0),
      0
    );
    const logAttachments = tasks.reduce(
      (count, task) =>
        count +
        task.workLogs.reduce(
          (total, log) => total + (log.attachments?.length ?? 0),
          0
        ),
      0
    );
    const baselineDocs = profile.documents?.length ?? 0;
    return taskAttachments + logAttachments + baselineDocs;
  }, [tasks, profile.documents]);

  const recentWorkLogs = useMemo(() => {
    const allLogs = tasks.flatMap((task) =>
      task.workLogs.map((log) => ({
        ...log,
        taskTitle: task.title,
        taskId: task.id,
      }))
    );
    return allLogs
      .sort(
        (a, b) =>
          new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
      )
      .slice(0, 5);
  }, [tasks]);

  const handleMetricClick = (type: MetricType) => {
    setModalType(type);
    setModalOpen(true);
  };

  const getModalTasks = (): PropertyTask[] => {
    switch (modalType) {
      case 'outstanding':
        return outstandingTasks;
      case 'due-soon':
        return dueSoonTasks;
      case 'overdue':
        return overdueTasks;
      case 'spent':
        return tasksWithSpend;
      case 'evidence':
        return tasksWithEvidence;
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PropertyMetricCard
          label="Outstanding"
          value={outstandingTasks.length}
          subtitle="Tasks still open"
          icon={ClipboardList}
          iconColor="text-amber-500"
          onClick={() => handleMetricClick('outstanding')}
        />
        <PropertyMetricCard
          label="Due soon"
          value={dueSoonTasks.length}
          subtitle="Next 14 days"
          icon={Clock}
          iconColor="text-orange-500"
          onClick={() => handleMetricClick('due-soon')}
        />
        <PropertyMetricCard
          label="Overdue"
          value={overdueTasks.length}
          subtitle="Needs attention"
          icon={AlertTriangle}
          iconColor="text-red-500"
          onClick={() => handleMetricClick('overdue')}
        />
        <PropertyMetricCard
          label="Total spent"
          value={currencyFormatter.format(totalSpent)}
          subtitle="Logged work costs"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          onClick={() => handleMetricClick('spent')}
        />
        <PropertyMetricCard
          label="Evidence"
          value={evidenceCount}
          subtitle="Docs and photos"
          icon={FileText}
          iconColor="text-blue-500"
          onClick={() => handleMetricClick('evidence')}
        />
      </div>

      {/* Quick Actions */}
      {!isReadOnly && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
          <button
            onClick={onImportSurvey}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <FileUp className="h-4 w-4" />
            Import Survey PDF
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PropertySectionHeader
            title="Task Status"
            subtitle="Distribution by status"
          />
          <div className="mt-4">
            <TaskStatusPieChart tasks={tasks} height={280} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PropertySectionHeader
            title="Priority Breakdown"
            subtitle="Tasks by urgency level"
          />
          <div className="mt-4">
            <TaskPriorityBarChart tasks={tasks} height={280} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <PropertySectionHeader
          title="Recent Activity"
          subtitle="Latest work completed"
        />
        <div className="mt-4">
          {recentWorkLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No work logged yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentWorkLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between rounded-lg border border-gray-100 p-3 dark:border-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {log.taskTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {log.completedBy && `Completed by ${log.completedBy} • `}
                      {formatDate(log.completedDate)}
                    </p>
                    {log.notes && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                        {log.notes}
                      </p>
                    )}
                  </div>
                  {log.cost > 0 && (
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {currencyFormatter.format(log.cost)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric Detail Modal */}
      <MetricDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        tasks={getModalTasks()}
        onViewTask={onViewTask}
      />
    </div>
  );
};
