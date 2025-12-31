'use client';

import { useState } from 'react';
import { ArrowLeft, Mail, Users, FileText, Calendar, Bell, CheckSquare, Settings } from 'lucide-react';
import { ProjectEmailInbox } from './ProjectEmailInbox';
import type {
  PropertyProject,
  ProjectEmail,
  ProjectStatus,
  TaskContact,
  TaskQuote,
  TaskScheduledVisit,
  TaskFollowUp,
  ProjectTask,
} from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';
import { createId } from '@/utils/id';

const statusStyles: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', label: 'Planning' },
  scheduled: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', label: 'Scheduled' },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', label: 'In Progress' },
  on_hold: { bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-700 dark:text-gray-300', label: 'On Hold' },
  completed: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', label: 'Completed' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-300', label: 'Cancelled' },
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

type TabId = 'emails' | 'contacts' | 'quotes' | 'visits' | 'followups' | 'tasks';

interface ProjectDetailViewProps {
  project: PropertyProject;
  onBack: () => void;
  onUpdateProject: (updates: Partial<PropertyProject>) => void;
  onAddEmail: (email: ProjectEmail) => void;
  onRemoveEmail: (emailId: string) => void;
  onAddContact: (contact: TaskContact) => void;
  onUpdateContact: (contactId: string, updates: Partial<TaskContact>) => void;
  onRemoveContact: (contactId: string) => void;
  onAddQuote: (quote: TaskQuote) => void;
  onUpdateQuote: (quoteId: string, updates: Partial<TaskQuote>) => void;
  onRemoveQuote: (quoteId: string) => void;
  onAddVisit: (visit: TaskScheduledVisit) => void;
  onUpdateVisit: (visitId: string, updates: Partial<TaskScheduledVisit>) => void;
  onRemoveVisit: (visitId: string) => void;
  onAddFollowUp: (followUp: TaskFollowUp) => void;
  onUpdateFollowUp: (followUpId: string, updates: Partial<TaskFollowUp>) => void;
  onRemoveFollowUp: (followUpId: string) => void;
  onAddTask: (task: ProjectTask) => void;
  onUpdateTask: (taskId: string, updates: Partial<ProjectTask>) => void;
  onRemoveTask: (taskId: string) => void;
  isReadOnly?: boolean;
}

