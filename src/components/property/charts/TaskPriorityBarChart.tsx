'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PropertyTask, PropertyTaskPriority } from '@/types/property.types';

const priorityColors: Record<PropertyTaskPriority, string> = {
  urgent: '#EF4444',
  short: '#F97316',
  medium: '#EAB308',
  long: '#64748B',
};

const priorityLabels: Record<PropertyTaskPriority, string> = {
  urgent: 'Urgent',
  short: 'Short term',
  medium: 'Medium term',
  long: 'Long term',
};

const priorityOrder: PropertyTaskPriority[] = ['urgent', 'short', 'medium', 'long'];

interface TaskPriorityBarChartProps {
  tasks: PropertyTask[];
  height?: number;
  onBarClick?: (priority: PropertyTaskPriority, tasks: PropertyTask[]) => void;
}

export const TaskPriorityBarChart = ({ tasks, height = 200, onBarClick }: TaskPriorityBarChartProps) => {
  const data = useMemo(() => {
    const counts: Record<PropertyTaskPriority, number> = {
      urgent: 0,
      short: 0,
      medium: 0,
      long: 0,
    };

    tasks.forEach(task => {
      counts[task.priority] = (counts[task.priority] || 0) + 1;
    });

    return priorityOrder.map(priority => ({
      name: priorityLabels[priority],
      count: counts[priority],
      color: priorityColors[priority],
      priority,
    }));
  }, [tasks]);

  const handleClick = (data: Record<string, unknown>) => {
    if (onBarClick && data.priority) {
      const priority = data.priority as PropertyTaskPriority;
      const filteredTasks = tasks.filter(t => t.priority === priority);
      onBarClick(priority, filteredTasks);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        No tasks to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 12, fill: 'currentColor' }}
        />
        <Tooltip
          formatter={(value: number) => [`${value} tasks`, 'Count']}
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, white)',
            borderRadius: '8px',
            border: '1px solid var(--tooltip-border, #e5e7eb)',
          }}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          onClick={handleClick as never}
          style={{ cursor: onBarClick ? 'pointer' : 'default' }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
