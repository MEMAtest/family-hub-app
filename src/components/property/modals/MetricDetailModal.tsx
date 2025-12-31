'use client';

import { X, ExternalLink, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import type { PropertyTask, PropertyTaskStatus, PropertyTaskPriority } from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';

const statusStyles: Record<PropertyTaskStatus, string> = {
  outstanding: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  blocked: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-200',
  verify: 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
};

const priorityStyles: Record<PropertyTaskPriority, string> = {
  urgent: 'text-red-600 dark:text-red-400',
  short: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  long: 'text-slate-600 dark:text-slate-400',
};

export type MetricType = 'outstanding' | 'due-soon' | 'overdue' | 'evidence' | 'spent';

interface MetricDetailModalProps {
  open: boolean;
  onClose: () => void;
  type: MetricType;
  tasks: PropertyTask[];
  onViewTask?: (task: PropertyTask) => void;
}

const getModalConfig = (type: MetricType) => {
  switch (type) {
    case 'outstanding':
      return {
        title: 'Outstanding Tasks',
        icon: CheckCircle2,
        iconColor: 'text-amber-500',
        emptyMessage: 'No outstanding tasks',
      };
    case 'due-soon':
      return {
        title: 'Due Soon',
        icon: Clock,
        iconColor: 'text-orange-500',
        emptyMessage: 'No tasks due in the next 14 days',
      };
    case 'overdue':
      return {
        title: 'Overdue Tasks',
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        emptyMessage: 'No overdue tasks - great job!',
      };
    case 'evidence':
      return {
        title: 'Evidence & Documents',
        icon: CheckCircle2,
        iconColor: 'text-blue-500',
        emptyMessage: 'No evidence recorded yet',
      };
    case 'spent':
      return {
        title: 'Cost Summary',
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
        emptyMessage: 'No costs logged yet',
      };
    default:
      return {
        title: 'Tasks',
        icon: CheckCircle2,
        iconColor: 'text-gray-500',
        emptyMessage: 'No tasks found',
      };
  }
};

const getDaysOverdue = (dueDate: string) => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getDaysUntilDue = (dueDate: string) => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

export const MetricDetailModal = ({
  open,
  onClose,
  type,
  tasks,
  onViewTask,
}: MetricDetailModalProps) => {
  if (!open) return null;

  const config = getModalConfig(type);
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {config.title}
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-300">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {tasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {config.emptyMessage}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-slate-100 line-clamp-2">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-medium ${priorityStyles[task.priority]}`}>
                          {task.priority === 'urgent' ? 'Urgent' : task.priority === 'short' ? 'Short term' : task.priority === 'medium' ? 'Medium term' : 'Long term'}
                        </span>
                      </div>

                      {/* Due date info */}
                      {task.nextDueDate && type !== 'evidence' && type !== 'spent' && (
                        <div className="mt-2 text-xs">
                          {type === 'overdue' ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {getDaysOverdue(task.nextDueDate)} days overdue
                            </span>
                          ) : type === 'due-soon' ? (
                            <span className="text-orange-600 dark:text-orange-400">
                              Due in {getDaysUntilDue(task.nextDueDate)} days ({formatDate(task.nextDueDate)})
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-slate-400">
                              Due: {formatDate(task.nextDueDate)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Cost info for spent type */}
                      {type === 'spent' && task.workLogs.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {currencyFormatter.format(
                              task.workLogs.reduce((sum, log) => sum + (log.cost || 0), 0)
                            )}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">
                            ({task.workLogs.length} work log{task.workLogs.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      )}

                      {/* Evidence count for evidence type */}
                      {type === 'evidence' && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                          {(task.attachments?.length || 0) + task.workLogs.reduce((sum, log) => sum + (log.attachments?.length || 0), 0)} attachments
                        </div>
                      )}
                    </div>

                    {onViewTask && (
                      <button
                        onClick={() => {
                          onViewTask(task);
                          onClose();
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