export const ProjectDetailView = ({
  project,
  onBack,
  onUpdateProject,
  onAddEmail,
  onRemoveEmail,
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
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  isReadOnly = false,
}: ProjectDetailViewProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('emails');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const status = statusStyles[project.status];

  const tabs: { id: TabId; label: string; icon: typeof Mail; count: number }[] = [
    { id: 'emails', label: 'Emails', icon: Mail, count: project.emails?.length || 0 },
    { id: 'contacts', label: 'Contacts', icon: Users, count: project.contacts?.length || 0 },
    { id: 'quotes', label: 'Quotes', icon: FileText, count: project.quotes?.length || 0 },
    { id: 'visits', label: 'Visits', icon: Calendar, count: project.scheduledVisits?.length || 0 },
    { id: 'followups', label: 'Follow-ups', icon: Bell, count: project.followUps?.length || 0 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: project.tasks?.length || 0 },
  ];

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const now = new Date().toISOString();
    onAddTask({
      id: createId('ptask'),
      projectId: project.id,
      title: newTaskTitle.trim(),
      status: 'pending',
      createdAt: now,
    });
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {project.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
              {(project.budgetMin || project.budgetMax) && (
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Budget: {project.budgetMin && project.budgetMax
                    ? `${currencyFormatter.format(project.budgetMin)} - ${currencyFormatter.format(project.budgetMax)}`
                    : project.budgetMax
                      ? `Up to ${currencyFormatter.format(project.budgetMax)}`
                      : `From ${currencyFormatter.format(project.budgetMin!)}`}
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                {project.description}
              </p>
            )}
          </div>

          {!isReadOnly && (
            <select
              value={project.status}
              onChange={(e) => onUpdateProject({ status: e.target.value as ProjectStatus })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="planning">Planning</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {activeTab === 'emails' && (
          <ProjectEmailInbox
            project={project}
            onAddEmail={onAddEmail}
            onRemoveEmail={onRemoveEmail}
            onAddContact={onAddContact}
            onAddQuote={onAddQuote}
            onAddVisit={onAddVisit}
            onAddFollowUp={onAddFollowUp}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-slate-100">
                Contacts ({project.contacts?.length || 0})
              </h3>
            </div>
            {(project.contacts?.length || 0) === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No contacts yet. Add emails to extract contact information.
              </p>
            ) : (
              <div className="space-y-2">
                {project.contacts?.map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-lg border border-gray-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{contact.name}</p>
                        {contact.company && (
                          <p className="text-sm text-gray-500 dark:text-slate-400">{contact.company}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
                          {contact.phone && <span>📞 {contact.phone}</span>}
                          {contact.email && <span>📧 {contact.email}</span>}
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => onRemoveContact(contact.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-slate-100">
                Quotes ({project.quotes?.length || 0})
              </h3>
            </div>
            {(project.quotes?.length || 0) === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No quotes yet. Add emails with price information to extract quotes.
              </p>
            ) : (
              <div className="space-y-2">
                {project.quotes?.map((quote) => (
                  <div
                    key={quote.id}
                    className="rounded-lg border border-gray-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {currencyFormatter.format(quote.amount)}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : quote.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          }`}>
                            {quote.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">{quote.contractorName}</p>
                        {quote.notes && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{quote.notes}</p>
                        )}
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-1">
                          {quote.status === 'pending' && (
                            <>
                              <button
                                onClick={() => onUpdateQuote(quote.id, { status: 'accepted' })}
                                className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => onUpdateQuote(quote.id, { status: 'rejected' })}
                                className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-slate-100">
                Scheduled Visits ({project.scheduledVisits?.length || 0})
              </h3>
            </div>
            {(project.scheduledVisits?.length || 0) === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No visits scheduled yet.
              </p>
            ) : (
              <div className="space-y-2">
                {project.scheduledVisits?.map((visit) => (
                  <div
                    key={visit.id}
                    className={`rounded-lg border p-3 ${
                      visit.completed
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-slate-100">
                            {formatDate(visit.date)}
                            {visit.time && ` at ${visit.time}`}
                          </p>
                          {visit.completed && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">{visit.contractorName}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{visit.purpose}</p>
                      </div>
                      {!isReadOnly && !visit.completed && (
                        <button
                          onClick={() => onUpdateVisit(visit.id, { completed: true })}
                          className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'followups' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-slate-100">
                Follow-ups ({project.followUps?.length || 0})
              </h3>
            </div>
            {(project.followUps?.length || 0) === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No follow-ups yet.
              </p>
            ) : (
              <div className="space-y-2">
                {project.followUps?.map((followUp) => {
                  const isOverdue = !followUp.completed && new Date(followUp.dueDate) < new Date();
                  return (
                    <div
                      key={followUp.id}
                      className={`rounded-lg border p-3 ${
                        followUp.completed
                          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                          : isOverdue
                            ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                            : 'border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-medium ${
                            followUp.completed
                              ? 'text-gray-500 line-through dark:text-slate-400'
                              : 'text-gray-900 dark:text-slate-100'
                          }`}>
                            {followUp.description}
                          </p>
                          <p className={`text-xs ${
                            isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-slate-400'
                          }`}>
                            Due: {formatDate(followUp.dueDate)}
                            {isOverdue && ' (Overdue)'}
                          </p>
                        </div>
                        {!isReadOnly && !followUp.completed && (
                          <button
                            onClick={() => onUpdateFollowUp(followUp.id, { completed: true })}
                            className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-slate-100">
                Tasks ({project.tasks?.length || 0})
              </h3>
            </div>

            {/* Add task form */}
            {!isReadOnly && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder="Add a new task..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                />
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}

            {(project.tasks?.length || 0) === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No tasks yet.
              </p>
            ) : (
              <div className="space-y-2">
                {project.tasks?.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-lg border p-3 ${
                      task.status === 'completed'
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {!isReadOnly && (
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={(e) => onUpdateTask(task.id, {
                              status: e.target.checked ? 'completed' : 'pending',
                              completedAt: e.target.checked ? new Date().toISOString() : undefined,
                            })}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        <div>
                          <p className={`font-medium ${
                            task.status === 'completed'
                              ? 'text-gray-500 line-through dark:text-slate-400'
                              : 'text-gray-900 dark:text-slate-100'
                          }`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">{task.description}</p>
                          )}
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => onRemoveTask(task.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
