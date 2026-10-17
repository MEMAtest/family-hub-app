'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
  FileUp,
  Download,
  CalendarDays,
  Home,
  MapPin,
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

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === 'completed').length,
    [tasks]
  );

  const propertyType = profile.propertyType === 'T'
    ? 'Terraced house'
    : profile.propertyType === 'S'
      ? 'Semi-detached house'
      : profile.propertyType === 'D'
        ? 'Detached house'
        : profile.propertyType === 'F'
          ? 'Flat'
          : 'Home';

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
    <div className="space-y-4">
      <section className="relative min-h-[220px] overflow-hidden rounded-lg bg-slate-900 sm:min-h-[260px]">
        {/* The real property image is the primary signal for this workspace. */}
        <Image
          src="/assets/property/tremaine/21front.jpg"
          alt="Front of 21 Tremaine Road"
          fill
          sizes="(min-width: 1280px) 70vw, 100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/45 to-transparent" />
        <div className="relative flex min-h-[220px] max-w-xl flex-col justify-end p-5 text-white sm:min-h-[260px] sm:p-7">
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-white/15 backdrop-blur-sm">
            <Home className="h-4 w-4" />
          </span>
          <h2 className="text-2xl font-semibold sm:text-3xl">21 Tremaine Road</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85"><MapPin className="h-4 w-4" />{profile.address.replace('21 Tremaine Road, ', '')}</p>
          <p className="mt-1 text-xs text-white/70">{propertyType} · Purchased {profile.purchaseDate ? formatDate(profile.purchaseDate) : 'date not recorded'}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <PropertySectionHeader title="Task status" subtitle={`${completedTasks} of ${tasks.length} marked complete`} />
              <div className="mt-2">
                <TaskStatusPieChart tasks={tasks} height={230} />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <PropertySectionHeader title="Priority breakdown" subtitle="Work grouped by urgency" />
              <div className="mt-2">
                <TaskPriorityBarChart tasks={tasks} height={230} />
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <PropertySectionHeader title="Recent activity" subtitle="Evidence and completed work" />
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentWorkLogs.length === 0 ? (
                <div className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700"><FileText className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Building survey added</p>
                    <p className="text-xs text-slate-500">The source document is available in Documents; no completed work has been logged yet.</p>
                  </div>
                </div>
              ) : recentWorkLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{log.taskTitle}</p>
                    <p className="text-xs text-slate-500">{log.completedBy && `Completed by ${log.completedBy} · `}{formatDate(log.completedDate)}</p>
                    {log.notes && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{log.notes}</p>}
                  </div>
                  {log.cost > 0 && <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{currencyFormatter.format(log.cost)}</span>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {!isReadOnly && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Quick actions</h3>
              <div className="mt-3 grid gap-2">
                <button onClick={onAddTask} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Add task</button>
                <button onClick={onImportSurvey} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-left text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200"><FileUp className="h-4 w-4 text-blue-600" />Import survey PDF</button>
                <button onClick={onExport} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-left text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200"><Download className="h-4 w-4 text-blue-600" />Export property data</button>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Property record</h3>
            <dl className="mt-3 space-y-3 text-xs">
              <div className="flex items-center gap-3"><Home className="h-4 w-4 text-blue-600" /><div><dt className="text-slate-500">Type</dt><dd className="font-medium text-slate-900 dark:text-white">{propertyType}</dd></div></div>
              <div className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-emerald-600" /><div><dt className="text-slate-500">Purchased</dt><dd className="font-medium text-slate-900 dark:text-white">{profile.purchaseDate ? formatDate(profile.purchaseDate) : 'Not recorded'}</dd></div></div>
              <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-violet-600" /><div><dt className="text-slate-500">Documents</dt><dd className="font-medium text-slate-900 dark:text-white">{profile.documents.length} saved</dd></div></div>
            </dl>
          </section>
        </aside>
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
