'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { PropertyTask, PropertyTaskStatus } from '@/types/property.types';

const statusColors: Record<PropertyTaskStatus, string> = {
  outstanding: '#F59E0B',
  in_progress: '#3B82F6',
  blocked: '#EF4444',
  verify: '#8B5CF6',
  completed: '#10B981',
};

const statusLabels: Record<PropertyTaskStatus, string> = {
  outstanding: 'Outstanding',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  verify: 'Verify',
  completed: 'Completed',
};

interface TaskStatusPieChartProps {
  tasks: PropertyTask[];
  height?: number;
  onSegmentClick?: (status: PropertyTaskStatus, tasks: PropertyTask[]) => void;
}

export const TaskStatusPieChart = ({ tasks, height = 250, onSegmentClick }: TaskStatusPieChartProps) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      name: statusLabels[status as PropertyTaskStatus],
      value: count,
      color: statusColors[status as PropertyTaskStatus],
      status: status as PropertyTaskStatus,
    }));
  }, [tasks]);

  const handleClick = (data: Record<string, unknown>) => {
    if (onSegmentClick && data.status) {
      const status = data.status as PropertyTaskStatus;
      const filteredTasks = tasks.filter(t => t.status === status);
      onSegmentClick(status, filteredTasks);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        No tasks to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }: Record<string, unknown>) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
          labelLine={false}
          onClick={handleClick as never}
          style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value} tasks`, 'Count']}
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, white)',
            borderRadius: '8px',
            border: '1px solid var(--tooltip-border, #e5e7eb)',
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-xs text-gray-600 dark:text-slate-300">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
