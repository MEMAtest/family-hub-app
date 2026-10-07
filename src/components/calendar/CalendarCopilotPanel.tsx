'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { CalendarPlus, CheckCircle2, Clock, ExternalLink, FileUp, Loader2, Mail, MapPin, RefreshCw, Settings2, Sparkles, X, XCircle } from 'lucide-react';
import type { CalendarEvent, Person } from '@/types/calendar.types';
import type { CalendarTask } from '@/types/calendar.types';
import { useFamilyStore } from '@/store/familyStore';
import { GrandirConnection } from './GrandirConnection';
import {
  CalendarImportDraft,
  importDraftToCalendarEventDraft,
  parseCalendarImportText,
} from '@/utils/calendarImport';
import { CalendarAssistantResponse, runCalendarAssistant } from '@/utils/calendarAssistant';
import type { SchoolDocumentRoutine, SchoolDocumentSummary } from '@/utils/schoolDocumentSummary';
import { extractRoutineWeekdays, nextDateForWeekday } from '@/utils/schoolRoutineSchedule';
import { addDays, expandEvents } from '@/utils/recurrence';
import { expandTasks } from '@/utils/tasks';
import { isAdultSchoolEvent, recurringSourceDateWarning, schoolEventTitle, schoolEventAction } from '@/utils/schoolEventPresentation';
import { schoolSavedEventAttendance, type SchoolDraft, type SchoolSourceEvidence } from '@/utils/schoolSources';
import type { NurseryNoticeSummary } from '@/utils/nurseryNoticeSummary';

interface CalendarCopilotPanelProps {
  events: CalendarEvent[];
  tasks: CalendarTask[];
  people: Person[];
  currentDate: Date;
  /** Save a parsed deadline as work with a window, not an event. */
  createTask?: (draft: Omit<CalendarTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CalendarTask>;
  createEvent: (
    draft: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<{ status: 'conflict' } | { status: 'created'; event: CalendarEvent }>;
  onOpenCalendar: () => void;
  onEventsImported?: () => Promise<void>;
  onInboxChanged?: (pendingReview: number, pendingEmails: number) => void;
}

interface CalendarInboxItem {
  id: string;
  sender?: string | null;
  subject?: string | null;
  status: string;
  receivedAt: string;
  autoCreated: number;
  needsReview: number;
  authenticatedSchoolSender?: boolean;
  schoolSource?: SchoolSourceEvidence | null;
  sourceDate?: string | null;
  originalPortalUrl?: string | null;
  nurserySummary?: NurseryNoticeSummary | null;
  nurseryChildId?: string | null;
  nurseryAssignmentWarning?: string | null;
  preparationTask?: { id: string; dueDate: string; completed: boolean } | null;
  duplicateCount: number;
  conflictCount: number;
  parsedDrafts: SchoolDraft[];
  outstandingDrafts?: SchoolDraft[];
  actionRequired?: boolean;
  autoProcessEligibleCount?: number;
  documentSummary?: SchoolDocumentSummary | null;
  attachments?: CalendarAttachment[];
}

interface CalendarAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
}

const inboxItemSummary = (item: CalendarInboxItem) => {
  if (item.preparationTask) return item.preparationTask.completed ? 'Preparation done' : `Added to tasks · due ${item.preparationTask.dueDate}`;
  if (item.nurserySummary) return ({ preparation: 'Things to bring / preparation', routine: 'Recurring nursery routine',
    event: 'Nursery date', reference: 'Learning & nursery update', content_pending: 'Original content needs checking' })[item.nurserySummary.kind];
  if (item.status === 'content_required') return 'Open the original update or add its content';
  if (item.status === 'no_events') return 'No dated events found';
  if (item.status === 'needs_ocr') return 'Attachment needs a text check';

  const issues: string[] = [];
  if (item.needsReview > 0) issues.push(`${item.needsReview} to review`);
  if (item.conflictCount > 0) {
    issues.push(`${item.conflictCount} conflict${item.conflictCount === 1 ? '' : 's'} to check`);
  }
  if (issues.length > 0) return `${item.parsedDrafts.length} parsed · ${issues.join(' · ')}`;
  if (item.autoCreated > 0) return `${item.autoCreated} added to calendar`;
  return `${item.parsedDrafts.length} parsed`;
};

const statusLabel: Record<CalendarImportDraft['importStatus'], string> = {
  ready: 'Ready',
  duplicate: 'Duplicate',
  conflict: 'Conflict',
  needs_review: 'Review',
};

const quickSchedulePromptTemplates = [
  'Add after-school club every Monday at 3:30pm',
  'Add football club every Tuesday at 4pm',
  'Add swimming lesson every Thursday at 5:30pm',
  'Add tutoring every Wednesday at 5pm',
  'Add gyming tomorrow at 6:30am',
];

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const timeToMinutes = (time: string) => {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
};

const hasUnspecifiedEventTime = (event: Pick<CalendarEvent, 'notes'>) =>
  /(?:school email did not specify a time|time not provided by source|time not specified)/i.test(event.notes || '');

const draftHasSpecifiedTime = (draft: CalendarImportDraft) =>
  draft.timeSpecified ?? /\b\d{1,2}(?::|\.)(\d{2})\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(draft.source);

const draftIsImportable = (draft: SchoolDraft) =>
  (draft as SchoolDraft & { importable?: boolean }).importable !== false;

const isChildProfile = (person: Person) =>
  /child|kid|son|daughter|student/i.test(person.role) ||
  /toddler|preschool|child|teen/i.test(person.ageGroup || '');

const extractForwardedEmailFields = (text: string) => {
  const subject = text.match(/^\s*Subject:\s*(.+)$/im)?.[1]?.trim();
  const from = text.match(/^\s*From:\s*(.+)$/im)?.[1]?.trim();
  const withoutHeaders = text
    .replace(/^\s*(From|To|Cc|Bcc|Sent|Date|Subject):\s*.+$/gim, '')
    .trim();

  return {
    subject,
    from,
    text: withoutHeaders || text,
  };
};

const looksLikeForwardedEmail = (text: string) =>
  /^\s*(From|Subject|Sent|To):\s*.+$/im.test(text) ||
  /booking confirmation|ticket confirmation|your tickets|order confirmation/i.test(text);

const CalendarCopilotPanel = ({
  events,
  tasks,
  people,
  currentDate,
  createEvent,
  createTask,
  onOpenCalendar,
  onEventsImported,
  onInboxChanged,
}: CalendarCopilotPanelProps) => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const activeFamilyId = familyId || (typeof window !== 'undefined' ? localStorage.getItem('familyId') : null);
  const [command, setCommand] = useState('');
  const [assistantResult, setAssistantResult] = useState<CalendarAssistantResponse | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const [importText, setImportText] = useState('');
  const [importDrafts, setImportDrafts] = useState<SchoolDraft[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [forwardingAddress, setForwardingAddress] = useState<string | null>(null);
  const [inboxItems, setInboxItems] = useState<CalendarInboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLastSyncAt, setGmailLastSyncAt] = useState<string | null>(null);
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [whatsappDeliveryTrackingConfigured, setWhatsappDeliveryTrackingConfigured] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState('not_configured');
  const [gmailSyncLoading, setGmailSyncLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairAfterId, setRepairAfterId] = useState<string | undefined>();
  const [repairNextCursor, setRepairNextCursor] = useState<string | null>(null);
  const [repairPreview, setRepairPreview] = useState<{
    planHash: string; nextCursor: string | null;
    intakes: Array<{ intakeId: string; institution: string | null;
      draftChanges: Array<{ title: string; beforePersonId: string; afterPersonId: string }>;
      eventChanges: Array<{ eventId: string; title: string; beforePersonId: string; afterPersonId: string }> }>;
  } | null>(null);
  const [repairApprovedIds, setRepairApprovedIds] = useState<Set<string>>(new Set());
  const [activeInboxItemId, setActiveInboxItemId] = useState<string | null>(null);
  const [documentSummary, setDocumentSummary] = useState<SchoolDocumentSummary | null>(null);
  const [documentAttachments, setDocumentAttachments] = useState<CalendarAttachment[]>([]);
  const [routineToSchedule, setRoutineToSchedule] = useState<SchoolDocumentRoutine | null>(null);
  const [routineTime, setRoutineTime] = useState('15:30');
  const [routinePersonId, setRoutinePersonId] = useState(people.find(isChildProfile)?.id || people[0]?.id || '');
  const [routineSaving, setRoutineSaving] = useState(false);
  const [inboxSourceFilter, setInboxSourceFilter] = useState('all');
  const [nurseryDueDate, setNurseryDueDate] = useState('');
  const [nurseryTaskSaving, setNurseryTaskSaving] = useState(false);
  const [importSourceType, setImportSourceType] = useState('pasted-text');
  const [importSourceName, setImportSourceName] = useState<string | null>(null);

