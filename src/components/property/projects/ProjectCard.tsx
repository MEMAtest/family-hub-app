'use client';

import { ChevronRight, Mail, Users, FileText, Calendar } from 'lucide-react';
import type { PropertyProject, ProjectStatus } from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';

const statusStyles: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-blue-50 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', label: 'Planning' },
  scheduled: { bg: 'bg-purple-50 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', label: 'Scheduled' },
  in_progress: { bg: 'bg-amber-50 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', label: 'In Progress' },
  on_hold: { bg: 'bg-gray-50 dark:bg-gray-500/20', text: 'text-gray-700 dark:text-gray-300', label: 'On Hold' },
  completed: { bg: 'bg-emerald-50 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', label: 'Completed' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-300', label: 'Cancelled' },
};

const categoryIcons: Record<string, string> = {
  Bathroom: '🛁',
  Kitchen: '🍳',
  Electrics: '🔌',
  Plumbing: '🚰',
  Heating: '🔥',
  Roofing: '🏠',
  Extension: '🏗️',
  Garden: '🌳',
  Decoration: '🎨',
  Other: '📋',
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

interface ProjectCardProps {
  project: PropertyProject;
  onClick: () => void;
}

export const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const status = statusStyles[project.status];
  const icon = categoryIcons[project.category] || categoryIcons.Other;

  const emailCount = project.emails?.length || 0;
  const contactCount = project.contacts?.length || 0;
  const quoteCount = project.quotes?.length || 0;
  const visitCount = project.scheduledVisits?.filter(v => !v.completed).length || 0;

  const budgetDisplay = project.budgetMin || project.budgetMax
    ? project.budgetMin && project.budgetMax
      ? `${currencyFormatter.format(project.budgetMin)} - ${currencyFormatter.format(project.budgetMax)}`
      : project.budgetMax
        ? `Up to ${currencyFormatter.format(project.budgetMax)}`
        : `From ${currencyFormatter.format(project.budgetMin!)}`
    : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {project.title}
            </h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
      </div>

      {/* Description */}
      {project.description && (
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-400 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Budget */}
      {budgetDisplay && (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
            {budgetDisplay}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
        {emailCount > 0 && (
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {emailCount} email{emailCount !== 1 ? 's' : ''}
          </span>
        )}
        {contactCount > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {contactCount} contact{contactCount !== 1 ? 's' : ''}
          </span>
        )}
        {quoteCount > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {quoteCount} quote{quoteCount !== 1 ? 's' : ''}
          </span>
        )}
        {visitCount > 0 && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {visitCount} visit{visitCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Target dates */}
      {(project.targetStartDate || project.targetCompletionDate) && (
        <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-slate-800 dark:text-slate-400">
          {project.targetStartDate && (
            <span>Start: {formatDate(project.targetStartDate)}</span>
          )}
          {project.targetStartDate && project.targetCompletionDate && <span className="mx-2">•</span>}
          {project.targetCompletionDate && (
            <span>Complete: {formatDate(project.targetCompletionDate)}</span>
          )}
        </div>
      )}
    </div>
  );
};
