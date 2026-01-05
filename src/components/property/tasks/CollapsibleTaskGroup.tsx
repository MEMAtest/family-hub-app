'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  PropertyTask,
  PropertyTaskStatus,
  PropertyTaskPriority,
  TaskContact,
  TaskQuote,
  TaskScheduledVisit,
  TaskFollowUp,
} from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';
import { TaskCRMPanel } from './TaskCRMPanel';

const statusLabels: Record<PropertyTaskStatus, string> = {
  outstanding: 'Outstanding',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  verify: 'Verify',
  completed: 'Completed',
};

const statusStyles: Record<PropertyTaskStatus, string> = {
  outstanding: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/40',
  blocked: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/40',
  verify: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/40',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40',
};

const priorityLabels: Record<PropertyTaskPriority, string> = {
  urgent: 'Urgent',
  short: 'Short term',
  medium: 'Medium term',
  long: 'Long term',
};

const priorityStyles: Record<PropertyTaskPriority, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/40',
  short: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/40',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/40',
  long: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/40',
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

interface CollapsibleTaskGroupProps {
  title: string;
  tasks: PropertyTask[];
  defaultExpanded?: boolean;
  badgeColor?: string;
  onTaskClick?: (task: PropertyTask) => void;
  onStatusChange?: (taskId: string, status: PropertyTaskStatus) => void;
  isReadOnly?: boolean;
  // CRM Actions
  onAddContact?: (taskId: string, contact: TaskContact) => void;
  onUpdateContact?: (taskId: string, contactId: string, updates: Partial<TaskContact>) => void;
  onRemoveContact?: (taskId: string, contactId: string) => void;
  onAddQuote?: (taskId: string, quote: TaskQuote) => void;
  onUpdateQuote?: (taskId: string, quoteId: string, updates: Partial<TaskQuote>) => void;
  onRemoveQuote?: (taskId: string, quoteId: string) => void;
  onAddVisit?: (taskId: string, visit: TaskScheduledVisit) => void;
  onUpdateVisit?: (taskId: string, visitId: string, updates: Partial<TaskScheduledVisit>) => void;
  onRemoveVisit?: (taskId: string, visitId: string) => void;
  onAddFollowUp?: (taskId: string, followUp: TaskFollowUp) => void;
  onUpdateFollowUp?: (taskId: string, followUpId: string, updates: Partial<TaskFollowUp>) => void;
  onRemoveFollowUp?: (taskId: string, followUpId: string) => void;
}

export const CollapsibleTaskGroup = ({
  title,
  tasks,
  defaultExpanded = false,
  badgeColor = 'bg-gray-100 text-gray-700',
  onTaskClick,
  onStatusChange,
  isReadOnly = false,
  onAddContact,
  onUpdateContact,
  onRemoveContact,
  onAddQuote,
  onUpdateQuote,
  onRemoveQuote,
  onAddVisit,
  onUpdateVisit,
  onRemoveVisit,
  onAddFollowUp,
  onUpdateFollowUp,
  onRemoveFollowUp,
}: CollapsibleTaskGroupProps) => {
  const hasCRMActions = onAddContact && onUpdateContact && onRemoveContact &&
    onAddQuote && onUpdateQuote && onRemoveQuote &&
    onAddVisit && onUpdateVisit && onRemoveVisit &&
    onAddFollowUp && onUpdateFollowUp && onRemoveFollowUp;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900 dark:text-slate-100">{title}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
            {tasks.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Task List */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
          {tasks.map((task) => {
            const isTaskExpanded = expandedTaskId === task.id;
            const costRange = task.defaultCostRange;

            return (
              <div key={task.id} className="bg-white dark:bg-slate-900">
                {/* Task Row */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedTaskId(isTaskExpanded ? null : task.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityStyles[task.priority]}`}>
                        {priorityLabels[task.priority]}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles[task.status]}`}>
                        {statusLabels[task.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {costRange && (
                      <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {currencyFormatter.format(costRange.min)} - {currencyFormatter.format(costRange.max)}
                      </span>
                    )}
                    {isTaskExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Task Details */}
                {isTaskExpanded && (
                  <div className="px-4 pb-4 space-y-3 bg-gray-50/50 dark:bg-slate-800/30">
                    {task.surveyEvidence && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Survey Evidence</p>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 italic break-words whitespace-pre-wrap">
                          &ldquo;{task.surveyEvidence}&rdquo;
                        </p>
                      </div>
                    )}
                    {task.impact && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Impact</p>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 break-words">{task.impact}</p>
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {task.nextDueDate && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Due Date</p>
                          <p className="text-sm text-gray-700 dark:text-slate-300 mt-1">
                            {formatDate(task.nextDueDate)}
                          </p>
                        </div>
                      )}
                      {task.recommendedContractor && (
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Contractor</p>
                          <p className="text-sm text-gray-700 dark:text-slate-300 mt-1">
                            {task.recommendedContractor}
                          </p>
                        </div>
                      )}
                    </div>
                    {!isReadOnly && onStatusChange && (
                      <div className="flex items-center gap-2 pt-2">
                        <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                          Status:
                        </label>
                        <select
                          value={task.status}
                          onChange={(e) => onStatusChange(task.id, e.target.value as PropertyTaskStatus)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* CRM Panel - only show for non-completed tasks when CRM actions are provided */}
                    {hasCRMActions && task.status !== 'completed' && (
                      <TaskCRMPanel
                        task={task}
                        isReadOnly={isReadOnly}
                        onAddContact={(contact) => onAddContact(task.id, contact)}
                        onUpdateContact={(contactId, updates) => onUpdateContact(task.id, contactId, updates)}
                        onRemoveContact={(contactId) => onRemoveContact(task.id, contactId)}
                        onAddQuote={(quote) => onAddQuote(task.id, quote)}
                        onUpdateQuote={(quoteId, updates) => onUpdateQuote(task.id, quoteId, updates)}
                        onRemoveQuote={(quoteId) => onRemoveQuote(task.id, quoteId)}
                        onAddVisit={(visit) => onAddVisit(task.id, visit)}
                        onUpdateVisit={(visitId, updates) => onUpdateVisit(task.id, visitId, updates)}
                        onRemoveVisit={(visitId) => onRemoveVisit(task.id, visitId)}
                        onAddFollowUp={(followUp) => onAddFollowUp(task.id, followUp)}
                        onUpdateFollowUp={(followUpId, updates) => onUpdateFollowUp(task.id, followUpId, updates)}
                        onRemoveFollowUp={(followUpId) => onRemoveFollowUp(task.id, followUpId)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
