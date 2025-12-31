'use client';

import { useMemo, useState } from 'react';
import { Plus, FileUp } from 'lucide-react';
import { TaskFilters, type GroupByOption } from '../tasks/TaskFilters';
import { CollapsibleTaskGroup } from '../tasks/CollapsibleTaskGroup';
import type {
  PropertyTask,
  PropertyTaskStatus,
  PropertyTaskPriority,
  TaskContact,
  TaskQuote,
  TaskScheduledVisit,
  TaskFollowUp,
} from '@/types/property.types';

const priorityOrder: PropertyTaskPriority[] = ['urgent', 'short', 'medium', 'long'];
const statusOrder: PropertyTaskStatus[] = ['outstanding', 'in_progress', 'blocked', 'verify', 'completed'];

const priorityLabels: Record<PropertyTaskPriority, string> = {
  urgent: 'Urgent',
  short: 'Short Term',
  medium: 'Medium Term',
  long: 'Long Term',
};

const statusLabels: Record<PropertyTaskStatus, string> = {
  outstanding: 'Outstanding',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  verify: 'Verify',
  completed: 'Completed',
};

const priorityBadgeColors: Record<PropertyTaskPriority, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  short: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
  long: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
};

const statusBadgeColors: Record<PropertyTaskStatus, string> = {
  outstanding: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  verify: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};

interface PropertyTasksTabProps {
  tasks: PropertyTask[];
  selectedComponent: string | null;
  onClearComponent: () => void;
  onStatusChange: (taskId: string, status: PropertyTaskStatus) => void;
  onAddTask: () => void;
  onImportSurvey: () => void;
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

export const PropertyTasksTab = ({
  tasks,
  selectedComponent,
  onClearComponent,
  onStatusChange,
  onAddTask,
  onImportSurvey,
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
}: PropertyTasksTabProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<GroupByOption>('category');

  const categories = useMemo(() => {
    const unique = new Set(tasks.map((t) => t.category));
    return Array.from(unique).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (selectedComponent) {
      result = result.filter((t) => t.components?.includes(selectedComponent));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.category.toLowerCase().includes(term) ||
          (t.impact || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    return result;
  }, [tasks, selectedComponent, searchTerm, statusFilter, categoryFilter]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, PropertyTask[]>();

    filteredTasks.forEach((task) => {
      const key =
        groupBy === 'category'
          ? task.category
          : groupBy === 'priority'
          ? task.priority
          : task.status;
      const list = groups.get(key) || [];
      groups.set(key, [...list, task]);
    });

    // Sort groups by order
    const sortedGroups = new Map<string, PropertyTask[]>();
    if (groupBy === 'priority') {
      priorityOrder.forEach((p) => {
        if (groups.has(p)) sortedGroups.set(p, groups.get(p)!);
      });
    } else if (groupBy === 'status') {
      statusOrder.forEach((s) => {
        if (groups.has(s)) sortedGroups.set(s, groups.get(s)!);
      });
    } else {
      // Category - alphabetical
      Array.from(groups.keys())
        .sort()
        .forEach((key) => {
          sortedGroups.set(key, groups.get(key)!);
        });
    }

    return sortedGroups;
  }, [filteredTasks, groupBy]);

  const getGroupTitle = (key: string): string => {
    if (groupBy === 'priority') return priorityLabels[key as PropertyTaskPriority] || key;
    if (groupBy === 'status') return statusLabels[key as PropertyTaskStatus] || key;
    return key;
  };

  const getGroupBadgeColor = (key: string): string => {
    if (groupBy === 'priority') return priorityBadgeColors[key as PropertyTaskPriority] || 'bg-gray-100 text-gray-700';
    if (groupBy === 'status') return statusBadgeColors[key as PropertyTaskStatus] || 'bg-gray-100 text-gray-700';
    return 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Task Register
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {filteredTasks.length} of {tasks.length} tasks
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-3">
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
              Import PDF
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <TaskFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        selectedComponent={selectedComponent}
        onClearComponent={onClearComponent}
      />

      {/* Task Groups */}
      <div className="space-y-4">
        {Array.from(groupedTasks.entries()).map(([key, groupTasks]) => (
          <CollapsibleTaskGroup
            key={key}
            title={getGroupTitle(key)}
            tasks={groupTasks}
            defaultExpanded={groupBy === 'priority' && key === 'urgent'}
            badgeColor={getGroupBadgeColor(key)}
            onStatusChange={onStatusChange}
            isReadOnly={isReadOnly}
            onAddContact={onAddContact}
            onUpdateContact={onUpdateContact}
            onRemoveContact={onRemoveContact}
            onAddQuote={onAddQuote}
            onUpdateQuote={onUpdateQuote}
            onRemoveQuote={onRemoveQuote}
            onAddVisit={onAddVisit}
            onUpdateVisit={onUpdateVisit}
            onRemoveVisit={onRemoveVisit}
            onAddFollowUp={onAddFollowUp}
            onUpdateFollowUp={onUpdateFollowUp}
            onRemoveFollowUp={onRemoveFollowUp}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            No tasks match your filters
          </p>
          {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || selectedComponent) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
                onClearComponent();
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
