'use client';

import { useState } from 'react';
import {
  Users,
  FileText,
  Calendar,
  Bell,
  Plus,
  Phone,
  Mail,
  Building2,
  Check,
  X,
  Clock,
  Trash2,
  Edit2,
} from 'lucide-react';
import type {
  PropertyTask,
  TaskContact,
  TaskQuote,
  TaskScheduledVisit,
  TaskFollowUp,
} from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';
import { createId } from '@/utils/id';

type CRMTab = 'contacts' | 'quotes' | 'visits' | 'followups';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

interface TaskCRMPanelProps {
  task: PropertyTask;
  isReadOnly?: boolean;
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
}

const tabConfig: { id: CRMTab; label: string; icon: typeof Users }[] = [
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'quotes', label: 'Quotes', icon: FileText },
  { id: 'visits', label: 'Visits', icon: Calendar },
  { id: 'followups', label: 'Follow-ups', icon: Bell },
];

export const TaskCRMPanel = ({
  task,
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
}: TaskCRMPanelProps) => {
  const [activeTab, setActiveTab] = useState<CRMTab>('contacts');
  const [showAddForm, setShowAddForm] = useState(false);

  const contacts = task.contacts || [];
  const quotes = task.quotes || [];
  const visits = task.scheduledVisits || [];
  const followUps = task.followUps || [];

  const getCounts = () => ({
    contacts: contacts.length,
    quotes: quotes.length,
    visits: visits.length,
    followups: followUps.length,
  });

  const counts = getCounts();

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        {tabConfig.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowAddForm(false);
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'contacts' && (
          <ContactsTab
            contacts={contacts}
            isReadOnly={isReadOnly}
            showAddForm={showAddForm}
            onShowAddForm={setShowAddForm}
            onAdd={onAddContact}
            onUpdate={onUpdateContact}
            onRemove={onRemoveContact}
          />
        )}
        {activeTab === 'quotes' && (
          <QuotesTab
            quotes={quotes}
            isReadOnly={isReadOnly}
            showAddForm={showAddForm}
            onShowAddForm={setShowAddForm}
            onAdd={onAddQuote}
            onUpdate={onUpdateQuote}
            onRemove={onRemoveQuote}
          />
        )}
        {activeTab === 'visits' && (
          <VisitsTab
            visits={visits}
            isReadOnly={isReadOnly}
            showAddForm={showAddForm}
            onShowAddForm={setShowAddForm}
            onAdd={onAddVisit}
            onUpdate={onUpdateVisit}
            onRemove={onRemoveVisit}
          />
        )}
        {activeTab === 'followups' && (
          <FollowUpsTab
            followUps={followUps}
            isReadOnly={isReadOnly}
            showAddForm={showAddForm}
            onShowAddForm={setShowAddForm}
            onAdd={onAddFollowUp}
            onUpdate={onUpdateFollowUp}
            onRemove={onRemoveFollowUp}
          />
        )}
      </div>
    </div>
  );
};

// ============== CONTACTS TAB ==============
interface ContactsTabProps {
  contacts: TaskContact[];
  isReadOnly: boolean;
  showAddForm: boolean;
  onShowAddForm: (show: boolean) => void;
  onAdd: (contact: TaskContact) => void;
  onUpdate: (id: string, updates: Partial<TaskContact>) => void;
  onRemove: (id: string) => void;
}