  const selectedDrafts = useMemo(
    () => importDrafts.filter((draft) => draft.person && draftIsImportable(draft) && selectedDraftIds.has(draft.importId)),
    [importDrafts, selectedDraftIds]
  );
  const assistantDrafts = assistantResult?.drafts ?? (assistantResult?.draft ? [assistantResult.draft] : []);
  const pendingInboxItems = useMemo(
    () => inboxItems.filter((item) => item.actionRequired ?? (item.status !== 'no_events' && (
      item.needsReview > 0 ||
      item.conflictCount > 0 ||
      item.status === 'needs_ocr' ||
      item.status === 'content_required' ||
      (item.status === 'review_required' && item.autoCreated === 0)
    ))),
    [inboxItems]
  );
  const referenceInboxItems = inboxItems.filter((item) => !pendingInboxItems.includes(item));
  const sourceMatches = (item: CalendarInboxItem) => inboxSourceFilter === 'all' ||
    (inboxSourceFilter === 'nursery' ? item.schoolSource?.institution === 'grandir' : item.schoolSource?.institution !== 'grandir');
  const visiblePendingItems = pendingInboxItems.filter(sourceMatches);
  const visibleReferenceItems = referenceInboxItems.filter(sourceMatches);
  const activeNurseryItem = inboxItems.find(item => item.id === activeInboxItemId && item.nurserySummary);
  const personNameById = useMemo(
    () => new Map(people.map((person) => [person.id, person.name])),
    [people]
  );
  const primaryPersonName = (people.find(isChildProfile) ?? people[0])?.name?.split(' ')[0];
  const quickSchedulePrompts = useMemo(
    () => quickSchedulePromptTemplates.map((prompt) => (
      primaryPersonName ? `${prompt} for ${primaryPersonName}` : prompt
    )),
    [primaryPersonName]
  );
  const peopleForWhereabouts = useMemo(() => {
    const children = people.filter(isChildProfile);
    return children.length > 0 ? children : people;
  }, [people]);
  useEffect(() => {
    if (!routinePersonId && peopleForWhereabouts[0]) setRoutinePersonId(peopleForWhereabouts[0].id);
  }, [peopleForWhereabouts, routinePersonId]);
  const todaysEventsByPerson = useMemo(() => {
    const dateKey = toDateKey(currentDate);
    const grouped = new Map<string, CalendarEvent[]>();
    // Expand before asking what is on. Filtering `event.date` here meant a
    // weekly club only ever counted as "on" during the week it was created, so
    // "where everyone is today" was blank on every later week.
    const live = events.filter((event) => event.status !== 'cancelled' && !recurringSourceDateWarning(event) &&
      !(event.sourceId && isAdultSchoolEvent(event.title) && schoolSavedEventAttendance(event, people).attendeeStatus === 'needs_confirmation'));
    expandEvents(live, addDays(dateKey, -31), addDays(dateKey, 1))
      .filter((occ) => occ.date <= dateKey && occ.endDate >= dateKey)
      .map((occ) => ({ ...occ.event, date: occ.date, endDate: occ.endDate, time: occ.time, duration: occ.duration }))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
      .forEach((event) => {
        const existing = grouped.get(event.person) ?? [];
        grouped.set(event.person, [...existing, event]);
      });
    return grouped;
  }, [currentDate, events, people]);
  const importantThisWeek = useMemo(() => {
    const start = toDateKey(currentDate);
    const end = addDays(start, 6);
    const priorityRank = { high: 0, medium: 1, low: 2 } as const;
    const eventItems = expandEvents(events.filter((event) => event.status !== 'cancelled' && !recurringSourceDateWarning(event)), start, end)
      .map((occurrence) => ({
        id: occurrence.occurrenceId,
        title: occurrence.event.source === 'gmail-school-email' ? schoolEventTitle(occurrence.event.title) : occurrence.event.title,
        date: occurrence.date,
        time: hasUnspecifiedEventTime(occurrence.event) ? '' : occurrence.time,
        location: occurrence.event.location,
        person: occurrence.event.sourceId && isAdultSchoolEvent(occurrence.event.title) &&
          schoolSavedEventAttendance(occurrence.event, people).attendeeStatus === 'needs_confirmation'
          ? 'Adult attendee to confirm' : personNameById.get(occurrence.event.person) || 'Family',
        priority: occurrence.event.priority,
        kind: 'Event' as const,
      }));
    const taskItems = expandTasks(tasks, start, end).filter((occurrence) => !occurrence.completedAt)
      .map((occurrence) => ({
        id: occurrence.occurrenceId,
        title: occurrence.task.title,
        date: occurrence.dueDate,
        time: occurrence.task.dueTime || '',
        location: '',
        person: occurrence.task.assignees.map((id) => personNameById.get(id)).filter(Boolean).join(', ') || 'Family',
        priority: occurrence.task.priority,
        kind: 'Reminder' as const,
      }));
    return [...eventItems, ...taskItems]
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 5);
  }, [currentDate, events, people, personNameById, tasks]);

  const loadInbox = useCallback(async () => {
    if (!activeFamilyId) return;

    setInboxLoading(true);
    setInboxError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/inbox`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Calendar inbox could not be loaded.');
      setForwardingAddress(payload.forwardingAddress ?? null);
      setGmailConnected(Boolean(payload.gmail?.connected));
      setGmailEmail(payload.gmail?.googleUserEmail ?? null);
      setGmailLastSyncAt(payload.gmail?.lastSyncAt ?? null);
      setWhatsappConfigured(Boolean(payload.whatsappConfigured));
      setWhatsappDeliveryTrackingConfigured(Boolean(payload.whatsappDeliveryTrackingConfigured));
      setWhatsappConsent(payload.whatsappConsent || 'not_configured');
      setInboxItems(Array.isArray(payload.intakes) ? payload.intakes : []);
      onInboxChanged?.(
        payload.pendingReviewCount ?? (payload.intakes || []).reduce((count: number, item: CalendarInboxItem) => count + item.needsReview, 0),
        payload.pendingReviewEmailCount ?? 0,
      );
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : 'Calendar inbox could not be loaded.');
    } finally {
      setInboxLoading(false);
    }
  }, [activeFamilyId, onInboxChanged]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const handleGmailAuthMessage = (event: MessageEvent<{ type?: string; message?: string }>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'gmail_auth_success') {
        setImportSuccess('Gmail connected. School and nursery notices will be checked automatically.');
        void loadInbox();
      }
      if (event.data?.type === 'gmail_auth_error') {
        setInboxError(event.data.message || 'Gmail connection failed.');
      }
    };

    window.addEventListener('message', handleGmailAuthMessage);
    return () => window.removeEventListener('message', handleGmailAuthMessage);
  }, [loadInbox]);

  const connectGmail = async () => {
    if (!activeFamilyId) return;
    const authWindow = window.open('about:blank', 'family-hub-gmail-connect', 'width=560,height=720');
    if (!authWindow) {
      setInboxError('Allow pop-ups for Family Hub to connect Gmail.');
      return;
    }

    setInboxError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/gmail/connect`);
      const payload = await response.json();
      if (!response.ok || !payload.authUrl) throw new Error(payload.error || 'Gmail connection could not be started.');
      authWindow.location.assign(payload.authUrl);
    } catch (error) {
      authWindow.close();
      setInboxError(error instanceof Error ? error.message : 'Gmail connection could not be started.');
    }
  };

  const syncGmail = async () => {
    if (!activeFamilyId) return;
    setGmailSyncLoading(true);
    setInboxError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/gmail`, { method: 'POST' });
      const payload = await response.json();
      if (payload.code === 'GMAIL_RECONNECT_REQUIRED') {
        await loadInbox();
        setGmailConnected(false);
        throw new Error(payload.error);
      }
      if (!response.ok || payload.errors?.length) throw new Error(payload.error || payload.errors?.[0] || 'Gmail could not be synced.');
      await loadInbox();
      await onEventsImported?.();
      setImportSuccess(
        payload.processed > 0
          ? `Synced ${payload.processed} email${payload.processed === 1 ? '' : 's'} from Gmail; ${payload.autoCreated} added to the calendar and ${payload.needsReview} left for review.`
          : payload.hasMore ? 'More school notices are waiting. Sync again to continue.' : 'Gmail is up to date. School and nursery notices are checked automatically.',
      );
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : 'Gmail could not be synced.');
    } finally {
      setGmailSyncLoading(false);
    }
  };

  const showInboxItem = (item: CalendarInboxItem) => {
    setIntakeOpen(true);
    const drafts = (item.outstandingDrafts || item.parsedDrafts || []).filter((draft) =>
      !['imported', 'dismissed', 'non_event', 'duplicate'].includes((draft as SchoolDraft & { disposition?: string }).disposition || '')
    ).map((draft) => {
      const title = schoolEventTitle(draft.title);
      const assignedPerson = people.find((person) => person.id === draft.person);
      if (isAdultSchoolEvent(title) && (!assignedPerson || isChildProfile(assignedPerson))) {
        return {
          ...draft,
          title,
          person: '',
          importStatus: draft.importStatus === 'duplicate' ? 'duplicate' as const : 'needs_review' as const,
          warnings: ['Choose the adult attending this school meeting.', ...draft.warnings],
        };
      }
      return { ...draft, title };
    });
    setImportText('');
    setImportDrafts(drafts);
    setDocumentSummary(item.documentSummary ?? null);
    setDocumentAttachments(item.attachments ?? []);
    setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus === 'ready' && draft.person && draftIsImportable(draft)).map((draft) => draft.importId)));
    setActiveInboxItemId(item.id);
    setNurseryDueDate('');
    setImportError(null);
    setImportSuccess(item.autoCreated > 0 ? `${item.autoCreated} already added to your calendar.` : null);
  };

  const reviewInboxItem = async (item: CalendarInboxItem) => {
    showInboxItem(item);
    if (!activeFamilyId || !item.autoProcessEligibleCount) return;
    setImportLoading(true);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/inbox`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-process', intakeId: item.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Confirmed dates could not be added. Try again.');
      showInboxItem({ ...item, ...payload });
      await loadInbox();
      await onEventsImported?.();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Automatic import failed.');
    } finally { setImportLoading(false); }
  };

  const markInboxItemReviewed = async () => {
    if (!activeInboxItemId || !activeFamilyId) return;
    setImporting(true);
    setImportError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/inbox`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeId: activeInboxItemId, createdEventIds: [], needsReview: 0, dismissed: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Inbox review status could not be saved.');
      setActiveInboxItemId(null);
      setIntakeOpen(false);
      setImportSuccess('Marked this email as reviewed.');
      void loadInbox();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Inbox review status could not be saved.');
    } finally {
      setImporting(false);
    }
  };

  const addNurseryPreparation = async () => {
    if (!activeFamilyId || !activeNurseryItem || !nurseryDueDate) return;
    setNurseryTaskSaving(true);
    setImportError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/inbox`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-nursery-task', intakeId: activeNurseryItem.id, dueDate: nurseryDueDate }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not add nursery preparation.');
      await loadInbox();
      await onEventsImported?.();
      setImportSuccess('Nursery preparation added to tasks.');
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Could not add nursery preparation.'); }
    finally { setNurseryTaskSaving(false); }
  };

  const runAssistant = async (commandOverride?: string) => {
    const requestedCommand = (commandOverride ?? command).trim();
    if (!requestedCommand) return;

    setAssistantLoading(true);
    setAssistantError(null);
    setAssistantResult(null);

    try {
      if (activeFamilyId) {
        const response = await fetch(`/api/families/${activeFamilyId}/events/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: requestedCommand,
            today: toDateKey(currentDate),
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Assistant request failed');
        setAssistantResult(payload);
      } else {
        if (people.length === 0) {
          throw new Error('Family members are still loading. Try again in a moment.');
        }
        setAssistantResult(runCalendarAssistant({ command: requestedCommand, events, people, today: currentDate }));
      }
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Could not run assistant request');
    } finally {
      setAssistantLoading(false);
    }
  };

  const runQuickPrompt = (prompt: string) => {
    setCommand(prompt);
    setAssistantResult(null);
    setAssistantError(null);
    void runAssistant(prompt);
  };

  const confirmAssistantDraft = async () => {
    if (assistantDrafts.length === 0) return;

    setSavingDraft(true);
    setAssistantError(null);
    try {
      const createdEvents: CalendarEvent[] = [];
      for (const draft of assistantDrafts) {
        const result = await createEvent(draft);
        if (result.status === 'created') createdEvents.push(result.event);
      }

      if (createdEvents.length > 0) {
        setAssistantResult({
          action: 'search',
          summary: createdEvents.length === 1
            ? `Added "${createdEvents[0].title}" to the calendar.`
            : `Added ${createdEvents.length} daily sessions to the calendar.`,
          results: createdEvents,
          warnings: [],
        });
        setCommand('');
      }
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Could not add the calendar event.');
    } finally {
      setSavingDraft(false);
    }
  };

  const confirmTaskDraft = async () => {
    if (!assistantResult?.taskDraft || !createTask) return;
    setSavingDraft(true);
    setAssistantError(null);
    try {
      const task = await createTask(assistantResult.taskDraft);
      setAssistantResult({
        action: 'create',
        summary: `Saved "${task.title}" as a family reminder.`,
        warnings: [],
      });
      setCommand('');
      onOpenCalendar();
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Could not save this reminder.');
    } finally {
      setSavingDraft(false);
    }
  };

  const scheduleRoutine = async () => {
    if (!routineToSchedule || !routinePersonId) return;
    const weekdays = extractRoutineWeekdays(routineToSchedule.detail);
    if (weekdays.length === 0) {
      setImportError('This routine has no weekday in the source. Use quick create to choose its day and time.');
      return;
    }

    setRoutineSaving(true);
    setImportError(null);
    try {
      let created = 0;
      for (const weekday of weekdays) {
        const result = await createEvent({
          title: routineToSchedule.label,
          person: routinePersonId,
          date: nextDateForWeekday(currentDate, weekday),
          time: routineTime,
          duration: 60,
          location: '',
          recurring: 'weekly',
          isRecurring: true,
          cost: 0,
          type: routineToSchedule.label.toLowerCase().includes('pe') ? 'sport' : 'education',
          notes: routineToSchedule.detail,
          priority: 'medium',
          status: 'confirmed',
        });
        if (result.status === 'created') created += 1;
      }

      if (created > 0) {
        setImportSuccess(`${created} weekly ${routineToSchedule.label.toLowerCase()} session${created === 1 ? '' : 's'} added.`);
        setRoutineToSchedule(null);
        onOpenCalendar();
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not schedule this routine.');
    } finally {
      setRoutineSaving(false);
    }
  };

  const reviewImportText = async (
    text: string,
    sourceType = importSourceType,
    sourceName = importSourceName,
  ) => {
    if (!text.trim()) return;

    setImportLoading(true);
    setImportError(null);
    setImportSuccess(null);
    setActiveInboxItemId(null);
    setImportDrafts([]);
    setSelectedDraftIds(new Set());
    setDocumentAttachments([]);
    setImportText(text);

    try {
      const payload = activeFamilyId
        ? await (async () => {
            const isEmail = looksLikeForwardedEmail(text);
            const response = await fetch(
              '/api/families/' + activeFamilyId + '/calendar-intake' + (isEmail ? '/email' : ''),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isEmail
                  ? {
                      ...extractForwardedEmailFields(text),
                      defaultPersonId: peopleForWhereabouts[0]?.id || people[0]?.id,
                      today: currentDate.toISOString(),
                    }
                  : {
                      text,
                      defaultPersonId: peopleForWhereabouts[0]?.id || people[0]?.id,
                      today: currentDate.toISOString(),
                      sourceType,
                      sourceName,
                    }),
              },
            );
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Calendar import review failed');
            return json;
          })()
        : {
            drafts: parseCalendarImportText({
              text,
              people,
              existingEvents: events,
              defaultPersonId: peopleForWhereabouts[0]?.id || people[0]?.id,
              today: currentDate,
            }),
          };

      const drafts: CalendarImportDraft[] = payload.drafts || [];
      setDocumentSummary(payload.documentSummary ?? null);
      setDocumentAttachments(payload.attachments ?? []);
      setImportDrafts(drafts);
      setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus !== 'duplicate' && draft.person).map((draft) => draft.importId)));
      if (payload.intakeId) setActiveInboxItemId(payload.intakeId);
      if (drafts.length === 0) {
        setImportError(payload.documentSummary
          ? 'No dated calendar events were found. The school update is saved below for reference.'
          : 'No events were found. Try pasting lines with dates such as “Summer Term Ends: Friday 17 July 2026”.');
      }
    } catch (error) {
      setImportError('Could not review imported calendar');
    } finally {
      setImportLoading(false);
    }
  };

  const uploadDocumentFiles = async (files: File[], extractedText: string, sourceType: string, sourceName: string) => {
    if (!activeFamilyId) {
      setImportError('Family database is still connecting. Try the upload again in a moment.');
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportSuccess(null);
    setActiveInboxItemId(null);
    setImportDrafts([]);
    setSelectedDraftIds(new Set());
    setImportSourceType(sourceType);
    setImportSourceName(sourceName);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('file', file));
      if (extractedText.trim()) formData.append('extractedText', extractedText);
      formData.append('sourceType', sourceType);
      formData.append('sourceName', sourceName);
      if (peopleForWhereabouts[0]?.id) formData.append('defaultPersonId', peopleForWhereabouts[0].id);
      formData.append('today', currentDate.toISOString());

      const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/document`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        setDocumentAttachments(payload.attachments ?? []);
        if (payload.intakeId) setActiveInboxItemId(payload.intakeId);
        if (payload.attachments?.length) {
          setImportSuccess('The original document was saved. Upload clearer pages or paste the text to extract events.');
        }
        throw new Error(payload.error || 'School document upload failed');
      }

      const drafts: CalendarImportDraft[] = payload.drafts || [];
      setImportText(payload.text || extractedText);
      setImportDrafts(drafts);
      setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus !== 'duplicate' && draft.person).map((draft) => draft.importId)));
      setDocumentSummary(payload.documentSummary ?? null);
      setDocumentAttachments(payload.attachments ?? []);
      if (payload.intakeId) setActiveInboxItemId(payload.intakeId);
      if (drafts.length === 0) {
        setImportError(payload.documentSummary
          ? 'No dated calendar events were found. The school document is saved below for reference.'
          : 'The document text was extracted, but no dated calendar events were found.');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not save the school document.');
    } finally {
      setImportLoading(false);
    }
  };

  const readImageFiles = async (files: File[]) => {
    setImportError(null);
    setImportSuccess(null);
    setImportSourceType('image');
    setImportSourceName(files.length === 1 ? files[0].name : files.length + ' school pages');
    setImportLoading(true);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const pageTexts: string[] = [];
      try {
        for (const file of files) {
          const result = await worker.recognize(file);
          if (result.data.text.trim()) pageTexts.push(result.data.text.trim());
        }
      } finally {
        await worker.terminate();
      }
      const text = pageTexts.join('\n\n');
      if (!text) {
        setImportError('No readable text was found in those pages. Try clearer photos or paste the newsletter text.');
        return;
      }
      await uploadDocumentFiles(files, text, 'image', files.length === 1 ? files[0].name : files.length + ' school pages');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not read text from those school pages.');
    } finally {
      setImportLoading(false);
    }
  };

  const readImportFile = async (file: File) => {
    setImportError(null);
    setActiveInboxItemId(null);
    setDocumentSummary(null);
    setImportSourceName(file.name);
    setImportSourceType(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text');
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      await uploadDocumentFiles([file], '', 'pdf', file.name);
      return;
    }

    if (file.type.startsWith('image/')) {
      await readImageFiles([file]);
      return;
    }

    const text = await file.text();
    if (!text.trim()) {
      setImportError('This file does not contain readable text. Paste the calendar or email text into the box below.');
      return;
    }

    setImportText(text);
    setDocumentSummary(null);
    setDocumentAttachments([]);
  };

  const reviewImport = () => reviewImportText(importText);

  const toggleDraft = (draftId: string) => {
    setSelectedDraftIds((current) => {
      const next = new Set(current);
      if (next.has(draftId)) {
        next.delete(draftId);
      } else {
        next.add(draftId);
      }
      return next;
    });
  };

  const assignDraftToPerson = async (draftId: string, personId: string) => {
    if (activeInboxItemId && activeFamilyId) {
      setAssignmentSaving(true);
      setImportError(null);
      try {
        const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/inbox`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intakeId: activeInboxItemId, assignments: [{ draftId, personId }] }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Attendee choice could not be saved.');
        setImportDrafts(payload.parsedDrafts);
        setInboxItems((current) => current.map((item) => item.id === activeInboxItemId
          ? { ...item, ...payload } : item));
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Attendee choice could not be saved.');
        return;
      } finally { setAssignmentSaving(false); }
    }
    setImportDrafts((current) => current.map((draft) => draft.importId === draftId ? { ...draft, person: personId } : draft));
    setSelectedDraftIds((current) => {
      const next = new Set(current);
      if (personId) next.add(draftId);
      else next.delete(draftId);
      return next;
    });
  };

  const importSelectedDrafts = async () => {
    if (selectedDrafts.length === 0 || assignmentSaving) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const createdDraftIds = new Set<string>();
      const failedDraftIds = new Set<string>();
      const createdEventIds: string[] = [];
      let lastError: Error | null = null;

      for (const draft of selectedDrafts) {
        try {
          const inboxItem = inboxItems.find((item) => item.id === activeInboxItemId);
          const schoolProvenance = inboxItem?.authenticatedSchoolSender
            ? { source: 'gmail-school-email', sourceId: inboxItem.id }
            : activeInboxItemId ? { source: 'calendar-intake', sourceId: activeInboxItemId } : {};
          const result = await createEvent({ ...importDraftToCalendarEventDraft(draft), ...schoolProvenance });
          if (result.status === 'created') {
            createdDraftIds.add(draft.importId);
            createdEventIds.push(result.event.id);
          } else {
            failedDraftIds.add(draft.importId);
          }
        } catch (error) {
          failedDraftIds.add(draft.importId);
          lastError = error instanceof Error ? error : new Error('Could not add one of the imported events.');
        }
      }

      const createdCount = createdDraftIds.size;
      const failedCount = failedDraftIds.size;

      if (createdCount > 0) {
        const remainingDrafts = importDrafts.filter((draft) => !createdDraftIds.has(draft.importId));
        setImportDrafts(remainingDrafts);
        setSelectedDraftIds(new Set(remainingDrafts.filter((draft) => failedDraftIds.has(draft.importId)).map((draft) => draft.importId)));
        if (remainingDrafts.length === 0) setImportText('');
        setImportSuccess(`${createdCount} event${createdCount === 1 ? '' : 's'} added to the calendar.`);
        onOpenCalendar();
        if (activeInboxItemId && activeFamilyId) {
          try {
            const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/inbox`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ intakeId: activeInboxItemId, createdEventIds,
                needsReview: remainingDrafts.filter((draft) => draft.importStatus !== 'duplicate').length }),
            });
            if (!response.ok) throw new Error('Inbox review status could not be saved.');
            if (remainingDrafts.filter((draft) => draft.importStatus !== 'duplicate').length === 0) setActiveInboxItemId(null);
            void loadInbox();
          } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Inbox review status could not be saved.');
          }
        }
      }

      if (failedCount > 0) {
        setImportError(
          lastError?.message ||
            `${failedCount} event${failedCount === 1 ? '' : 's'} could not be added because of a conflict.`
        );
      }

      if (createdCount === 0 && failedCount === 0) {
        setImportError('No events were added. Review the selected events and try again.');
      }
    } finally {
      setImporting(false);
    }
  };

  const previewAssignmentRepair = async (afterId?: string) => {
    if (!activeFamilyId) return;
    setRepairLoading(true); setImportError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/repair`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'dry-run', afterId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Assignment repair could not be previewed.');
      setRepairPreview(payload); setRepairApprovedIds(new Set());
      setRepairAfterId(afterId); setRepairNextCursor(null);
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Assignment repair could not be previewed.'); }
    finally { setRepairLoading(false); }
  };

  const applyAssignmentRepair = async () => {
    if (!activeFamilyId || !repairPreview) return;
    setRepairLoading(true); setImportError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/calendar-intake/repair`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply', planHash: repairPreview.planHash, afterId: repairAfterId, approvedEventIds: [...repairApprovedIds] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Assignment repair could not be applied.');
      const changes = repairPreview.intakes.flatMap((item) => item.eventChanges).filter((change) => repairApprovedIds.has(change.eventId));
      const store = useFamilyStore.getState();
      store.setEvents(store.events.map((event) => {
        const change = changes.find((value) => value.eventId === event.id);
        return change ? { ...event, person: change.afterPersonId } : event;
      }));
      setRepairNextCursor(repairPreview.nextCursor);
      setRepairPreview(null); setActiveInboxItemId(null); setImportDrafts([]); setSelectedDraftIds(new Set());
      setImportSuccess(`Corrected ${payload.repairedDrafts} previews and ${payload.repairedEvents} saved events. No messages sent.`);
      await loadInbox();
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Assignment repair could not be applied.'); }
    finally { setRepairLoading(false); }
  };

  // `min-w-0` on the section and on both cards below is load-bearing. A grid
  // item defaults to `min-width: auto`, so the horizontally scrolling chip row
  // sets the column's width instead of scrolling within it — which dragged the
  // quick-create input and its Run button clean off a 390px screen, with no way
  // to reach them because the page itself does not scroll sideways.
  return (
    <section className="grid min-w-0 items-start gap-4 border-b border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-2">
      <div className="min-w-0 border-b border-gray-200 pb-3 dark:border-slate-800 md:col-span-2">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Important this week</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Next 7 days, most important first</p>
          </div>
          <Clock className="h-4 w-4 text-[#147c72]" />
        </div>
        {importantThisWeek.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {importantThisWeek.map((item) => (
              <div key={item.id} className="min-w-0 rounded-md border border-gray-200 px-3 py-2 dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-semibold text-gray-900 dark:text-slate-100">{item.title}</p>
                  {item.priority === 'high' && <span className="shrink-0 text-[10px] font-semibold text-rose-700 dark:text-rose-300">Important</span>}
                </div>
                <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-slate-400">
                  {new Date(`${item.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {item.time ? ` · ${item.time}` : ''} · {item.person}{item.location ? ` · ${item.location}` : ''} · {item.kind}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-[#f7fbf8] px-3 py-3 text-xs text-gray-600 dark:bg-slate-950 dark:text-slate-300">Nothing scheduled in the next 7 days.</p>
        )}
      </div>
      <div className="min-w-0 text-gray-900 dark:text-slate-100">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-purple-600" /> School & nursery inbox</h3>
          <button type="button" onClick={() => { setActiveInboxItemId(null); setImportDrafts([]); setImportText(''); setDocumentSummary(null); setDocumentAttachments([]); setImportError(null); setImportSuccess(null); setSelectedDraftIds(new Set()); setIntakeOpen(true); }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium dark:border-slate-700"><FileUp className="h-4 w-4" /> Add document</button>
        </div>
        <GrandirConnection familyId={activeFamilyId} onChanged={async () => { await loadInbox(); await onEventsImported?.(); }} />
        <div className="mb-3 border-b border-gray-200 pb-3 text-xs dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold">
                <Mail className="h-3.5 w-3.5" />
                Gmail school inbox
              </p>
              {inboxLoading ? <p className="mt-1" role="status">Loading school inbox...</p> : gmailConnected && gmailEmail ? (
                <>
                  <p className="mt-1">Connected to {gmailEmail}</p>
                  <p className="mt-1">School and nursery mail is checked at 08:00 and 20:00 London time{gmailLastSyncAt ? ` · Last successful check ${new Date(gmailLastSyncAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' })}` : ''}.</p>
                </>
              ) : gmailEmail ? (
                <p className="mt-1 text-amber-700 dark:text-amber-200">Gmail needs reconnection. Automatic inbox checks are paused until you sign in again.</p>
              ) : (
                <p className="mt-1">Connect Gmail to automatically import Stewart Fleming emails and forward other school emails to a private Family Hub address.</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void (gmailConnected ? syncGmail() : connectGmail())}
                disabled={inboxLoading || gmailSyncLoading || !activeFamilyId}
                className="inline-flex min-h-8 items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {gmailSyncLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                {gmailConnected ? 'Sync Gmail' : gmailEmail ? 'Reconnect Gmail' : 'Connect Gmail'}
              </button>
              <button
                type="button"
                onClick={() => void loadInbox()}
                disabled={inboxLoading || !activeFamilyId}
                aria-label="Refresh calendar email inbox"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:text-purple-100 dark:hover:bg-purple-500/20"
              >
                <RefreshCw className={`h-4 w-4 ${inboxLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {inboxError && <p role="alert" className="mt-2 text-amber-700 dark:text-amber-200">{inboxError}</p>}
          <details className="mt-2 text-gray-500 dark:text-slate-400">
          <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 text-xs font-medium"><Settings2 className="h-3.5 w-3.5" /> Connection & assignment settings</summary>
          {forwardingAddress && <p className="mt-1 break-all text-[11px]">Forward other school emails to {forwardingAddress}</p>}
          <button type="button" onClick={() => void previewAssignmentRepair()} disabled={repairLoading || inboxLoading || !activeFamilyId}
            className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-purple-200 px-2 py-1 font-semibold">
            {repairLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Review school assignments
          </button>
          {repairNextCursor && <button type="button" disabled={repairLoading} onClick={() => void previewAssignmentRepair(repairNextCursor)}
            className="ml-2 inline-flex min-h-9 items-center gap-1.5 px-2 py-1 font-semibold"><RefreshCw className="h-3.5 w-3.5" /> Review next batch</button>}
          {repairPreview && <div className="mt-2 space-y-2 border-t border-purple-200 pt-2">
            <p>{repairPreview.intakes.reduce((count, item) => count + item.draftChanges.length, 0)} preview corrections. Confirm each saved event correction.</p>
            {repairPreview.intakes.flatMap((item) => item.draftChanges.map((change, index) => <p key={`${item.intakeId}-${index}`}>
              {change.title}: {personNameById.get(change.beforePersonId) || 'Unassigned'} to {personNameById.get(change.afterPersonId) || 'Unassigned'} (preview)
            </p>))}
            {repairPreview.intakes.flatMap((item) => item.eventChanges).map((change) => <label key={change.eventId} className="flex items-start gap-2">
              <input type="checkbox" checked={repairApprovedIds.has(change.eventId)} onChange={(event) => setRepairApprovedIds((current) => {
                const next = new Set(current); if (event.target.checked) next.add(change.eventId); else next.delete(change.eventId); return next;
              })} />
              <span>{change.title}: {personNameById.get(change.beforePersonId) || 'Unassigned'} to {personNameById.get(change.afterPersonId) || 'Unassigned'}</span>
            </label>)}
            {repairPreview.nextCursor && <p>Further source records remain. Review the next batch after this one.</p>}
            <button type="button" disabled={repairLoading} onClick={() => void applyAssignmentRepair()} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1 text-white">
              <CheckCircle2 className="h-3.5 w-3.5" /> Apply preview corrections{repairApprovedIds.size ? ` and ${repairApprovedIds.size} event corrections` : ''}
            </button>
          </div>}
          <p className="mt-2 text-[11px]">
            {!whatsappConfigured
              ? 'WhatsApp reminders are not configured yet, so no WhatsApp messages are being sent.'
              : whatsappConsent === 'opted_out'
                ? 'WhatsApp reminders are paused. Send START to the Family Hub WhatsApp number to opt back in.'
                : whatsappConsent !== 'opted_in'
                  ? 'Send START from the intended WhatsApp number to the Family Hub sender to activate reminders.'
                  : whatsappDeliveryTrackingConfigured
                    ? 'WhatsApp reminders and delivery-status tracking are active. Send STOP to pause.'
                    : 'WhatsApp reminders are opted in, but delivery-status tracking still needs setup.'}
          </p>
          </details>
          <p className="mt-2 font-medium text-emerald-700 dark:text-emerald-300">{!gmailConnected && gmailEmail
            ? 'Saved updates remain available. Reconnect Gmail to resume new email checks.'
            : 'Confirmed dates are added automatically. Only unresolved details need review.'}</p>
          <label className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
            Updates for
            <select aria-label="Filter school and nursery updates" value={inboxSourceFilter} onChange={event => setInboxSourceFilter(event.target.value)}
              className="min-h-11 max-w-full rounded-md border border-gray-200 bg-white px-3 text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <option value="all">School & nursery ({inboxItems.length})</option>
              <option value="school">School ({inboxItems.filter(item => item.schoolSource?.institution !== 'grandir').length})</option>
              <option value="nursery">Nursery ({inboxItems.filter(item => item.schoolSource?.institution === 'grandir').length})</option>
            </select>
          </label>
          {visiblePendingItems.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="font-semibold">Needs your decision · {visiblePendingItems.length} update{visiblePendingItems.length === 1 ? '' : 's'}</p>
              {visiblePendingItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void reviewInboxItem(item)}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 border-b border-gray-100 border-l-2 py-2 pl-2 text-left dark:border-b-slate-800 ${item.nurserySummary ? 'border-l-sky-500 hover:text-sky-700' : 'border-l-purple-400 hover:text-purple-700'}`}
                >
                  <span className="min-w-0">
                    <span className="block break-words font-semibold">{item.nurserySummary?.title || item.subject || item.sender || 'Forwarded email'}</span>
                    <span className="block break-words text-[11px] text-gray-500 dark:text-slate-400">{item.schoolSource?.institutionName || 'Source institution to confirm'}</span>
                    {item.nurseryChildId && <span className="block text-[11px] font-semibold text-sky-700 dark:text-sky-300">{personNameById.get(item.nurseryChildId) || 'Child to confirm'} · Nursery</span>}
                    <span className="block text-[11px] opacity-75">
                      {inboxItemSummary(item)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold">Review</span>
                </button>
              ))}
            </div>
          )}
          {!inboxLoading && !inboxError && visiblePendingItems.length === 0 && <p className="mt-3 flex items-center gap-2 text-gray-600 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> No decisions waiting.</p>}
          {visibleReferenceItems.length > 0 && <details className="mt-3">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">Added & reference updates · {visibleReferenceItems.length}</summary>
            {visibleReferenceItems.map((item) => <button key={item.id} type="button" onClick={() => void reviewInboxItem(item)} className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-gray-100 py-2 text-left dark:border-slate-800">
              <span className="min-w-0"><span className="block break-words font-medium">{item.nurserySummary?.title || item.subject || 'School update'}</span><span className="block text-[11px] text-gray-500 dark:text-slate-400">{item.nurserySummary ? inboxItemSummary(item) : item.status === 'no_events' ? 'Saved for reference · no calendar action' : inboxItemSummary(item)}</span></span><span className="text-purple-700 dark:text-purple-300">Open</span>
            </button>)}
          </details>}
        </div>
        {importSuccess && !intakeOpen && <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{importSuccess}</p>}
        <Dialog open={intakeOpen} onClose={() => { if (!importing && !assignmentSaving && !importLoading) setIntakeOpen(false); }} className="relative z-[110]">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <DialogPanel className="flex max-h-[92dvh] w-full flex-col rounded-t-lg bg-white text-gray-900 shadow-xl dark:bg-slate-900 dark:text-slate-100 sm:max-w-2xl sm:rounded-lg">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-slate-700">
            <div className="min-w-0"><DialogTitle className="text-base font-semibold">{activeInboxItemId ? inboxItems.find((item) => item.id === activeInboxItemId)?.subject || 'School update' : 'Add school dates'}</DialogTitle><p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{activeInboxItemId ? 'Decisions & original documents' : 'Document or forwarded email'}</p></div>
            <button type="button" autoFocus aria-label="Close school update" title="Close school update" disabled={importing || assignmentSaving || importLoading} onClick={() => setIntakeOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>
          <div className="min-h-0 overflow-y-auto p-4">
        {importLoading && activeInboxItemId && <p role="status" className="mb-3 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Adding confirmed dates...</p>}
        {activeInboxItemId && (() => {
          const item = inboxItems.find((value) => value.id === activeInboxItemId);
          return item ? <div className="mb-3 border-l-2 border-teal-500 pl-3 text-xs text-gray-600 dark:text-slate-300">
            <p className="font-semibold">{item.schoolSource?.institutionName || documentSummary?.issuer || 'Source institution to confirm'}</p>
            <p className="break-words">From {item.sender || 'Sender unknown'} · Received {new Date(item.receivedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' })}</p>
            {item.sourceDate && <p>Source date: {Number.isFinite(Date.parse(item.sourceDate)) ? new Date(item.sourceDate).toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'Europe/London' }) : item.sourceDate}</p>}
            {item.originalPortalUrl && <p><a href={item.originalPortalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700"><ExternalLink className="h-3 w-3" />Original nursery post</a></p>}
            {item.status === 'content_required' && <p className="mt-1 font-semibold">What you need to do: open the original update and add its text or document. The full content has not been read.</p>}
            {item.schoolSource?.links.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="mt-1 mr-3 inline-flex items-center gap-1 text-teal-700"><ExternalLink className="h-3 w-3" />Open source</a>)}
            {(item.schoolSource?.institution === 'grandir' || item.status === 'content_required') && <p className="mt-1">
              <a href="https://www.app.grandiruk.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-700"><ExternalLink className="h-3 w-3" />Open nursery portal</a>
            </p>}
          </div> : null;
        })()}
        {activeNurseryItem?.nurserySummary && <section aria-label="Nursery notice summary" className="mb-4 border-l-2 border-sky-500 bg-sky-50 px-3 py-3 text-sm dark:bg-sky-950/30">
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">{activeNurseryItem.nurseryChildId ? personNameById.get(activeNurseryItem.nurseryChildId) || 'Child to confirm' : 'Child to confirm'} · {inboxItemSummary(activeNurseryItem)}</p>
          <h4 className="mt-1 break-words font-semibold">{activeNurseryItem.nurserySummary.title}</h4>
          {activeNurseryItem.nurseryAssignmentWarning && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{activeNurseryItem.nurseryAssignmentWarning}</p>}
          <p className="mt-2 break-words text-gray-700 dark:text-slate-200">{activeNurseryItem.nurserySummary.purpose}</p>
          {activeNurseryItem.nurserySummary.timing && <p className="mt-2 text-xs"><strong>When:</strong> {activeNurseryItem.nurserySummary.timing} (from the original notice)</p>}
          {activeNurseryItem.nurserySummary.actions.length > 0 && <div className="mt-3">
            <p className="text-xs font-semibold">What to do</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">{activeNurseryItem.nurserySummary.actions.map((action, index) => <li key={index} className="break-words">{action}</li>)}</ul>
          </div>}
          {activeNurseryItem.nurserySummary.kind === 'reference' && <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Saved as an update, not a future event.</p>}
          {activeNurseryItem.nurserySummary.kind === 'event' && !activeNurseryItem.autoCreated && !importDrafts.length && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">A calendar date could not be confirmed. Check the original notice before adding this event.</p>}
          {activeNurseryItem.nurserySummary.kind === 'preparation' && !activeNurseryItem.preparationTask && <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium">Prepare by<input aria-label="Nursery preparation due date" type="date" value={nurseryDueDate}
              min={new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' })} onChange={event => setNurseryDueDate(event.target.value)}
              className="mt-1 block min-h-11 w-full rounded-md border border-gray-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" /></label>
            <button type="button" onClick={() => void addNurseryPreparation()} disabled={nurseryTaskSaving || !nurseryDueDate || !activeNurseryItem.nurseryChildId}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sky-700 px-3 text-xs font-semibold text-white disabled:opacity-50">
              {nurseryTaskSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Add preparation task</button>
          </div>}
          {activeNurseryItem.nurserySummary.kind === 'routine' && extractRoutineWeekdays(activeNurseryItem.nurserySummary.purpose).length > 0 && <button type="button" onClick={() => {
            setRoutineToSchedule({ label: activeNurseryItem.nurserySummary!.title, detail: activeNurseryItem.nurserySummary!.purpose });
            setRoutinePersonId(activeNurseryItem.nurseryChildId || '');
            setRoutineTime('');
            setDocumentSummary({ issuer: activeNurseryItem.schoolSource?.institutionName || 'Grandir nursery', issueDate: null,
              documentLabel: 'Nursery routine', subjects: [], routines: [] });
          }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-sky-300 bg-white px-3 text-xs font-semibold text-sky-700 dark:bg-slate-950"><CalendarPlus className="h-4 w-4" /> Schedule routine</button>}
        </section>}
        {(!activeInboxItemId || ['content_required', 'needs_ocr'].includes(inboxItems.find((item) => item.id === activeInboxItemId)?.status || '')) && <>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={4}
          placeholder="Paste term dates, forwarded ticket emails, school events, CSV rows, or copied PDF text..."
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <FileUp className="h-4 w-4" />
            Upload PDF/image/CSV
            <input
              type="file"
              accept=".txt,.csv,.tsv,.ics,.pdf,image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (files.length === 0) return;
                if (files.every((file) => file.type.startsWith('image/'))) {
                  void readImageFiles(files);
                } else {
                  void readImportFile(files[0]);
                }
                event.currentTarget.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void reviewImport()}
            disabled={importLoading || !importText.trim()}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Review events
          </button>
        </div>
        </>}
        {importError && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{importError}</p>}
        {importSuccess && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            {importSuccess}
          </div>
        )}
        {activeInboxItemId && importDrafts.length === 0 && (
          <button
            type="button"
            onClick={() => void markInboxItemReviewed()}
            disabled={importing}
            className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#147c72] px-3 py-1.5 text-xs font-semibold text-[#147c72] hover:bg-[#eef7f3] disabled:opacity-50 dark:text-[#56c6b8] dark:hover:bg-slate-800"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Mark reviewed
          </button>
        )}

        {documentSummary && (
          <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-3 text-xs text-teal-950 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{documentSummary.documentLabel} saved for reference</p>
                <p className="mt-1 opacity-80">
                  {documentSummary.issuer || 'School document'}
                  {documentSummary.issueDate ? ' · issued ' + documentSummary.issueDate : ''}
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            </div>
            {documentAttachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {documentAttachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-white px-2 py-1 font-medium text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-slate-950 dark:text-teal-100 dark:hover:bg-teal-500/20"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open {attachment.fileName}
                  </a>
                ))}
              </div>
            )}
            {documentSummary.subjects.length > 0 && (
              <p className="mt-2"><span className="font-semibold">Subjects:</span> {documentSummary.subjects.join(', ')}</p>
            )}
            {documentSummary.routines.length > 0 && (
              <div className="mt-2 space-y-1">
                {documentSummary.routines.map((routine) => {
                  const weekdays = extractRoutineWeekdays(routine.detail);
                  return (
                    <div key={routine.label + routine.detail} className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 flex-1"><span className="font-semibold">{routine.label}:</span> {routine.detail}</p>
                      {weekdays.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoutineToSchedule(routine);
                            setRoutinePersonId(peopleForWhereabouts[0]?.id || '');
                            setImportError(null);
                          }}
                          className="shrink-0 rounded-md border border-teal-300 bg-white px-2 py-1 font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-slate-950 dark:text-teal-100 dark:hover:bg-teal-500/20"
                        >
                          Schedule weekly
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {routineToSchedule && (
              <div className="mt-3 rounded-md border border-teal-300 bg-white p-3 text-gray-900 dark:border-teal-500/40 dark:bg-slate-950 dark:text-slate-100">
                <p className="font-semibold">Schedule {routineToSchedule.label}</p>
                <p className="mt-1 text-[11px] text-gray-600 dark:text-slate-400">
                  Weekly on {extractRoutineWeekdays(routineToSchedule.detail).map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold">
                    Child or family member
                    <select
                      value={routinePersonId}
                      onChange={(event) => setRoutinePersonId(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-900"
                    >
                      {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold">
                    Start time
                    <input
                      type="time"
                      value={routineTime}
                      onChange={(event) => setRoutineTime(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setRoutineToSchedule(null)} className="rounded-md px-2 py-1 text-xs font-semibold text-gray-600 dark:text-slate-300">Cancel</button>
                  <button type="button" onClick={() => void scheduleRoutine()} disabled={routineSaving || !routinePersonId || !routineTime} className="rounded-md bg-[#147c72] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                    {routineSaving ? 'Adding...' : 'Add weekly routine'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {!documentSummary && documentAttachments.length > 0 && (
          <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-3 text-xs text-teal-950 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100">
            <p className="font-semibold">Original document saved</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {documentAttachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-white px-2 py-1 font-medium text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-slate-950 dark:text-teal-100 dark:hover:bg-teal-500/20"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open {attachment.fileName}
                </a>
              ))}
            </div>
          </div>
        )}

        {importDrafts.length > 0 && (
          <div className="mt-3 space-y-2">
            {importDrafts.map((draft) => (
              <div
                key={draft.importId}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${draft.title}`}
                  checked={selectedDraftIds.has(draft.importId)}
                  onChange={() => toggleDraft(draft.importId)}
                  disabled={!draft.person || !draftIsImportable(draft) || draft.importStatus === 'duplicate' || importLoading || importing}
                  className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs font-semibold text-gray-900 dark:text-slate-100">{draft.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      draft.importStatus === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : draft.importStatus === 'duplicate'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {statusLabel[draft.importStatus]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                    {draft.date}{draft.endDate ? ` to ${draft.endDate}` : ''}{draftHasSpecifiedTime(draft) ? ` at ${draft.time}` : ' · Time not specified'}
                  </p>
                  <label className="mt-1 flex items-center gap-2 text-[11px] font-medium text-gray-600 dark:text-slate-300">
                    Attendee
                    <select
                      aria-label={`Assign ${draft.title} to`}
                      value={draft.person || ''}
                      disabled={assignmentSaving || importing || importLoading}
                      onChange={(event) => void assignDraftToPerson(draft.importId, event.target.value)}
                      className="min-w-0 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="">Choose attendee</option>
                      {people.filter((person) => !isAdultSchoolEvent(draft.title) || !isChildProfile(person)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </label>
                  {draft.schoolAssignment?.concernedMemberIds?.length ? <p className="mt-1 text-[11px] text-gray-600 dark:text-slate-300">
                    Concerns {draft.schoolAssignment.concernedMemberIds.map((id) => personNameById.get(id)).filter(Boolean).join(', ')}
                  </p> : null}
                  {isAdultSchoolEvent(draft.title) && !draft.person && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Adult attendee to confirm</p>}
                  {schoolEventAction(draft.source) && <p className="mt-1 break-words text-[11px] text-gray-600 dark:text-slate-300"><strong>What you need to do:</strong> {schoolEventAction(draft.source)}</p>}
                  <details className="mt-1 text-[11px] text-gray-500"><summary>Original event text</summary><p className="mt-1 break-words">{draft.source}</p></details>
                  {draft.warnings.length > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                      <XCircle className="h-3 w-3" />
                      {draft.warnings[0]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs text-gray-500 dark:text-slate-400">{selectedDrafts.length > 0 ? `${selectedDrafts.length} selected` : activeNurseryItem ? inboxItemSummary(activeNurseryItem) : 'Nothing selected for import'}</p>
            {importDrafts.length > 0 ? <button type="button" onClick={() => void importSelectedDrafts()} disabled={selectedDrafts.length === 0 || importing || assignmentSaving || importLoading} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#147c72] px-4 text-sm font-semibold text-white disabled:opacity-50">{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Import {selectedDrafts.length}</button> : <button type="button" onClick={() => setIntakeOpen(false)} disabled={importLoading || importing} className="min-h-11 rounded-md bg-[#147c72] px-4 text-sm font-semibold text-white disabled:opacity-50">Done</button>}
          </div>
        </DialogPanel>
        </div>
        </Dialog>
      </div>

      <div className="min-w-0 border-t border-gray-200 pt-3 dark:border-slate-800 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#147c72]" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Quick plan</h3>
        </div>
        {peopleForWhereabouts.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Today
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {peopleForWhereabouts.map((person) => {
                const personEvents = todaysEventsByPerson.get(person.id) ?? [];
                const nextEvent = personEvents[0];
                return (
                  <div
                    key={person.id}
                    className="rounded-md border border-[#dde5e0] bg-[#fbfdfb] px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-gray-900 dark:text-slate-100">
                        {person.icon ? `${person.icon} ` : ''}{person.name}
                      </p>
                      <span className="shrink-0 text-[11px] font-medium text-[#147c72] dark:text-[#56c6b8]">
                        {personEvents.length === 0 ? 'No plans' : `${personEvents.length} today`}
                      </span>
                    </div>
                    {nextEvent ? (
                      <div className="mt-1 space-y-0.5 text-[11px] text-gray-600 dark:text-slate-300">
                        <p className="break-words font-medium text-gray-800 dark:text-slate-200">{schoolEventTitle(nextEvent.title)}</p>
                        <p className="flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 shrink-0" />
                        {hasUnspecifiedEventTime(nextEvent) ? 'Time to confirm' : nextEvent.time}
                          {nextEvent.location ? (
                            <>
                              <MapPin className="ml-1 h-3 w-3 shrink-0" />
                              <span className="truncate">{nextEvent.location}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">No location</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">Nothing scheduled</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <details className="mb-3 text-xs text-gray-500 dark:text-slate-400"><summary className="min-h-9 cursor-pointer py-2">Routine suggestions</summary><div className="flex flex-col gap-1">
          {quickSchedulePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => runQuickPrompt(prompt)}
              className="min-h-10 text-left text-xs font-medium text-[#38534d] hover:text-[#147c72] dark:text-slate-300 dark:hover:text-[#56c6b8]"
            >
              {prompt.replace(/^Add /, '')}
            </button>
          ))}
        </div></details>
        <div className="flex min-w-0 gap-2">
          <input
            aria-label="Quick plan"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void runAssistant();
            }}
            placeholder="Askia brings toys on Tuesdays and Fridays"
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#147c72] focus:outline-none focus:ring-2 focus:ring-[#147c72]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => void runAssistant()}
            disabled={assistantLoading || !command.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#147c72] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {assistantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Preview
          </button>
        </div>

        {assistantError && <p className="mt-2 text-xs text-red-600">{assistantError}</p>}

        {assistantResult && (
          <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-slate-950">
            <p className="font-medium text-gray-900 dark:text-slate-100">{assistantResult.summary}</p>
            {assistantResult.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-amber-700 dark:text-amber-300">
                {assistantResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {assistantDrafts.length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-3 dark:border-slate-800">
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {assistantDrafts.map((draft, index) => (
                    <div key={`${draft.date}-${draft.time}-${index}`} className="flex items-baseline justify-between gap-3 py-1 text-xs">
                      <p className="min-w-0 truncate font-semibold text-gray-900 dark:text-slate-100">
                        {draft.title}
                        {personNameById.get(draft.person) ? (
                          <span className="ml-1 font-normal text-gray-500 dark:text-slate-400">
                            for {personNameById.get(draft.person)}
                          </span>
                        ) : null}
                      </p>
                      <p className="shrink-0 text-gray-500 dark:text-slate-400">{draft.date} at {draft.time}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void confirmAssistantDraft()}
                  disabled={savingDraft}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md bg-[#147c72] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {assistantDrafts.length === 1 ? 'Confirm and add' : `Confirm and add ${assistantDrafts.length}`}
                </button>
              </div>
            )}
            {assistantResult.taskDraft && (
              <div className="mt-3 border-t border-gray-200 pt-3 dark:border-slate-800">
                <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
                  <p className="min-w-0 truncate font-semibold text-gray-900 dark:text-slate-100">
                    📝 {assistantResult.taskDraft.subject ? `${assistantResult.taskDraft.subject}: ` : ''}
                    {assistantResult.taskDraft.title}
                  </p>
                  <p className="shrink-0 text-gray-500 dark:text-slate-400">
                    {assistantResult.taskDraft.recurringPattern?.daysOfWeek?.length
                      ? `Every ${assistantResult.taskDraft.recurringPattern.daysOfWeek.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(' & ')}`
                      : `Due ${assistantResult.taskDraft.dueDate}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingDraft || !createTask}
                  onClick={() => void confirmTaskDraft()}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md bg-[#147c72] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {savingDraft ? 'Saving...' : assistantResult.taskDraft.recurringPattern ? 'Add repeating reminder' : 'Add reminder'}
                </button>
              </div>
            )}
            {assistantResult.results && assistantResult.results.length > 0 && (
              <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                {assistantResult.results.map((event) => (
                  <div key={event.id} className="rounded-md border border-gray-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">{event.title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{event.date} at {event.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </section>
  );
};

export default CalendarCopilotPanel;
