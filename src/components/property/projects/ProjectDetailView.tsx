'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Users, FileText, Calendar, Bell, CheckSquare, Settings, Edit2, Plus, CalendarPlus, Phone, Building2, UserPlus } from 'lucide-react';
import { ProjectEmailInbox } from './ProjectEmailInbox';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';
import toast from 'react-hot-toast';
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
import { CONTRACTOR_SPECIALTIES, type ContractorSpecialty } from '@/types/contractor.types';
import { formatDate } from '@/utils/formatDate';

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

type TabId = 'emails' | 'contacts' | 'quotes' | 'visits' | 'followups' | 'tasks' | 'contractors';

interface ProjectDetailViewProps {
  project: PropertyProject;
  onBack: () => void;
  onUpdateProject: (updates: Partial<PropertyProject>) => void;
  onAddEmail: (email: ProjectEmail) => void;
  onUpdateEmail: (emailId: string, updates: Partial<ProjectEmail>) => void;
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
  onUpdateEmail,
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
  const [showAddVisitForm, setShowAddVisitForm] = useState(false);
  const [newVisit, setNewVisit] = useState({ contractorName: '', date: '', time: '', purpose: '' });

  // Quote form state
  const [showAddQuoteForm, setShowAddQuoteForm] = useState(false);
  const [newQuote, setNewQuote] = useState({ contractorName: '', amount: '', validUntil: '', notes: '' });

