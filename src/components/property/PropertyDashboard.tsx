'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Shield, Eye, Home } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';
import { formatDateForInput } from '@/utils/formatDate';
import { PropertyTabNavigation, type PropertyTabId } from './common/PropertyTabNavigation';
import { PropertyOverviewTab } from './tabs/PropertyOverviewTab';
import { PropertyTasksTab } from './tabs/PropertyTasksTab';
import { PropertyProjectsTab } from './tabs/PropertyProjectsTab';
import { PropertyDigitalTwinTab } from './tabs/PropertyDigitalTwinTab';
import { PropertyAnalyticsTab } from './tabs/PropertyAnalyticsTab';
import { PropertyAwarenessTab } from './tabs/PropertyAwarenessTab';
import type { PropertyTask, PropertyTaskStatus, PropertyDocument } from '@/types/property.types';

// Modal Shell Component
const ModalShell = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-2 sm:px-4 py-4 sm:py-6 overflow-y-auto">
      <div className="w-full max-w-[95vw] sm:max-w-md lg:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-5 py-3 sm:py-4 dark:border-slate-800 dark:bg-slate-900 rounded-t-2xl sm:rounded-t-xl">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 flex-shrink-0 touch-manipulation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

export const PropertyDashboard = () => {
  const searchParams = useSearchParams();
  const shareMode = searchParams.get('mode') === 'share';
  const shareTaskId = searchParams.get('task') || '';

  // Store State
  const propertyProfile = useFamilyStore((state) => state.propertyProfile);
  const propertyTasks = useFamilyStore((state) => state.propertyTasks);
  const propertyValues = useFamilyStore((state) => state.propertyValues);
  const propertyComponents = useFamilyStore((state) => state.propertyComponents);
  const propertyRole = useFamilyStore((state) => state.propertyRole);

  // Store Actions
  const addPropertyTask = useFamilyStore((state) => state.addPropertyTask);
  const updatePropertyTask = useFamilyStore((state) => state.updatePropertyTask);
  const addPropertyWorkLog = useFamilyStore((state) => state.addPropertyWorkLog);
  const setPropertyRole = useFamilyStore((state) => state.setPropertyRole);
  // CRM Actions
  const addTaskContact = useFamilyStore((state) => state.addTaskContact);
  const updateTaskContact = useFamilyStore((state) => state.updateTaskContact);
  const removeTaskContact = useFamilyStore((state) => state.removeTaskContact);
  const addTaskQuote = useFamilyStore((state) => state.addTaskQuote);
  const updateTaskQuote = useFamilyStore((state) => state.updateTaskQuote);
  const removeTaskQuote = useFamilyStore((state) => state.removeTaskQuote);
  const addTaskVisit = useFamilyStore((state) => state.addTaskVisit);
  const updateTaskVisit = useFamilyStore((state) => state.updateTaskVisit);
  const removeTaskVisit = useFamilyStore((state) => state.removeTaskVisit);
  const addTaskFollowUp = useFamilyStore((state) => state.addTaskFollowUp);
  const updateTaskFollowUp = useFamilyStore((state) => state.updateTaskFollowUp);
  const removeTaskFollowUp = useFamilyStore((state) => state.removeTaskFollowUp);

  // UI State
  const [activeTab, setActiveTab] = useState<PropertyTabId>('overview');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showLogWorkModal, setShowLogWorkModal] = useState(false);
  const [activeTask, setActiveTask] = useState<PropertyTask | null>(null);

  // Form State
  const [newTask, setNewTask] = useState({
    title: '',
    category: '',
    conditionRating: '2',
    priority: 'short',
    impact: '',
    timeframe: '',
    pageReference: '',
    recommendedContractor: '',
    costMin: '',
    costMax: '',
    status: 'outstanding',
    nextDueDate: '',
    recurrenceInterval: '',
    recurrenceUnit: 'month',
    source: 'owner',
    components: [] as string[],
  });

  const [workLogForm, setWorkLogForm] = useState({
    completedDate: formatDateForInput(new Date()),
    completedBy: '',
    cost: '',
    costIncludesVat: true,
    warrantyEndDate: '',
    notes: '',
    attachments: [] as PropertyDocument[],
    markCompleted: true,
  });

  const isOwnerView = propertyRole === 'owner' && !shareMode;
  const isReadOnly = !isOwnerView;

  // Filter tasks for share mode
  const visibleTasks = useMemo(() => {
    if (shareMode && shareTaskId) {
      return propertyTasks.filter((task) => task.id === shareTaskId);
    }
    return propertyTasks;
  }, [propertyTasks, shareMode, shareTaskId]);

  // Handlers
  const handleStatusChange = (taskId: string, status: PropertyTaskStatus) => {
    updatePropertyTask(taskId, { status, updatedAt: new Date().toISOString() });
  };

  const handleAddTask = () => {
    const costMin = parseFloat(newTask.costMin);
    const costMax = parseFloat(newTask.costMax);

    addPropertyTask({
      id: createId('task'),
      title: newTask.title.trim(),
      category: newTask.category.trim() || 'General',
      conditionRating: parseInt(newTask.conditionRating) as 1 | 2 | 3,
      priority: newTask.priority as PropertyTask['priority'],
      impact: newTask.impact.trim(),
      timeframe: newTask.timeframe.trim(),
      pageReference: newTask.pageReference.trim(),
      recommendedContractor: newTask.recommendedContractor.trim(),
      defaultCostRange:
        !isNaN(costMin) && !isNaN(costMax)
          ? { min: costMin, max: costMax, currency: 'GBP' }
          : undefined,
      status: newTask.status as PropertyTaskStatus,
      nextDueDate: newTask.nextDueDate || undefined,
      recurrence:
        newTask.recurrenceInterval && parseInt(newTask.recurrenceInterval) > 0
          ? {
              interval: parseInt(newTask.recurrenceInterval),
              unit: newTask.recurrenceUnit as 'month' | 'year',
            }
          : undefined,
      components: newTask.components.length > 0 ? newTask.components : undefined,
      attachments: [],
      workLogs: [],
      source: newTask.source as PropertyTask['source'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setShowAddTaskModal(false);
    resetTaskForm();
  };

  const handleLogWork = () => {
    if (!activeTask) return;

    addPropertyWorkLog(activeTask.id, {
      id: createId('worklog'),
      taskId: activeTask.id,
      completedDate: workLogForm.completedDate,
      completedBy: workLogForm.completedBy.trim(),
      cost: parseFloat(workLogForm.cost) || 0,
      costIncludesVat: workLogForm.costIncludesVat,
      warrantyEndDate: workLogForm.warrantyEndDate || undefined,
      notes: workLogForm.notes.trim(),
      attachments: workLogForm.attachments,
    });

    if (workLogForm.markCompleted) {
      updatePropertyTask(activeTask.id, {
        status: 'completed',
        updatedAt: new Date().toISOString(),
      });
    }

    setShowLogWorkModal(false);
    setActiveTask(null);
    resetWorkLogForm();
  };

  const resetTaskForm = () => {
    setNewTask({
      title: '',
      category: '',
      conditionRating: '2',
      priority: 'short',
      impact: '',
      timeframe: '',
      pageReference: '',
      recommendedContractor: '',
      costMin: '',
      costMax: '',
      status: 'outstanding',
      nextDueDate: '',
      recurrenceInterval: '',
      recurrenceUnit: 'month',
      source: 'owner',
      components: [],
    });
  };

  const resetWorkLogForm = () => {
    setWorkLogForm({
      completedDate: formatDateForInput(new Date()),
      completedBy: '',
      cost: '',
      costIncludesVat: true,
      warrantyEndDate: '',
      notes: '',
      attachments: [],
      markCompleted: true,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="rounded-lg bg-blue-50 p-2.5 sm:p-3 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200 flex-shrink-0">
              <Home className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
                {propertyProfile.propertyName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 truncate">
                {propertyProfile.address}
              </p>
            </div>
          </div>

          {/* Role Selector */}
          {!shareMode && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-1 dark:border-slate-700">
              <button
                onClick={() => setPropertyRole('owner')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  propertyRole === 'owner'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Owner
              </button>
              <button
                onClick={() => setPropertyRole('viewer')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  propertyRole === 'viewer'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Viewer
              </button>
            </div>
          )}
        </div>

        {shareMode && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-100">
            Shared task view - read only. All changes require owner access.
          </div>
        )}
      </section>

      {/* Tab Navigation */}
      <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <PropertyTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="p-3 sm:p-5">
          {activeTab === 'overview' && (
            <PropertyOverviewTab
              tasks={visibleTasks}
              profile={propertyProfile}
              isReadOnly={isReadOnly}
              onAddTask={() => setShowAddTaskModal(true)}
              onImportSurvey={() => {/* TODO: Import survey handler */}}
              onExport={() => {/* TODO: Export handler */}}
            />
          )}

          {activeTab === 'tasks' && (
            <PropertyTasksTab
              tasks={visibleTasks}
              selectedComponent={selectedComponent}
              onClearComponent={() => setSelectedComponent(null)}
              onStatusChange={handleStatusChange}
              onAddTask={() => setShowAddTaskModal(true)}
              onImportSurvey={() => {/* TODO: Import survey handler */}}
              isReadOnly={isReadOnly}
              onAddContact={addTaskContact}
              onUpdateContact={updateTaskContact}
              onRemoveContact={removeTaskContact}
              onAddQuote={addTaskQuote}
              onUpdateQuote={updateTaskQuote}
              onRemoveQuote={removeTaskQuote}
              onAddVisit={addTaskVisit}
              onUpdateVisit={updateTaskVisit}
              onRemoveVisit={removeTaskVisit}
              onAddFollowUp={addTaskFollowUp}
              onUpdateFollowUp={updateTaskFollowUp}
              onRemoveFollowUp={removeTaskFollowUp}
            />
          )}

          {activeTab === 'projects' && (
            <PropertyProjectsTab isReadOnly={isReadOnly} />
          )}

          {activeTab === 'digital-twin' && (
            <PropertyDigitalTwinTab
              components={propertyComponents}
              tasks={visibleTasks}
              selectedComponent={selectedComponent}
              onSelectComponent={setSelectedComponent}
            />
          )}

          {activeTab === 'analytics' && (
            <PropertyAnalyticsTab
              tasks={visibleTasks}
              values={propertyValues}
              profile={propertyProfile}
            />
          )}

          {activeTab === 'awareness' && (
            <PropertyAwarenessTab />
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <ModalShell
        open={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        title="Add New Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Title *
            </label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Task title"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Category
              </label>
              <input
                type="text"
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                placeholder="e.g., Roof, Electrics"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="urgent">Urgent</option>
                <option value="short">Short term</option>
                <option value="medium">Medium term</option>
                <option value="long">Long term</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Cost Min (£)
              </label>
              <input
                type="number"
                value={newTask.costMin}
                onChange={(e) => setNewTask({ ...newTask, costMin: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Cost Max (£)
              </label>
              <input
                type="number"
                value={newTask.costMax}
                onChange={(e) => setNewTask({ ...newTask, costMax: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Impact
            </label>
            <textarea
              value={newTask.impact}
              onChange={(e) => setNewTask({ ...newTask, impact: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              placeholder="What happens if this task is delayed?"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setShowAddTaskModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              disabled={!newTask.title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Task
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Log Work Modal */}
      <ModalShell
        open={showLogWorkModal}
        onClose={() => {
          setShowLogWorkModal(false);
          setActiveTask(null);
        }}
        title={`Log Work - ${activeTask?.title || ''}`}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Completion Date
              </label>
              <input
                type="date"
                value={workLogForm.completedDate}
                onChange={(e) =>
                  setWorkLogForm({ ...workLogForm, completedDate: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Completed By
              </label>
              <input
                type="text"
                value={workLogForm.completedBy}
                onChange={(e) =>
                  setWorkLogForm({ ...workLogForm, completedBy: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                placeholder="Contractor name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Cost (£)
              </label>
              <input
                type="number"
                value={workLogForm.cost}
                onChange={(e) =>
                  setWorkLogForm({ ...workLogForm, cost: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="includesVat"
                checked={workLogForm.costIncludesVat}
                onChange={(e) =>
                  setWorkLogForm({ ...workLogForm, costIncludesVat: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="includesVat"
                className="text-sm text-gray-700 dark:text-slate-300"
              >
                Includes VAT
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              value={workLogForm.notes}
              onChange={(e) => setWorkLogForm({ ...workLogForm, notes: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              placeholder="Work completed, any issues, etc."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="markCompleted"
              checked={workLogForm.markCompleted}
              onChange={(e) =>
                setWorkLogForm({ ...workLogForm, markCompleted: e.target.checked })
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="markCompleted"
              className="text-sm text-gray-700 dark:text-slate-300"
            >
              Mark task as completed
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowLogWorkModal(false);
                setActiveTask(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleLogWork}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Log Work
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};
