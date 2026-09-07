'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, Clock, ExternalLink, FileUp, Loader2, Mail, MapPin, RefreshCw, Search, Sparkles, XCircle } from 'lucide-react';
import type { CalendarEvent, Person } from '@/types/calendar.types';
import { useFamilyStore } from '@/store/familyStore';
import {
  CalendarImportDraft,
  importDraftToCalendarEventDraft,
  parseCalendarImportText,
} from '@/utils/calendarImport';
import { CalendarAssistantResponse, runCalendarAssistant } from '@/utils/calendarAssistant';
import type { SchoolDocumentRoutine, SchoolDocumentSummary } from '@/utils/schoolDocumentSummary';
import { extractRoutineWeekdays, nextDateForWeekday } from '@/utils/schoolRoutineSchedule';

interface CalendarCopilotPanelProps {
  events: CalendarEvent[];
  people: Person[];
  currentDate: Date;
  createEvent: (
    draft: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<{ status: 'conflict' } | { status: 'created'; event: CalendarEvent }>;
  onOpenCalendar: () => void;
}

interface CalendarInboxItem {
  id: string;
  sender?: string | null;
  subject?: string | null;
  status: string;
  receivedAt: string;
  autoCreated: number;
  needsReview: number;
  duplicateCount: number;
  conflictCount: number;
  parsedDrafts: CalendarImportDraft[];
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
  people,
  currentDate,
  createEvent,
  onOpenCalendar,
}: CalendarCopilotPanelProps) => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const activeFamilyId = familyId || (typeof window !== 'undefined' ? localStorage.getItem('familyId') : null);
  const [command, setCommand] = useState('');
  const [assistantResult, setAssistantResult] = useState<CalendarAssistantResponse | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const [importText, setImportText] = useState('');
  const [importDrafts, setImportDrafts] = useState<CalendarImportDraft[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [forwardingAddress, setForwardingAddress] = useState<string | null>(null);
  const [inboxItems, setInboxItems] = useState<CalendarInboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailSyncLoading, setGmailSyncLoading] = useState(false);
  const [activeInboxItemId, setActiveInboxItemId] = useState<string | null>(null);
  const [documentSummary, setDocumentSummary] = useState<SchoolDocumentSummary | null>(null);
  const [documentAttachments, setDocumentAttachments] = useState<CalendarAttachment[]>([]);
  const [routineToSchedule, setRoutineToSchedule] = useState<SchoolDocumentRoutine | null>(null);
  const [routineTime, setRoutineTime] = useState('15:30');
  const [routinePersonId, setRoutinePersonId] = useState(people[0]?.id || '');
  const [routineSaving, setRoutineSaving] = useState(false);
  const [importSourceType, setImportSourceType] = useState('pasted-text');
  const [importSourceName, setImportSourceName] = useState<string | null>(null);

  const selectedDrafts = useMemo(
    () => importDrafts.filter((draft) => selectedDraftIds.has(draft.importId)),
    [importDrafts, selectedDraftIds]
  );
  const assistantDrafts = assistantResult?.drafts ?? (assistantResult?.draft ? [assistantResult.draft] : []);
  const pendingInboxItems = useMemo(
    () => inboxItems.filter((item) => item.needsReview > 0 || item.conflictCount > 0 || item.status === 'review_required' || item.status === 'needs_ocr' || item.documentSummary),
    [inboxItems]
  );
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
  const todaysEventsByPerson = useMemo(() => {
    const dateKey = toDateKey(currentDate);
    const grouped = new Map<string, CalendarEvent[]>();
    events
      .filter((event) => {
        if (event.status === 'cancelled') return false;
        const endDate = event.endDate || event.date;
        return event.date <= dateKey && endDate >= dateKey;
      })
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
      .forEach((event) => {
        const existing = grouped.get(event.person) ?? [];
        grouped.set(event.person, [...existing, event]);
      });
    return grouped;
  }, [currentDate, events]);

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
      setInboxItems(Array.isArray(payload.intakes) ? payload.intakes : []);
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : 'Calendar inbox could not be loaded.');
    } finally {
      setInboxLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const handleGmailAuthMessage = (event: MessageEvent<{ type?: string; message?: string }>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'gmail_auth_success') {
        setImportSuccess('Gmail connected. Forward school emails to the Family Hub address below, then sync.');
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
    setInboxError(null);
    try {
      const response = await fetch(`/api/families/${activeFamilyId}/gmail/connect`);
      const payload = await response.json();
      if (!response.ok || !payload.authUrl) throw new Error(payload.error || 'Gmail connection could not be started.');
      window.open(payload.authUrl, 'family-hub-gmail-connect', 'width=560,height=720');
    } catch (error) {
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
      if (!response.ok) throw new Error(payload.error || 'Gmail could not be synced.');
      await loadInbox();
      setImportSuccess(
        payload.processed > 0
          ? `Synced ${payload.processed} forwarded email${payload.processed === 1 ? '' : 's'} from Gmail.`
          : 'Gmail is up to date. Forward an email to the Family Hub address to import it.',
      );
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : 'Gmail could not be synced.');
    } finally {
      setGmailSyncLoading(false);
    }
  };

  const reviewInboxItem = (item: CalendarInboxItem) => {
    const drafts = item.parsedDrafts || [];
    setImportText('');
    setImportDrafts(drafts);
    setDocumentSummary(item.documentSummary ?? null);
    setDocumentAttachments(item.attachments ?? []);
    setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus !== 'duplicate').map((draft) => draft.importId)));
    setActiveInboxItemId(item.id);
    setImportError(null);
    setImportSuccess(`Loaded ${drafts.length} event${drafts.length === 1 ? '' : 's'} from "${item.subject || item.sender || 'forwarded email'}".`);
  };

  const runQuickPrompt = (prompt: string) => {
    setCommand(prompt);
    setAssistantResult(null);
    setAssistantError(null);
  };

  const runAssistant = async () => {
    if (!command.trim()) return;

    setAssistantLoading(true);
    setAssistantError(null);
    setAssistantResult(null);

    try {
      if (activeFamilyId) {
        const response = await fetch(`/api/families/${activeFamilyId}/events/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command,
            today: currentDate.toISOString(),
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Assistant request failed');
        setAssistantResult(payload);
      } else {
        if (people.length === 0) {
          throw new Error('Family members are still loading. Try again in a moment.');
        }
        setAssistantResult(runCalendarAssistant({ command, events, people, today: currentDate }));
      }
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Could not run assistant request');
    } finally {
      setAssistantLoading(false);
    }
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
                      defaultPersonId: people[0]?.id,
                      today: currentDate.toISOString(),
                    }
                  : {
                      text,
                      defaultPersonId: people[0]?.id,
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
              defaultPersonId: people[0]?.id,
              today: currentDate,
            }),
          };

      const drafts: CalendarImportDraft[] = payload.drafts || [];
      setDocumentSummary(payload.documentSummary ?? null);
      setDocumentAttachments(payload.attachments ?? []);
      setImportDrafts(drafts);
      setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus !== 'duplicate').map((draft) => draft.importId)));
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
      if (people[0]?.id) formData.append('defaultPersonId', people[0].id);
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
      setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus !== 'duplicate').map((draft) => draft.importId)));
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

  const importSelectedDrafts = async () => {
    if (selectedDrafts.length === 0) return;

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
          const result = await createEvent(importDraftToCalendarEventDraft(draft));
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
          await fetch(`/api/families/${activeFamilyId}/calendar-intake/inbox`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intakeId: activeInboxItemId, createdEventIds }),
          });
          setActiveInboxItemId(null);
          void loadInbox();
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

  return (
    <section className="grid gap-3 border-b border-gray-200 bg-[#f7fbf8] p-3 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-2">
      <div className="rounded-lg border border-[#dde5e0] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Add school dates</h3>
        </div>
        <div className="mb-3 rounded-md border border-purple-100 bg-purple-50 p-3 text-xs text-purple-900 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold">
                <Mail className="h-3.5 w-3.5" />
                Gmail school inbox
              </p>
              {gmailConnected && gmailEmail ? (
                <>
                  <p className="mt-1">Connected to {gmailEmail}</p>
                  {forwardingAddress && (
                    <p className="mt-1 break-all font-mono text-[11px]">Forward to {forwardingAddress}</p>
                  )}
                </>
              ) : (
                <p className="mt-1">Connect Gmail to import school emails you forward to a private Family Hub address.</p>
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
                {gmailConnected ? 'Sync Gmail' : 'Connect Gmail'}
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
          {inboxError && <p className="mt-2 text-amber-700 dark:text-amber-200">{inboxError}</p>}
          {pendingInboxItems.length > 0 && (
            <div className="mt-3 space-y-2">
              {pendingInboxItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => reviewInboxItem(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-purple-200 bg-white px-3 py-2 text-left hover:border-purple-400 dark:border-purple-500/30 dark:bg-slate-950 dark:hover:border-purple-300"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.subject || item.sender || 'Forwarded email'}</span>
                    <span className="block text-[11px] opacity-75">
                      {item.parsedDrafts.length} parsed, {item.needsReview} to review
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold">Review</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
          {selectedDrafts.length > 0 && (
            <button
              type="button"
              onClick={() => void importSelectedDrafts()}
              disabled={importing}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-[#147c72] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Import {selectedDrafts.length}
            </button>
          )}
        </div>
        {importError && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{importError}</p>}
        {importSuccess && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            {importSuccess}
          </div>
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
                            setRoutinePersonId(people[0]?.id || '');
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
                  <button type="button" onClick={() => void scheduleRoutine()} disabled={routineSaving || !routinePersonId} className="rounded-md bg-[#147c72] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
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
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {importDrafts.map((draft) => (
              <label
                key={draft.importId}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <input
                  type="checkbox"
                  checked={selectedDraftIds.has(draft.importId)}
                  onChange={() => toggleDraft(draft.importId)}
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
                    {draft.date}{draft.endDate ? ` to ${draft.endDate}` : ''} at {draft.time}
                  </p>
                  {draft.warnings.length > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                      <XCircle className="h-3 w-3" />
                      {draft.warnings[0]}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#dde5e0] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#147c72]" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Search or quick create</h3>
        </div>
        {peopleForWhereabouts.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Where everyone is today
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
                        {personEvents.length === 0 ? 'Free' : `${personEvents.length} today`}
                      </span>
                    </div>
                    {nextEvent ? (
                      <div className="mt-1 space-y-0.5 text-[11px] text-gray-600 dark:text-slate-300">
                        <p className="truncate font-medium text-gray-800 dark:text-slate-200">{nextEvent.title}</p>
                        <p className="flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 shrink-0" />
                          {nextEvent.time}
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
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">No calendar location today</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {quickSchedulePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => runQuickPrompt(prompt)}
              className="shrink-0 rounded-full border border-[#dde5e0] bg-[#f7fbf8] px-3 py-1.5 text-xs font-medium text-[#38534d] hover:border-[#147c72] hover:bg-[#eef7f3] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[#56c6b8]"
            >
              {prompt.replace(/^Add /, '')}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void runAssistant();
            }}
            placeholder="Find summer holidays, or create swimming lesson next Tuesday at 5pm"
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#147c72] focus:outline-none focus:ring-2 focus:ring-[#147c72]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => void runAssistant()}
            disabled={assistantLoading || !command.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#147c72] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {assistantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Run
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
