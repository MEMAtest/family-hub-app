'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, FileUp, Loader2, Search, Sparkles, XCircle } from 'lucide-react';
import type { CalendarEvent, Person } from '@/types/calendar.types';
import { useFamilyStore } from '@/store/familyStore';
import {
  CalendarImportDraft,
  importDraftToCalendarEventDraft,
  parseCalendarImportText,
} from '@/utils/calendarImport';
import { CalendarAssistantResponse, runCalendarAssistant } from '@/utils/calendarAssistant';

interface CalendarCopilotPanelProps {
  events: CalendarEvent[];
  people: Person[];
  currentDate: Date;
  createEvent: (
    draft: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<{ status: 'conflict' } | { status: 'created'; event: CalendarEvent }>;
  onOpenCalendar: () => void;
}

const statusLabel: Record<CalendarImportDraft['importStatus'], string> = {
  ready: 'Ready',
  duplicate: 'Duplicate',
  conflict: 'Conflict',
  needs_review: 'Review',
};

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
  const [importing, setImporting] = useState(false);

  const selectedDrafts = useMemo(
    () => importDrafts.filter((draft) => selectedDraftIds.has(draft.importId)),
    [importDrafts, selectedDraftIds]
  );

  const runAssistant = async () => {
    if (!command.trim()) return;

    setAssistantLoading(true);
    setAssistantError(null);
    setAssistantResult(null);

    try {
      if (familyId) {
        const response = await fetch(`/api/families/${familyId}/events/assistant`, {
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
        setAssistantResult(runCalendarAssistant({ command, events, people, today: currentDate }));
      }
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Could not run assistant request');
    } finally {
      setAssistantLoading(false);
    }
  };

  const confirmAssistantDraft = async () => {
    if (!assistantResult?.draft) return;

    setSavingDraft(true);
    try {
      const result = await createEvent(assistantResult.draft);
      if (result.status === 'created') {
        setAssistantResult({
          action: 'search',
          summary: `Added "${result.event.title}" to the calendar.`,
          results: [result.event],
          warnings: [],
        });
        setCommand('');
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const readImportFile = async (file: File) => {
    setImportError(null);
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (!familyId) {
        setImportError('Family database is still connecting. Try the PDF again in a moment.');
        return;
      }

      setImportLoading(true);
      setImportDrafts([]);
      setSelectedDraftIds(new Set());
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (people[0]?.id) formData.append('defaultPersonId', people[0].id);
        formData.append('today', currentDate.toISOString());

        const response = await fetch(`/api/families/${familyId}/calendar-intake/pdf`, {
          method: 'POST',
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'PDF calendar import failed');

        const drafts: CalendarImportDraft[] = payload.drafts || [];
        setImportText(payload.text || '');
        setImportDrafts(drafts);
        setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus !== 'duplicate').map((draft) => draft.importId)));
        if (drafts.length === 0) {
          setImportError('The PDF text was extracted, but no dated calendar events were found.');
        }
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Could not read calendar events from that PDF.');
      } finally {
        setImportLoading(false);
      }
      return;
    }

    if (file.type.startsWith('image/')) {
      setImportLoading(true);
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const result = await worker.recognize(file);
        await worker.terminate();
        const text = result.data.text.trim();
        if (!text) {
          setImportError('No readable text was found in that image. Try a clearer image or paste the calendar text.');
          return;
        }
        setImportText(text);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Could not read text from that image.');
      } finally {
        setImportLoading(false);
      }
      return;
    }

    const text = await file.text();
    if (!text.trim()) {
      setImportError('This file does not contain readable text. Paste the school calendar text into the box below.');
      return;
    }

    setImportText(text);
  };

  const reviewImport = async () => {
    if (!importText.trim()) return;

    setImportLoading(true);
    setImportError(null);
    setImportDrafts([]);
    setSelectedDraftIds(new Set());

    try {
      const payload = familyId
        ? await (async () => {
            const isEmail = looksLikeForwardedEmail(importText);
            const response = await fetch(`/api/families/${familyId}/calendar-intake${isEmail ? '/email' : ''}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(isEmail
                ? {
                    ...extractForwardedEmailFields(importText),
                    defaultPersonId: people[0]?.id,
                    today: currentDate.toISOString(),
                  }
                : {
                    text: importText,
                    defaultPersonId: people[0]?.id,
                    today: currentDate.toISOString(),
                  }),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Calendar import review failed');
            return json;
          })()
        : {
            drafts: parseCalendarImportText({
              text: importText,
              people,
              existingEvents: events,
              defaultPersonId: people[0]?.id,
              today: currentDate,
            }),
          };

      const drafts: CalendarImportDraft[] = payload.drafts || [];
      setImportDrafts(drafts);
      setSelectedDraftIds(new Set(drafts.filter((draft) => draft.importStatus !== 'duplicate').map((draft) => draft.importId)));
      if (drafts.length === 0) {
        setImportError('No events were found. Try pasting lines with dates such as “Summer Term Ends: Friday 17 July 2026”.');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not review imported calendar');
    } finally {
      setImportLoading(false);
    }
  };

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
    try {
      for (const draft of selectedDrafts) {
        await createEvent(importDraftToCalendarEventDraft(draft));
      }
      setImportText('');
      setImportDrafts([]);
      setSelectedDraftIds(new Set());
      onOpenCalendar();
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="grid gap-3 border-b border-gray-200 bg-[#f7fbf8] p-3 dark:border-slate-800 dark:bg-slate-950 md:grid-cols-2">
      <div className="rounded-lg border border-[#dde5e0] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#147c72]" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Ask Family Hub</h3>
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
            {assistantResult.draft && (
              <div className="mt-3 flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{assistantResult.draft.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {assistantResult.draft.date} at {assistantResult.draft.time} • {assistantResult.draft.type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void confirmAssistantDraft()}
                  disabled={savingDraft}
                  className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[#147c72] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm and add
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

      <div className="rounded-lg border border-[#dde5e0] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Import school calendar</h3>
        </div>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={4}
          placeholder="Paste term dates, forwarded ticket emails, school events, CSV rows, or copied PDF text..."
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <FileUp className="h-4 w-4" />
            Upload PDF/image/CSV
            <input
              type="file"
              accept=".txt,.csv,.tsv,.ics,.pdf,image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readImportFile(file);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void reviewImport()}
            disabled={importLoading || !importText.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Review events
          </button>
          {selectedDrafts.length > 0 && (
            <button
              type="button"
              onClick={() => void importSelectedDrafts()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#147c72] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Import {selectedDrafts.length}
            </button>
          )}
        </div>
        {importError && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{importError}</p>}

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
    </section>
  );
};

export default CalendarCopilotPanel;
