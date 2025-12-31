'use client';

import { useMemo } from 'react';
import type { PropertyTask, PropertyTaskPriority } from '@/types/property.types';

const priorityColors: Record<PropertyTaskPriority, string> = {
  urgent: 'bg-red-500',
  short: 'bg-orange-500',
  medium: 'bg-yellow-500',
  long: 'bg-slate-400',
};

interface MaintenanceGanttProps {
  tasks: PropertyTask[];
  height?: number;
}

export const MaintenanceGantt = ({ tasks, height = 300 }: MaintenanceGanttProps) => {
  const { scheduledTasks, timeRange } = useMemo(() => {
    const now = new Date();
    const scheduled = tasks
      .filter((task) => task.nextDueDate && task.status !== 'completed')
      .map((task) => ({
        ...task,
        dueDate: new Date(task.nextDueDate!),
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 10);

    // Calculate time range (now to 6 months from now)
    const startDate = new Date(now);
    startDate.setDate(1); // Start of current month
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 6);

    return {
      scheduledTasks: scheduled,
      timeRange: { start: startDate, end: endDate },
    };
  }, [tasks]);

  const months = useMemo(() => {
    const result = [];
    const current = new Date(timeRange.start);
    while (current <= timeRange.end) {
      result.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }, [timeRange]);

  const getPositionPercent = (date: Date): number => {
    const totalDays = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (date.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, (daysSinceStart / totalDays) * 100));
  };

  if (scheduledTasks.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        No scheduled maintenance tasks
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ height }}>
      {/* Month Headers */}
      <div className="relative h-6 border-b border-gray-200 dark:border-slate-700">
        {months.map((month, i) => (
          <div
            key={i}
            className="absolute text-xs text-gray-500 dark:text-slate-400"
            style={{ left: `${getPositionPercent(month)}%` }}
          >
            {month.toLocaleDateString('en-GB', { month: 'short' })}
          </div>
        ))}
      </div>

      {/* Task Bars */}
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: height - 40 }}>
        {scheduledTasks.map((task) => {
          const position = getPositionPercent(task.dueDate);
          const isOverdue = task.dueDate < new Date();

          return (
            <div key={task.id} className="relative h-8 group">
              {/* Background Track */}
              <div className="absolute inset-0 rounded bg-gray-100 dark:bg-slate-800" />

              {/* Today Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
                style={{ left: `${getPositionPercent(new Date())}%` }}
              />

              {/* Task Bar */}
              <div
                className={`absolute top-1 bottom-1 w-3 rounded ${priorityColors[task.priority]} ${
                  isOverdue ? 'animate-pulse' : ''
                }`}
                style={{ left: `${Math.max(0, position - 1)}%` }}
                title={`${task.title} - Due: ${task.dueDate.toLocaleDateString('en-GB')}`}
              />

              {/* Task Label */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate max-w-[200px]">
                  {task.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {task.dueDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                {isOverdue && (
                  <span className="text-xs font-semibold text-red-500">Overdue</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-gray-500 dark:text-slate-400">Urgent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-xs text-gray-500 dark:text-slate-400">Short</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-500 dark:text-slate-400">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-xs text-gray-500 dark:text-slate-400">Long</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500 dark:text-slate-400">Today</span>
        </div>
      </div>
    </div>
  );
};
