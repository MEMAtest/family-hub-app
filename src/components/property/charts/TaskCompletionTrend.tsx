'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { PropertyTask } from '@/types/property.types';

interface TaskCompletionTrendProps {
  tasks: PropertyTask[];
  height?: number;
}

export const TaskCompletionTrend = ({ tasks, height = 250 }: TaskCompletionTrendProps) => {
  const data = useMemo(() => {
    // Get all work logs with completion dates
    const completedLogs = tasks
      .flatMap((task) =>
        task.workLogs
          .filter((log) => log.completedDate)
          .map((log) => ({
            date: new Date(log.completedDate),
            taskId: task.id,
          }))
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (completedLogs.length === 0) return [];

    // Group by month
    const monthlyData: Record<string, { month: string; completed: number; cumulative: number }> = {};
    let cumulative = 0;

    completedLogs.forEach((log) => {
      const monthKey = `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = log.date.toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit',
      });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, completed: 0, cumulative: 0 };
      }
      monthlyData[monthKey].completed += 1;
      cumulative += 1;
      monthlyData[monthKey].cumulative = cumulative;
    });

    return Object.values(monthlyData);
  }, [tasks]);

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-gray-500 dark:text-slate-400">
        No completion data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'currentColor' }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'currentColor' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, white)',
            borderRadius: '8px',
            border: '1px solid var(--tooltip-border, #e5e7eb)',
          }}
          formatter={(value: number, name: string) => [
            value,
            name === 'completed' ? 'Completed this month' : 'Total completed',
          ]}
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          name="cumulative"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          name="completed"
          stroke="#10B981"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#10B981', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
