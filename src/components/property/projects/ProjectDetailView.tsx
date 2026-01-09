'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Mail, Users, FileText, Calendar, Bell, CheckSquare, Settings, Edit2, Plus, CalendarPlus, Phone, Building2, UserPlus, Upload, BarChart3, PieChart, Download, FileSpreadsheet, FileJson, Printer } from 'lucide-react';
import { ProjectEmailInbox } from './ProjectEmailInbox';
import PDFQuoteExtractor from '@/components/projects/PDFQuoteExtractor';
import QuoteCostBreakdownChart from '@/components/projects/charts/QuoteCostBreakdownChart';
import QuoteComparisonChart from '@/components/projects/charts/QuoteComparisonChart';
import QuoteItemsTable from '@/components/projects/charts/QuoteItemsTable';
import QuoteValidityTimeline from '@/components/projects/charts/QuoteValidityTimeline';
import Modal from '@/components/common/Modal';
import { ExtractedQuote } from '@/types/quote.types';
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
  ManualQuoteLineItem,
} from '@/types/property.types';
import { CONTRACTOR_SPECIALTIES, type ContractorSpecialty } from '@/types/contractor.types';
import { formatDate } from '@/utils/formatDate';
import { exportQuotesToCSV, exportQuotesToExcel, exportQuotesToJSON, exportQuotesToHTML } from '@/utils/quoteExporters';

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
  const [newQuote, setNewQuote] = useState({
    title: '',
    contractorName: '',
    company: '',
    phone: '',
    email: '',
    validUntil: '',
    notes: '',
    terms: '',
    includesVat: false,
    lineItems: [{ id: '1', description: '', labour: '', materials: '' }] as { id: string; description: string; labour: string; materials: string }[],
  });

  // Quotes selected for comparison
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Toggle quote selection for comparison
  const toggleQuoteSelection = (quoteId: string) => {
    setSelectedForComparison(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  // Get selected quotes for comparison
  const selectedQuotes = useMemo(() => {
    return project.quotes?.filter(q => selectedForComparison.has(q.id)) || [];
  }, [project.quotes, selectedForComparison]);

  // Clear selection
  const clearSelection = () => {
    setSelectedForComparison(new Set());
  };

  // PDF Quote Extractor state
  const [showPDFExtractor, setShowPDFExtractor] = useState(false);
  const [extractedQuotes, setExtractedQuotes] = useState<ExtractedQuote[]>([]);
  const [selectedExtractedQuote, setSelectedExtractedQuote] = useState<ExtractedQuote | null>(null);
  const [showQuoteComparison, setShowQuoteComparison] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showQuoteDetails, setShowQuoteDetails] = useState(false);

  // Follow-up form state
  const [showAddFollowUpForm, setShowAddFollowUpForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ description: '', dueDate: '' });

  // Contractor type modal state
  const [showContractorTypeModal, setShowContractorTypeModal] = useState(false);
  const [pendingContact, setPendingContact] = useState<TaskContact | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<ContractorSpecialty>>(new Set());

  // Quote-based contractor creation state
  const [showQuoteContractorModal, setShowQuoteContractorModal] = useState(false);
  const [pendingQuoteForContractor, setPendingQuoteForContractor] = useState<ExtractedQuote | null>(null);
  const [quoteContractorSpecialty, setQuoteContractorSpecialty] = useState<ContractorSpecialty>('other');

  const { createEvent } = useCalendarContext();
  const people = useFamilyStore((state) => state.people);
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
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

  // Load extractedQuotes from persisted TaskQuotes on mount
  useEffect(() => {
    let isMounted = true;

    const loadedQuotes = (project.quotes || [])
      .filter((q): q is TaskQuote & { extractedQuoteData: ExtractedQuote } =>
        q.extractedQuoteData !== undefined
      )
      .map((q) => q.extractedQuoteData);

    if (isMounted && loadedQuotes.length > 0) {
      setExtractedQuotes(loadedQuotes);
    }

    return () => {
      isMounted = false;
    };
  }, [project.quotes]);

  // Group quotes by company for comparison
  const quotesByCompany = useMemo(() => {
    return extractedQuotes.reduce((acc, quote) => {
      const company = quote.company || quote.contractorName;
      if (!acc[company]) {
        acc[company] = [];
      }
      acc[company].push(quote);
      return acc;
    }, {} as Record<string, ExtractedQuote[]>);
  }, [extractedQuotes]);

  const companyNames = useMemo(() => Object.keys(quotesByCompany), [quotesByCompany]);

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
    if (!newQuote.contractorName) return;

    // Calculate total from line items if they exist
    const validLineItems = newQuote.lineItems.filter(
      (item) => item.description && (item.labour || item.materials)
    );

    const manualLineItems: ManualQuoteLineItem[] = validLineItems.map((item) => {
      const labour = parseFloat(item.labour) || 0;
      const materials = parseFloat(item.materials) || 0;
      return {
        id: createId('line'),
        description: item.description,
        labour: labour || undefined,
        materials: materials || undefined,
        amount: labour + materials,
      };
    });

    const totalFromItems = manualLineItems.reduce((sum, item) => sum + item.amount, 0);

    const quote: TaskQuote = {
      id: createId('quote'),
      title: newQuote.title || undefined,
      contractorName: newQuote.contractorName,
      company: newQuote.company || undefined,
      phone: newQuote.phone || undefined,
      email: newQuote.email || undefined,
      amount: totalFromItems,
      currency: 'GBP',
      validUntil: newQuote.validUntil || undefined,
      notes: newQuote.notes || undefined,
      terms: newQuote.terms || undefined,
      includesVat: newQuote.includesVat,
      manualLineItems: manualLineItems.length > 0 ? manualLineItems : undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (quote.amount === 0) {
      toast.error('Please add at least one line item with labour or materials cost');
      return;
    }

    onAddQuote(quote);
    toast.success(`Quote from ${quote.contractorName} added`);
    setNewQuote({
      title: '',
      contractorName: '',
      company: '',
      phone: '',
      email: '',
      validUntil: '',
      notes: '',
      terms: '',
      includesVat: false,
      lineItems: [{ id: '1', description: '', labour: '', materials: '' }],
    });
    setShowAddQuoteForm(false);
  };

  // Add/remove line items in manual quote form
  const addQuoteLineItem = () => {
    setNewQuote((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: createId('line'), description: '', labour: '', materials: '' }],
    }));
  };

  const removeQuoteLineItem = (id: string) => {
    setNewQuote((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }));
  };

  const updateQuoteLineItem = (id: string, field: 'description' | 'labour' | 'materials', value: string) => {
    setNewQuote((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Toggle quote selection for comparison
  const toggleQuoteForComparison = (quoteId: string) => {
    setSelectedForComparison((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  // Helper to find existing contractor by details
  const findContractorByDetails = (quote: ExtractedQuote) => {
    const companyLower = (quote.company || quote.contractorName).toLowerCase();
    return contractors.find((c) =>
      c.email === quote.email ||
      c.phone === quote.phone ||
      c.name.toLowerCase() === companyLower ||
      (c.company && c.company.toLowerCase() === companyLower)
    );
  };

  // Handle extracted quote from PDF
  const handleQuoteExtracted = (extractedQuote: ExtractedQuote) => {
    // Add to local extracted quotes for comparison
    setExtractedQuotes((prev) => [...prev, extractedQuote]);

    // Check if contractor already exists
    const existingContractor = findContractorByDetails(extractedQuote);

    // Create TaskQuote with FULL extracted data
    const quote: TaskQuote = {
      id: createId('quote'),
      contractorName: extractedQuote.contractorName,
      company: extractedQuote.company,
      phone: extractedQuote.phone,
      email: extractedQuote.email,
      amount: extractedQuote.total,
      currency: 'GBP',
      validUntil: extractedQuote.validUntil,
      notes: `Extracted from PDF: ${extractedQuote.sourceFileName}\nLabour: £${extractedQuote.labourTotal.toFixed(2)}\nMaterials: £${extractedQuote.materialsTotal.toFixed(2)}\nFixtures: £${extractedQuote.fixturesTotal.toFixed(2)}\n${extractedQuote.lineItems.length} line items`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      // Store full extracted data for comparison and display
      extractedQuoteData: extractedQuote,
      contractorId: existingContractor?.id,
    };

    onAddQuote(quote);
    setShowPDFExtractor(false);
    setSelectedExtractedQuote(extractedQuote);

    if (existingContractor) {
      toast.success(`Quote linked to existing contractor: ${existingContractor.name}`);
    } else {
      // Show contractor creation prompt
      setPendingQuoteForContractor(extractedQuote);
      // Pre-select specialty based on project category
      const categoryToSpecialty: Record<string, ContractorSpecialty> = {
        'Bathroom': 'plumber',
        'Kitchen': 'plumber',
        'Plumbing': 'plumber',
        'Electrics': 'electrician',
        'Heating': 'heating_engineer',
        'Roofing': 'roofer',
        'Extension': 'builder',
        'Garden': 'gardener',
        'Decoration': 'decorator',
      };
      setQuoteContractorSpecialty(categoryToSpecialty[project.category] || 'other');
      setShowQuoteContractorModal(true);
      toast.success(`Quote from ${extractedQuote.contractorName} extracted`);
    }
  };

  // Create contractor from quote
  const handleCreateContractorFromQuote = async () => {
    if (!pendingQuoteForContractor) return;

    try {
      const newContractor = {
        id: createId('contractor'),
        name: pendingQuoteForContractor.company || pendingQuoteForContractor.contractorName,
        company: pendingQuoteForContractor.company,
        phone: pendingQuoteForContractor.phone,
        email: pendingQuoteForContractor.email,
        address: pendingQuoteForContractor.address,
        specialty: quoteContractorSpecialty,
        notes: pendingQuoteForContractor.contactName
          ? `Contact: ${pendingQuoteForContractor.contactName}`
          : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add contractor to store
      addContractor(newContractor);

      // Update the quote with the new contractor ID
      const quoteToUpdate = project.quotes?.find(
        (q) => q.extractedQuoteData?.id === pendingQuoteForContractor.id
      );
      if (quoteToUpdate) {
        onUpdateQuote(quoteToUpdate.id, { contractorId: newContractor.id });
      }

      toast.success(`${newContractor.name} added to contractors`);
    } catch (error) {
      console.error('Failed to create contractor:', error);
      toast.error('Failed to create contractor');
    } finally {
      setShowQuoteContractorModal(false);
      setPendingQuoteForContractor(null);
    }
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-medium text-gray-900 dark:text-slate-100">
                Quotes ({project.quotes?.length || 0})
                {selectedForComparison.size > 0 && (
                  <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                    ({selectedForComparison.size} selected)
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {/* Comparison toolbar - shows when 2+ quotes selected */}
                {selectedForComparison.size >= 2 && (
                  <>
                    <button
                      onClick={() => setShowComparisonModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Compare ({selectedForComparison.size})
                    </button>
                    <button
                      onClick={clearSelection}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Clear
                    </button>
                  </>
                )}
                {!isReadOnly && (
                  <>
                    <button
                      onClick={() => setShowPDFExtractor(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Upload className="h-4 w-4" />
                      Upload PDF Quote
                    </button>
                    <button
                      onClick={() => setShowAddQuoteForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Manual
                    </button>
                    {extractedQuotes.length >= 2 && (
                      <button
                        onClick={() => setShowQuoteComparison(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Compare Extracted
                      </button>
                    )}
                  </>
                )}

                {/* Export dropdown - available when there are quotes */}
                {(project.quotes?.length || 0) > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Download className="h-4 w-4" />
                      Export
                      <svg className={`h-4 w-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showExportMenu && (
                      <>
                        {/* Backdrop to close menu */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowExportMenu(false)}
                        />
                        {/* Dropdown menu */}
                        <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          <button
                            onClick={() => {
                              exportQuotesToExcel(project.quotes || [], { projectName: project.title });
                              setShowExportMenu(false);
                              toast.success('Exported to Excel');
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                            Export to Excel
                          </button>
                          <button
                            onClick={() => {
                              exportQuotesToCSV(project.quotes || [], { projectName: project.title });
                              setShowExportMenu(false);
                              toast.success('Exported to CSV');
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <FileText className="h-4 w-4 text-blue-600" />
                            Export to CSV
                          </button>
                          <button
                            onClick={() => {
                              exportQuotesToJSON(project.quotes || [], { projectName: project.title });
                              setShowExportMenu(false);
                              toast.success('Exported to JSON');
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <FileJson className="h-4 w-4 text-amber-600" />
                            Export to JSON
                          </button>
                          <div className="my-1 border-t border-gray-200 dark:border-slate-700" />
                          <button
                            onClick={() => {
                              exportQuotesToHTML(project.quotes || [], { projectName: project.title });
                              setShowExportMenu(false);
                              toast.success('Opened printable report');
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Printer className="h-4 w-4 text-purple-600" />
                            Print / Save as PDF
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quote Validity Timeline */}
            {(project.quotes?.length || 0) > 0 && project.quotes?.some(q => q.validUntil) && (
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                      <span className="font-medium text-gray-900 dark:text-slate-100">Quote Validity Timeline</span>
                      {project.quotes?.filter(q => {
                        if (!q.validUntil) return false;
                        const daysRemaining = Math.ceil((new Date(q.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysRemaining >= 0 && daysRemaining <= 7;
                      }).length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          {project.quotes?.filter(q => {
                            if (!q.validUntil) return false;
                            const daysRemaining = Math.ceil((new Date(q.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return daysRemaining >= 0 && daysRemaining <= 7;
                          }).length} expiring soon
                        </span>
                      )}
                    </div>
                    <svg className="h-5 w-5 text-gray-400 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                    <QuoteValidityTimeline quotes={project.quotes || []} />
                  </div>
                </details>
              </div>
            )}

            {/* Extracted Quotes Grouped by Company */}
            {extractedQuotes.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">
                    Extracted Quotes ({extractedQuotes.length}) from {companyNames.length} {companyNames.length === 1 ? 'company' : 'companies'}
                  </h4>
                </div>

                {/* Grouped by Company */}
                <div className="space-y-4">
                  {companyNames.map((company) => {
                    const companyQuotes = quotesByCompany[company];
                    const lowestQuote = companyQuotes.reduce((min, q) => q.total < min.total ? q : min, companyQuotes[0]);
                    return (
                      <div key={company} className="rounded-lg border border-blue-300 bg-white p-3 dark:border-blue-500/40 dark:bg-slate-800">
                        {/* Company Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-gray-900 dark:text-slate-100">
                              {company}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              ({companyQuotes.length} {companyQuotes.length === 1 ? 'quote' : 'quotes'})
                            </span>
                          </div>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            From {currencyFormatter.format(lowestQuote.total)}
                          </span>
                        </div>

                        {/* Quotes Grid */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          {companyQuotes.map((eq) => (
                            <div
                              key={eq.id}
                              className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-slate-600 dark:bg-slate-700 cursor-pointer hover:shadow-md transition-shadow relative group"
                              onClick={() => {
                                setSelectedExtractedQuote(eq);
                                setShowQuoteDetails(true);
                              }}
                            >
                              {/* Delete button */}
                              {!isReadOnly && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExtractedQuotes((prev) => prev.filter((q) => q.id !== eq.id));
                                    toast.success('Quote removed');
                                  }}
                                  className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                                  title="Remove quote"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                              <div className="flex items-center justify-between">
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {currencyFormatter.format(eq.total)}
                                </p>
                                <PieChart className="h-4 w-4 text-blue-400" />
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1 text-xs">
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded dark:bg-blue-500/20 dark:text-blue-300">
                                  L: {currencyFormatter.format(eq.labourTotal)}
                                </span>
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded dark:bg-green-500/20 dark:text-green-300">
                                  M: {currencyFormatter.format(eq.materialsTotal)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                {eq.lineItems.length} items • {eq.sourceFileName}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Quote Form - Enhanced */}
            {showAddQuoteForm && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10 space-y-4">
                {/* Title */}
                <input
                  type="text"
                  value={newQuote.title}
                  onChange={(e) => setNewQuote({ ...newQuote, title: e.target.value })}
                  placeholder="Quote title (e.g., Bathroom Renovation)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />

                {/* Contractor Details */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newQuote.contractorName}
                    onChange={(e) => setNewQuote({ ...newQuote, contractorName: e.target.value })}
                    placeholder="Contractor/Company name *"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    value={newQuote.company}
                    onChange={(e) => setNewQuote({ ...newQuote, company: e.target.value })}
                    placeholder="Company (if different)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="tel"
                    value={newQuote.phone}
                    onChange={(e) => setNewQuote({ ...newQuote, phone: e.target.value })}
                    placeholder="Phone"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="email"
                    value={newQuote.email}
                    onChange={(e) => setNewQuote({ ...newQuote, email: e.target.value })}
                    placeholder="Email"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Line Items</label>
                    <button
                      type="button"
                      onClick={addQuoteLineItem}
                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      + Add Room/Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newQuote.lineItems.map((item, index) => (
                      <div key={item.id} className="grid gap-2 sm:grid-cols-4 items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-600">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateQuoteLineItem(item.id, 'description', e.target.value)}
                          placeholder="Room/Item (e.g., Main Bathroom)"
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
                          <input
                            type="number"
                            value={item.labour}
                            onChange={(e) => updateQuoteLineItem(item.id, 'labour', e.target.value)}
                            placeholder="Labour"
                            min="0"
                            step="0.01"
                            className="w-full rounded border border-gray-300 pl-5 pr-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
                          <input
                            type="number"
                            value={item.materials}
                            onChange={(e) => updateQuoteLineItem(item.id, 'materials', e.target.value)}
                            placeholder="Materials"
                            min="0"
                            step="0.01"
                            className="w-full rounded border border-gray-300 pl-5 pr-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            = £{((parseFloat(item.labour) || 0) + (parseFloat(item.materials) || 0)).toLocaleString()}
                          </span>
                          {newQuote.lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuoteLineItem(item.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Total */}
                  <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-slate-600">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      Total: £{newQuote.lineItems.reduce((sum, item) => sum + (parseFloat(item.labour) || 0) + (parseFloat(item.materials) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Terms/Conditions */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Terms & Conditions</label>
                  <textarea
                    value={newQuote.terms}
                    onChange={(e) => setNewQuote({ ...newQuote, terms: e.target.value })}
                    placeholder="e.g., All costs plus VAT. Materials not priced. Subject to no hidden issues..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* VAT & Valid Until */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newQuote.includesVat}
                      onChange={(e) => setNewQuote({ ...newQuote, includesVat: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Prices include VAT
                  </label>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Valid Until</label>
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
                    placeholder="Notes"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 self-end"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowAddQuoteForm(false);
                      setNewQuote({
                        title: '',
                        contractorName: '',
                        company: '',
                        phone: '',
                        email: '',
                        validUntil: '',
                        notes: '',
                        terms: '',
                        includesVat: false,
                        lineItems: [{ id: '1', description: '', labour: '', materials: '' }],
                      });
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddQuote}
                    disabled={!newQuote.contractorName}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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
              <div className="space-y-3">
                {/* Company totals summary */}
                {(() => {
                  const companyTotals = (project.quotes || []).reduce((acc, q) => {
                    const company = q.company || q.contractorName;
                    if (!acc[company]) acc[company] = { total: 0, count: 0 };
                    acc[company].total += q.amount;
                    acc[company].count += 1;
                    return acc;
                  }, {} as Record<string, { total: number; count: number }>);

                  const companiesWithMultiple = Object.entries(companyTotals).filter(([, v]) => v.count > 1);

                  return companiesWithMultiple.length > 0 && (
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800 mb-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Company Totals</p>
                      <div className="flex flex-wrap gap-3">
                        {companiesWithMultiple.map(([company, data]) => (
                          <div key={company} className="text-sm">
                            <span className="text-gray-700 dark:text-slate-300">{company}:</span>{' '}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {currencyFormatter.format(data.total)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400"> ({data.count} quotes)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {project.quotes?.map((quote) => (
                  <div
                    key={quote.id}
                    className={`rounded-lg border p-3 relative group transition-colors ${
                      selectedForComparison.has(quote.id)
                        ? 'border-purple-400 bg-purple-50 dark:border-purple-500 dark:bg-purple-500/10'
                        : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {/* Selection checkbox for comparison */}
                    <label className="absolute top-3 left-3 flex items-center cursor-pointer z-10">
                      <input
                        type="checkbox"
                        checked={selectedForComparison.has(quote.id)}
                        onChange={() => toggleQuoteSelection(quote.id)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-800"
                      />
                    </label>

                    {/* Delete button - always visible on hover */}
                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          const quoteLabel = quote.title || quote.contractorName || 'this quote';
                          if (window.confirm(`Are you sure you want to delete "${quoteLabel}"? This action cannot be undone.`)) {
                            onRemoveQuote(quote.id);
                          }
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                        title="Delete quote"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    <div className="flex items-start justify-between pr-8 pl-7">
                      <div className="flex-1">
                        {/* Title */}
                        {quote.title && (
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-1">{quote.title}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                            {currencyFormatter.format(quote.amount)}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : quote.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          }`}>
                            {quote.status}
                          </span>
                          {quote.includesVat === false && (
                            <span className="text-xs text-orange-600 dark:text-orange-400">+ VAT</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-300">
                          {quote.contractorName}
                          {quote.company && quote.company !== quote.contractorName && ` (${quote.company})`}
                        </p>

                        {/* Line items breakdown */}
                        {quote.manualLineItems && quote.manualLineItems.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {quote.manualLineItems.map((item) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                <span className="font-medium">{item.description}:</span>
                                {item.labour && <span>L: £{item.labour.toLocaleString()}</span>}
                                {item.materials && <span>M: £{item.materials.toLocaleString()}</span>}
                                <span className="text-gray-700 dark:text-slate-300">= £{item.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Terms */}
                        {quote.terms && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic">{quote.terms}</p>
                        )}

                        {quote.notes && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{quote.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      {!isReadOnly && (
                        <div className="flex flex-col gap-1 ml-2">
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
                          {quote.status !== 'pending' && (
                            <button
                              onClick={() => onUpdateQuote(quote.id, { status: 'pending' })}
                              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700"
                            >
                              Reset
                            </button>
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
                <div className="grid gap-3 sm:grid-cols-2">
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
                <div className="grid gap-3 sm:grid-cols-2">
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
                <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="grid gap-2 max-h-60 overflow-y-auto sm:grid-cols-2">
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

      {/* PDF Quote Extractor Modal */}
      <Modal
        isOpen={showPDFExtractor}
        onClose={() => setShowPDFExtractor(false)}
        title="Upload Quote PDF"
        size="2xl"
      >
        <PDFQuoteExtractor
          onQuoteExtracted={handleQuoteExtracted}
          onCancel={() => setShowPDFExtractor(false)}
          projectName={project.title}
        />
      </Modal>

      {/* Quote Comparison Modal (for extracted quotes) */}
      <Modal
        isOpen={showQuoteComparison}
        onClose={() => setShowQuoteComparison(false)}
        title="Compare Quotes"
        size="2xl"
      >
        <QuoteComparisonChart quotes={extractedQuotes} height={400} showBreakdown />
      </Modal>

      {/* Selected Quotes Comparison Modal */}
      <Modal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        title={`Compare ${selectedQuotes.length} Quotes`}
        size="2xl"
      >
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedQuotes.length, 3)}, 1fr)` }}>
            {selectedQuotes.map((quote, index) => {
              const isLowest = quote.amount === Math.min(...selectedQuotes.map(q => q.amount));
              const isHighest = quote.amount === Math.max(...selectedQuotes.map(q => q.amount));
              return (
                <div
                  key={quote.id}
                  className={`rounded-lg border p-4 ${
                    isLowest
                      ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/10'
                      : isHighest
                      ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-500/10'
                      : 'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                        {quote.title || `Quote ${index + 1}`}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {quote.contractorName}
                      </p>
                      {quote.company && quote.company !== quote.contractorName && (
                        <p className="text-xs text-gray-500 dark:text-slate-400">{quote.company}</p>
                      )}
                    </div>
                    {isLowest && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        Lowest
                      </span>
                    )}
                    {isHighest && selectedQuotes.length > 2 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-300">
                        Highest
                      </span>
                    )}
                  </div>
                  <p className={`text-2xl font-bold ${isLowest ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-slate-100'}`}>
                    {currencyFormatter.format(quote.amount)}
                  </p>
                  {quote.includesVat === false && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">+ VAT</p>
                  )}
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : quote.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                  }`}>
                    {quote.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Price Difference Summary */}
          {selectedQuotes.length >= 2 && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-slate-800">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Price Analysis</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-slate-400">Lowest</p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {currencyFormatter.format(Math.min(...selectedQuotes.map(q => q.amount)))}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-slate-400">Highest</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    {currencyFormatter.format(Math.max(...selectedQuotes.map(q => q.amount)))}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-slate-400">Difference</p>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">
                    {currencyFormatter.format(Math.max(...selectedQuotes.map(q => q.amount)) - Math.min(...selectedQuotes.map(q => q.amount)))}
                    <span className="text-xs text-gray-500 dark:text-slate-400 ml-1">
                      ({Math.round(((Math.max(...selectedQuotes.map(q => q.amount)) - Math.min(...selectedQuotes.map(q => q.amount))) / Math.min(...selectedQuotes.map(q => q.amount))) * 100)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Line Items Comparison */}
          {selectedQuotes.some(q => q.manualLineItems && q.manualLineItems.length > 0) && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Line Items Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-slate-400">Item</th>
                      {selectedQuotes.map((quote, index) => (
                        <th key={quote.id} className="text-right py-2 px-3 font-medium text-gray-500 dark:text-slate-400">
                          {quote.contractorName.split(' ')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Get all unique line item descriptions */}
                    {(() => {
                      const allDescriptions = new Set<string>();
                      selectedQuotes.forEach(q => {
                        q.manualLineItems?.forEach(item => allDescriptions.add(item.description));
                      });
                      return Array.from(allDescriptions).map(desc => (
                        <tr key={desc} className="border-b border-gray-100 dark:border-slate-800">
                          <td className="py-2 px-3 text-gray-700 dark:text-slate-300">{desc}</td>
                          {selectedQuotes.map(quote => {
                            const item = quote.manualLineItems?.find(i => i.description === desc);
                            const amounts = selectedQuotes
                              .map(q => q.manualLineItems?.find(i => i.description === desc)?.amount)
                              .filter((a): a is number => a !== undefined);
                            const minAmount = Math.min(...amounts);
                            const maxAmount = Math.max(...amounts);
                            const isMin = item?.amount === minAmount && amounts.length > 1;
                            const isMax = item?.amount === maxAmount && amounts.length > 1 && minAmount !== maxAmount;
                            return (
                              <td key={quote.id} className={`py-2 px-3 text-right ${
                                isMin ? 'text-emerald-600 font-medium dark:text-emerald-400' :
                                isMax ? 'text-red-600 dark:text-red-400' :
                                'text-gray-700 dark:text-slate-300'
                              }`}>
                                {item ? (
                                  <div>
                                    <span>{currencyFormatter.format(item.amount)}</span>
                                    {(item.labour || item.materials) && (
                                      <div className="text-xs text-gray-500 dark:text-slate-400">
                                        {item.labour && <span>L: £{item.labour.toLocaleString()}</span>}
                                        {item.labour && item.materials && ' / '}
                                        {item.materials && <span>M: £{item.materials.toLocaleString()}</span>}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 dark:text-slate-500">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                    {/* Total row */}
                    <tr className="bg-gray-50 dark:bg-slate-800 font-semibold">
                      <td className="py-2 px-3 text-gray-900 dark:text-slate-100">Total</td>
                      {selectedQuotes.map(quote => {
                        const isLowest = quote.amount === Math.min(...selectedQuotes.map(q => q.amount));
                        return (
                          <td key={quote.id} className={`py-2 px-3 text-right ${isLowest ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-slate-100'}`}>
                            {currencyFormatter.format(quote.amount)}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes comparison */}
          {selectedQuotes.some(q => q.notes || q.terms) && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Notes & Terms</h4>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedQuotes.length, 3)}, 1fr)` }}>
                {selectedQuotes.map(quote => (
                  <div key={quote.id} className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      {quote.contractorName}
                    </p>
                    {quote.terms && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 italic">{quote.terms}</p>
                    )}
                    {quote.notes && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{quote.notes}</p>
                    )}
                    {!quote.terms && !quote.notes && (
                      <p className="text-xs text-gray-400 dark:text-slate-500">No notes</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Quote Details Modal */}
      <Modal
        isOpen={showQuoteDetails && !!selectedExtractedQuote}
        onClose={() => {
          setShowQuoteDetails(false);
          setSelectedExtractedQuote(null);
        }}
        title={selectedExtractedQuote ? `${selectedExtractedQuote.contractorName} - Quote Details` : 'Quote Details'}
        size="2xl"
      >
        {selectedExtractedQuote && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-100 rounded-lg p-4 dark:bg-blue-600">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-100">Subtotal</p>
                <p className="text-xl font-bold text-blue-900 dark:text-white">
                  {currencyFormatter.format(selectedExtractedQuote.subtotal)}
                </p>
              </div>
              <div className="bg-gray-200 rounded-lg p-4 dark:bg-slate-600">
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200">VAT {selectedExtractedQuote.vatRate ? `(${selectedExtractedQuote.vatRate}%)` : ''}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {currencyFormatter.format(selectedExtractedQuote.vatAmount || 0)}
                </p>
              </div>
              <div className="bg-emerald-100 rounded-lg p-4 dark:bg-emerald-600">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-100">Total</p>
                <p className="text-xl font-bold text-emerald-900 dark:text-white">
                  {currencyFormatter.format(selectedExtractedQuote.total)}
                </p>
              </div>
            </div>

            {/* Cost Breakdown Chart */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">Cost Breakdown</h4>
              <QuoteCostBreakdownChart quote={selectedExtractedQuote} height={250} />
            </div>

            {/* Itemised Table */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">
                Line Items ({selectedExtractedQuote.lineItems.length})
              </h4>
              <QuoteItemsTable quote={selectedExtractedQuote} enableExport />
            </div>
          </div>
        )}
      </Modal>

      {/* Quote Contractor Creation Modal */}
      {showQuoteContractorModal && pendingQuoteForContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowQuoteContractorModal(false);
              setPendingQuoteForContractor(null);
            }}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Save Contractor?
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Would you like to save this company to your contractors list?
              </p>
            </div>

            {/* Contractor Details */}
            <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {pendingQuoteForContractor.company || pendingQuoteForContractor.contractorName}
                </p>
              </div>
              {pendingQuoteForContractor.contactName && (
                <p className="text-sm text-gray-600 dark:text-slate-400 pl-7">
                  Contact: {pendingQuoteForContractor.contactName}
                </p>
              )}
              <div className="pl-7 space-y-1 text-sm text-gray-500 dark:text-slate-400">
                {pendingQuoteForContractor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {pendingQuoteForContractor.phone}
                  </div>
                )}
                {pendingQuoteForContractor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {pendingQuoteForContractor.email}
                  </div>
                )}
                {pendingQuoteForContractor.address && (
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {pendingQuoteForContractor.address}
                  </p>
                )}
              </div>
            </div>

            {/* Specialty Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Contractor Type
              </label>
              <select
                value={quoteContractorSpecialty}
                onChange={(e) => setQuoteContractorSpecialty(e.target.value as ContractorSpecialty)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {CONTRACTOR_SPECIALTIES.map((spec) => (
                  <option key={spec.value} value={spec.value}>
                    {spec.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowQuoteContractorModal(false);
                  setPendingQuoteForContractor(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Skip
              </button>
              <button
                onClick={handleCreateContractorFromQuote}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Save Contractor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