  // Follow-up form state
  const [showAddFollowUpForm, setShowAddFollowUpForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ description: '', dueDate: '' });

  // Contractor type modal state
  const [showContractorTypeModal, setShowContractorTypeModal] = useState(false);
  const [pendingContact, setPendingContact] = useState<TaskContact | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<ContractorSpecialty>>(new Set());

  const { createEvent } = useCalendarContext();
  const people = useFamilyStore((state) => state.people);
  const familyId = useFamilyStore((state) => state.familyId);
  const contractors = useFamilyStore((state) => state.contractors);
  const addContractor = useFamilyStore((state) => state.addContractor);
  const [validPersonId, setValidPersonId] = useState<string | null>(null);

  // Fetch valid person ID from database on mount
  useEffect(() => {
    const fetchValidPersonId = async () => {
      // First try from store
      if (people.length > 0) {
        setValidPersonId(people[0].id);
        return;
      }

      // Then try to fetch from API
      const storedFamilyId = familyId || localStorage.getItem('familyId');
      if (storedFamilyId) {
        try {
          const response = await fetch(`/api/families/${storedFamilyId}/members`);
          if (response.ok) {
            const members = await response.json();
            if (members && members.length > 0) {
              setValidPersonId(members[0].id);
            }
          }
        } catch (error) {
          console.error('Failed to fetch family members:', error);
        }
      }
    };

    fetchValidPersonId();
  }, [people, familyId]);

  // Add visit to main calendar
  const addVisitToCalendar = async (visit: TaskScheduledVisit) => {
    if (!validPersonId) {
      toast.error('Cannot add to calendar - no family members found');
      return;
    }

    try {
      const result = await createEvent({
        title: `${visit.contractorName} - ${visit.purpose}`,
        person: validPersonId,
        date: visit.date,
        time: visit.time || '09:00',
        duration: 60,
        location: '21 Tremaine Road',
        recurring: 'none',
        cost: 0,
        type: 'appointment',
        notes: `Property project: ${project.title}\nContractor: ${visit.contractorName}\nPurpose: ${visit.purpose}`,
        isRecurring: false,
        priority: 'high',
        status: 'confirmed',
      });

      if (result === 'created') {
        toast.success(`Added "${visit.contractorName}" visit to calendar`);
      } else if (result === 'conflict') {
        toast('Visit has a scheduling conflict', { icon: '⚠️' });
      }
    } catch (error) {
      console.error('Failed to add visit to calendar:', error);
      toast.error('Visit saved locally (offline mode)');
    }
  };

  // Add contact to contractors - show modal for type selection
  const handleAddToContractors = (contact: TaskContact) => {
    const existingContractor = contractors.find(
      c => c.email === contact.email || c.phone === contact.phone || c.name.toLowerCase() === contact.name.toLowerCase()
    );

    if (existingContractor) {
      toast('This contact is already in your contractors list', { icon: 'ℹ️' });
      return;
    }

    // Open modal to select contractor type(s)
    setPendingContact(contact);
    setSelectedSpecialties(new Set());
    setShowContractorTypeModal(true);
  };

  // Confirm adding contractor with selected specialties
  const confirmAddContractor = () => {
    if (!pendingContact) return;

    // Use first selected specialty or 'other' if none selected
    const specialtiesArray = Array.from(selectedSpecialties);
    const primarySpecialty = specialtiesArray.length > 0 ? specialtiesArray[0] : 'other';

    addContractor({
      id: createId('contractor'),
      name: pendingContact.name,
      company: pendingContact.company,
      phone: pendingContact.phone,
      email: pendingContact.email,
      specialty: primarySpecialty,
      notes: specialtiesArray.length > 1
        ? `${pendingContact.notes || ''}\nSpecialties: ${specialtiesArray.map(s =>
            CONTRACTOR_SPECIALTIES.find(cs => cs.value === s)?.label || s
          ).join(', ')}`.trim()
        : pendingContact.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    toast.success(`Added ${pendingContact.name} to contractors`);
    setShowContractorTypeModal(false);
    setPendingContact(null);
    setSelectedSpecialties(new Set());
  };

  // Toggle specialty selection
  const toggleSpecialty = (specialty: ContractorSpecialty) => {
    const newSet = new Set(selectedSpecialties);
    if (newSet.has(specialty)) {
      newSet.delete(specialty);
    } else {
      newSet.add(specialty);
    }
    setSelectedSpecialties(newSet);
  };

  const handleAddVisit = () => {
    if (!newVisit.contractorName || !newVisit.date || !newVisit.purpose) return;

    const visit: TaskScheduledVisit = {
      id: createId('visit'),
      contractorName: newVisit.contractorName,
      date: newVisit.date,
      time: newVisit.time || undefined,
      purpose: newVisit.purpose,
      completed: false,
    };

    onAddVisit(visit);
    addVisitToCalendar(visit);
    setNewVisit({ contractorName: '', date: '', time: '', purpose: '' });
    setShowAddVisitForm(false);
  };

  const status = statusStyles[project.status];

  const tabs: { id: TabId; label: string; icon: typeof Mail; count: number }[] = [
    { id: 'emails', label: 'Emails', icon: Mail, count: project.emails?.length || 0 },
    { id: 'contacts', label: 'Contacts', icon: Users, count: project.contacts?.length || 0 },
    { id: 'quotes', label: 'Quotes', icon: FileText, count: project.quotes?.length || 0 },
    { id: 'visits', label: 'Visits', icon: Calendar, count: project.scheduledVisits?.length || 0 },
    { id: 'followups', label: 'Follow-ups', icon: Bell, count: project.followUps?.length || 0 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: project.tasks?.length || 0 },
    { id: 'contractors', label: 'Contractors', icon: Building2, count: contractors.length },
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

  // Add quote handler
  const handleAddQuote = () => {
    if (!newQuote.contractorName || !newQuote.amount) return;

    const quote: TaskQuote = {
      id: createId('quote'),
      contractorName: newQuote.contractorName,
      amount: parseFloat(newQuote.amount),
      currency: 'GBP',
      validUntil: newQuote.validUntil || undefined,
      notes: newQuote.notes || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    onAddQuote(quote);
    toast.success(`Quote from ${quote.contractorName} added`);
    setNewQuote({ contractorName: '', amount: '', validUntil: '', notes: '' });
    setShowAddQuoteForm(false);
  };

  // Add follow-up handler
  const handleAddFollowUp = () => {
    if (!newFollowUp.description || !newFollowUp.dueDate) return;

    const followUp: TaskFollowUp = {
      id: createId('followup'),
      description: newFollowUp.description,
      dueDate: newFollowUp.dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    onAddFollowUp(followUp);
    toast.success('Follow-up added');
    setNewFollowUp({ description: '', dueDate: '' });
    setShowAddFollowUpForm(false);
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
            onUpdateEmail={onUpdateEmail}
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
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-slate-100">{contact.name}</p>
                        {contact.company && (
                          <p className="text-sm text-gray-500 dark:text-slate-400">{contact.company}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
                          {contact.phone && <span>📞 {contact.phone}</span>}
                          {contact.email && <span>📧 {contact.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isReadOnly && (
                          <button
                            onClick={() => handleAddToContractors(contact)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 flex items-center gap-1"
                            title="Add to Contractors"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Add to Contractors
                          </button>
                        )}
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
              {!isReadOnly && (
                <button
                  onClick={() => setShowAddQuoteForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Quote
                </button>
              )}
            </div>

            {/* Add Quote Form */}
            {showAddQuoteForm && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newQuote.contractorName}
                    onChange={(e) => setNewQuote({ ...newQuote, contractorName: e.target.value })}
                    placeholder="Contractor name *"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
                    <input
                      type="number"
                      value={newQuote.amount}
                      onChange={(e) => setNewQuote({ ...newQuote, amount: e.target.value })}
                      placeholder="Amount *"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Valid Until (optional)</label>
                    <input
                      type="date"
                      value={newQuote.validUntil}
                      onChange={(e) => setNewQuote({ ...newQuote, validUntil: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <input
                    type="text"
                    value={newQuote.notes}
                    onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 self-end"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddQuoteForm(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddQuote}
                    disabled={!newQuote.contractorName || !newQuote.amount}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Add Quote
                  </button>
                </div>
              </div>
            )}

            {(project.quotes?.length || 0) === 0 && !showAddQuoteForm ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center dark:border-slate-700">
                <FileText className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  No quotes yet
                </p>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowAddQuoteForm(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Quote
                  </button>
                )}
              </div>
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
              {!isReadOnly && (
                <button
                  onClick={() => setShowAddVisitForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Visit
                </button>
              )}
            </div>

            {/* Add Visit Form */}
            {showAddVisitForm && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newVisit.contractorName}
                    onChange={(e) => setNewVisit({ ...newVisit, contractorName: e.target.value })}
                    placeholder="Contractor name *"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    value={newVisit.purpose}
                    onChange={(e) => setNewVisit({ ...newVisit, purpose: e.target.value })}
                    placeholder="Purpose *"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={newVisit.date}
                    onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="time"
                    value={newVisit.time}
                    onChange={(e) => setNewVisit({ ...newVisit, time: e.target.value })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddVisitForm(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddVisit}
                    disabled={!newVisit.contractorName || !newVisit.date || !newVisit.purpose}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add & Sync to Calendar
                  </button>
                </div>
              </div>
            )}

            {(project.scheduledVisits?.length || 0) === 0 && !showAddVisitForm ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center dark:border-slate-700">
                <Calendar className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  No visits scheduled yet
                </p>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowAddVisitForm(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule First Visit
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {project.scheduledVisits?.map((visit) => (
                  <div
                    key={visit.id}
                    className={`rounded-lg border p-4 ${
                      visit.completed
                        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        {/* Contractor Name - Prominent */}
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {visit.contractorName}
                          </span>
                          {visit.completed && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              Completed
                            </span>
                          )}
                        </div>

                        {/* Company if different */}
                        {visit.company && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400">
                            <Building2 className="h-3.5 w-3.5" />
                            {visit.company}
                          </div>
                        )}

                        {/* Purpose */}
                        <p className="text-sm text-gray-700 dark:text-slate-300">
                          {visit.purpose}
                        </p>

                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {formatDate(visit.date)}
                          </span>
                          {visit.time && (
                            <span>at {visit.time}</span>
                          )}
                        </div>

                        {visit.notes && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {visit.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!visit.completed && (
                          <button
                            onClick={() => addVisitToCalendar(visit)}
                            className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            title="Add to Calendar"
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </button>
                        )}
                        {!isReadOnly && !visit.completed && (
                          <button
                            onClick={() => onUpdateVisit(visit.id, { completed: true })}
                            className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          >
                            Mark Complete
                          </button>
                        )}
                        {!isReadOnly && (
                          <button
                            onClick={() => onRemoveVisit(visit.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-slate-700"
                          >
                            ×
                          </button>
                        )}
                      </div>
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
              {!isReadOnly && (
                <button
                  onClick={() => setShowAddFollowUpForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Follow-up
                </button>
              )}
            </div>

            {/* Add Follow-up Form */}
            {showAddFollowUpForm && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    value={newFollowUp.description}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, description: e.target.value })}
                    placeholder="What needs to be followed up? *"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={newFollowUp.dueDate}
                      onChange={(e) => setNewFollowUp({ ...newFollowUp, dueDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex items-end justify-end gap-2">
                    <button
                      onClick={() => setShowAddFollowUpForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFollowUp}
                      disabled={!newFollowUp.description || !newFollowUp.dueDate}
                      className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      Add Follow-up
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(project.followUps?.length || 0) === 0 && !showAddFollowUpForm ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center dark:border-slate-700">
                <Bell className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  No follow-ups yet
                </p>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowAddFollowUpForm(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Follow-up
                  </button>
                )}
              </div>
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

        {activeTab === 'contractors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-slate-100">
                Contractors ({contractors.length})
              </h3>
            </div>

            {contractors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
                <Building2 className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500" />
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  No contractors yet
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Add contacts from emails to build your contractor list
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {contractors.map((contractor) => (
                  <div
                    key={contractor.id}
                    className="rounded-lg border border-gray-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-slate-100">
                            {contractor.name}
                          </p>
                          {contractor.specialty && contractor.specialty !== 'other' && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                              {contractor.specialty.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {contractor.company && (
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {contractor.company}
                          </p>
                        )}
                        <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-slate-400">
                          {contractor.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${contractor.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                {contractor.phone}
                              </a>
                            </div>
                          )}
                          {contractor.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <a href={`mailto:${contractor.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                {contractor.email}
                              </a>
                            </div>
                          )}
                        </div>
                        {contractor.notes && (
                          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 italic">
                            {contractor.notes}
                          </p>
                        )}
                      </div>
                      {contractor.rating && (
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {'★'.repeat(contractor.rating)}
                          {'☆'.repeat(5 - contractor.rating)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contractor Type Selection Modal */}
      {showContractorTypeModal && pendingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowContractorTypeModal(false);
              setPendingContact(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Add to Contractors
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Select the contractor type(s) for this contact
              </p>
            </div>

            {/* Contact Info */}
            <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
              <p className="font-medium text-gray-900 dark:text-slate-100">{pendingContact.name}</p>
              {pendingContact.company && (
                <p className="text-sm text-gray-600 dark:text-slate-400">{pendingContact.company}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
                {pendingContact.phone && <span>📞 {pendingContact.phone}</span>}
                {pendingContact.email && <span>📧 {pendingContact.email}</span>}
              </div>
            </div>

            {/* Specialty Selection */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Contractor Type(s):
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {CONTRACTOR_SPECIALTIES.map((specialty) => (
                  <label
                    key={specialty.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                      selectedSpecialties.has(specialty.value)
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpecialties.has(specialty.value)}
                      onChange={() => toggleSpecialty(specialty.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{specialty.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowContractorTypeModal(false);
                  setPendingContact(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddContractor}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Contractor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