const ContactsTab = ({
  contacts,
  isReadOnly,
  showAddForm,
  onShowAddForm,
  onAdd,
  onRemove,
}: ContactsTabProps) => {
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    notes: '',
  });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    onAdd({
      id: createId('contact'),
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      contactDate: new Date().toISOString().split('T')[0],
      notes: form.notes.trim() || undefined,
    });
    setForm({ name: '', company: '', phone: '', email: '', notes: '' });
    onShowAddForm(false);
  };

  return (
    <div className="space-y-3">
      {!isReadOnly && !showAddForm && (
        <button
          onClick={() => onShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      )}

      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10 space-y-2">
          <input
            type="text"
            placeholder="Contact name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <input
            type="text"
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.name.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add Contact
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
          No contacts recorded yet
        </p>
      )}

      {contacts.map((contact) => (
        <div
          key={contact.id}
          className="flex items-start justify-between rounded-lg border border-gray-200 p-3 dark:border-slate-700"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {contact.name}
              </span>
              {contact.company && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                  <Building2 className="h-3 w-3" />
                  {contact.company}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-slate-400">
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {contact.email}
                </span>
              )}
            </div>
            {contact.notes && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {contact.notes}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Contacted: {formatDate(contact.contactDate)}
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => onRemove(contact.id)}
              className="text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// ============== QUOTES TAB ==============
interface QuotesTabProps {
  quotes: TaskQuote[];
  isReadOnly: boolean;
  showAddForm: boolean;
  onShowAddForm: (show: boolean) => void;
  onAdd: (quote: TaskQuote) => void;
  onUpdate: (id: string, updates: Partial<TaskQuote>) => void;
  onRemove: (id: string) => void;
}

const QuotesTab = ({
  quotes,
  isReadOnly,
  showAddForm,
  onShowAddForm,
  onAdd,
  onUpdate,
  onRemove,
}: QuotesTabProps) => {
  const [form, setForm] = useState({
    contractorName: '',
    company: '',
    phone: '',
    email: '',
    amount: '',
    validUntil: '',
    notes: '',
  });

  const handleAdd = () => {
    if (!form.contractorName.trim() || !form.amount) return;
    onAdd({
      id: createId('quote'),
      contractorName: form.contractorName.trim(),
      company: form.company.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      amount: parseFloat(form.amount),
      currency: 'GBP',
      validUntil: form.validUntil || undefined,
      notes: form.notes.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    setForm({ contractorName: '', company: '', phone: '', email: '', amount: '', validUntil: '', notes: '' });
    onShowAddForm(false);
  };

  const getStatusStyle = (status: TaskQuote['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    }
  };

  return (
    <div className="space-y-3">
      {!isReadOnly && !showAddForm && (
        <button
          onClick={() => onShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Add Quote
        </button>
      )}

      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10 space-y-2">
          <input
            type="text"
            placeholder="Contractor name *"
            value={form.contractorName}
            onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <input
            type="text"
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              placeholder="Amount (GBP) *"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
            <input
              type="date"
              placeholder="Valid until"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.contractorName.trim() || !form.amount}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add Quote
            </button>
          </div>
        </div>
      )}

      {quotes.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
          No quotes received yet
        </p>
      )}

      {quotes.map((quote) => (
        <div
          key={quote.id}
          className="flex items-start justify-between rounded-lg border border-gray-200 p-3 dark:border-slate-700"
        >
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  {quote.contractorName}
                </span>
                {quote.company && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    ({quote.company})
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {currencyFormatter.format(quote.amount)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-medium ${getStatusStyle(quote.status)}`}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </span>
              {quote.validUntil && (
                <span className="text-gray-500 dark:text-slate-400">
                  Valid until: {formatDate(quote.validUntil)}
                </span>
              )}
            </div>
            {quote.notes && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {quote.notes}
              </p>
            )}
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-1 ml-2">
              {quote.status === 'pending' && (
                <>
                  <button
                    onClick={() => onUpdate(quote.id, { status: 'accepted' })}
                    className="rounded p-1 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400"
                    title="Accept quote"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onUpdate(quote.id, { status: 'rejected' })}
                    className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                    title="Reject quote"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => onRemove(quote.id)}
                className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                title="Delete quote"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============== VISITS TAB ==============
interface VisitsTabProps {
  visits: TaskScheduledVisit[];
  isReadOnly: boolean;
  showAddForm: boolean;
  onShowAddForm: (show: boolean) => void;
  onAdd: (visit: TaskScheduledVisit) => void;
  onUpdate: (id: string, updates: Partial<TaskScheduledVisit>) => void;
  onRemove: (id: string) => void;
}

const VisitsTab = ({
  visits,
  isReadOnly,
  showAddForm,
  onShowAddForm,
  onAdd,
  onUpdate,
  onRemove,
}: VisitsTabProps) => {
  const [form, setForm] = useState({
    contractorName: '',
    company: '',
    date: '',
    time: '',
    purpose: '',
    notes: '',
  });

  const handleAdd = () => {
    if (!form.contractorName.trim() || !form.date || !form.purpose.trim()) return;
    onAdd({
      id: createId('visit'),
      contractorName: form.contractorName.trim(),
      company: form.company.trim() || undefined,
      date: form.date,
      time: form.time || undefined,
      purpose: form.purpose.trim(),
      completed: false,
      notes: form.notes.trim() || undefined,
    });
    setForm({ contractorName: '', company: '', date: '', time: '', purpose: '', notes: '' });
    onShowAddForm(false);
  };

  return (
    <div className="space-y-3">
      {!isReadOnly && !showAddForm && (
        <button
          onClick={() => onShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Schedule Visit
        </button>
      )}

      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10 space-y-2">
          <input
            type="text"
            placeholder="Contractor name *"
            value={form.contractorName}
            onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <input
            type="text"
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="date"
              placeholder="Date *"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
            <input
              type="time"
              placeholder="Time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <input
            type="text"
            placeholder="Purpose *"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.contractorName.trim() || !form.date || !form.purpose.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Schedule Visit
            </button>
          </div>
        </div>
      )}

      {visits.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
          No visits scheduled
        </p>
      )}

      {visits.map((visit) => (
        <div
          key={visit.id}
          className={`flex items-start justify-between rounded-lg border p-3 ${
            visit.completed
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
              : 'border-gray-200 dark:border-slate-700'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${visit.completed ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-gray-900 dark:text-slate-100'}`}>
                {visit.contractorName}
              </span>
              {visit.company && (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  ({visit.company})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(visit.date)}</span>
              {visit.time && (
                <>
                  <Clock className="h-3 w-3 ml-1" />
                  <span>{visit.time}</span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-slate-300">
              {visit.purpose}
            </p>
            {visit.notes && (
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {visit.notes}
              </p>
            )}
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdate(visit.id, { completed: !visit.completed })}
                className={`rounded p-1 ${
                  visit.completed
                    ? 'text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/20'
                    : 'text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700'
                }`}
                title={visit.completed ? 'Mark as not completed' : 'Mark as completed'}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => onRemove(visit.id)}
                className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/20 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============== FOLLOW-UPS TAB ==============
interface FollowUpsTabProps {
  followUps: TaskFollowUp[];
  isReadOnly: boolean;
  showAddForm: boolean;
  onShowAddForm: (show: boolean) => void;
  onAdd: (followUp: TaskFollowUp) => void;
  onUpdate: (id: string, updates: Partial<TaskFollowUp>) => void;
  onRemove: (id: string) => void;
}

const FollowUpsTab = ({
  followUps,
  isReadOnly,
  showAddForm,
  onShowAddForm,
  onAdd,
  onUpdate,
  onRemove,
}: FollowUpsTabProps) => {
  const [form, setForm] = useState({
    dueDate: '',
    description: '',
  });

  const handleAdd = () => {
    if (!form.dueDate || !form.description.trim()) return;
    onAdd({
      id: createId('followup'),
      dueDate: form.dueDate,
      description: form.description.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    });
    setForm({ dueDate: '', description: '' });
    onShowAddForm(false);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !followUps.find((f) => f.dueDate === dueDate)?.completed;
  };

  return (
    <div className="space-y-3">
      {!isReadOnly && !showAddForm && (
        <button
          onClick={() => onShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Add Follow-up
        </button>
      )}

      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10 space-y-2">
          <input
            type="date"
            placeholder="Due date *"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <textarea
            placeholder="Description *"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.dueDate || !form.description.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add Follow-up
            </button>
          </div>
        </div>
      )}

      {followUps.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
          No follow-ups scheduled
        </p>
      )}

      {followUps.map((followUp) => {
        const overdue = !followUp.completed && new Date(followUp.dueDate) < new Date();
        return (
          <div
            key={followUp.id}
            className={`flex items-start justify-between rounded-lg border p-3 ${
              followUp.completed
                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                : overdue
                ? 'border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-500/10'
                : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className="space-y-1">
              <p className={`text-sm ${followUp.completed ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-gray-900 dark:text-slate-100'}`}>
                {followUp.description}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <Bell className={`h-3 w-3 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
                <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-slate-400'}>
                  Due: {formatDate(followUp.dueDate)}
                  {overdue && ' (Overdue)'}
                </span>
              </div>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdate(followUp.id, { completed: !followUp.completed })}
                  className={`rounded p-1 ${
                    followUp.completed
                      ? 'text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/20'
                      : 'text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700'
                  }`}
                  title={followUp.completed ? 'Mark as not completed' : 'Mark as completed'}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onRemove(followUp.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
