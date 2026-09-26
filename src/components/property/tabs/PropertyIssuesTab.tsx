'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
  Loader2,
  Mic,
  MicOff,
  PoundSterling,
  Sparkles,
  X,
} from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { createId } from '@/utils/id';
import { enhanceIssueText } from '@/services/propertyIssueService';
import {
  ISSUE_AREAS,
  ISSUE_AREA_LABELS,
  ISSUE_URGENCIES,
  ISSUE_URGENCY_LABELS,
  taskCategoryFor,
  toYMD,
} from '@/utils/propertyIssueRules';
import type {
  PropertyIssue,
  PropertyIssueArea,
  PropertyIssueDraft,
  PropertyIssueUrgency,
  PropertyTask,
} from '@/types/property.types';
import { IssueCard } from '../issues/IssueCard';

const EXAMPLES = [
  'Gutters need clearing',
  'Windows need a clean',
  'Bathroom sealant going mouldy',
  'Radiator in the kids’ room is cold',
  'Fence panel loose at the back',
];

const URGENCY_RANK: Record<PropertyIssueUrgency, number> = { urgent: 0, soon: 1, routine: 2, someday: 3 };

const TASK_PRIORITY: Record<PropertyIssueUrgency, PropertyTask['priority']> = {
  urgent: 'urgent',
  soon: 'short',
  routine: 'medium',
  someday: 'long',
};

const CALENDAR_PRIORITY: Record<PropertyIssueUrgency, 'high' | 'medium' | 'low'> = {
  urgent: 'high',
  soon: 'medium',
  routine: 'low',
  someday: 'low',
};

interface ReviewDraft extends PropertyIssueDraft {
  key: string;
  time: string;
  addToCalendar: boolean;
  addToTasks: boolean;
  alreadyLogged?: string; // date an open issue with the same title was logged
}

const sameJob = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

type ListFilter = 'open' | 'done' | 'all';

// Minimal typing for the browser speech API (not in the TS DOM lib)
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

interface PropertyIssuesTabProps {
  isReadOnly: boolean;
}

export const PropertyIssuesTab = ({ isReadOnly }: PropertyIssuesTabProps) => {
  const issues = useFamilyStore((state) => state.propertyIssues);
  const addPropertyIssues = useFamilyStore((state) => state.addPropertyIssues);
  const updatePropertyIssue = useFamilyStore((state) => state.updatePropertyIssue);
  const removePropertyIssue = useFamilyStore((state) => state.removePropertyIssue);
  const addPropertyTask = useFamilyStore((state) => state.addPropertyTask);
  const updatePropertyTask = useFamilyStore((state) => state.updatePropertyTask);
  const propertyTasks = useFamilyStore((state) => state.propertyTasks);
  const profile = useFamilyStore((state) => state.propertyProfile);
  const people = useFamilyStore((state) => state.people);
  const { createEvent, updateEvent, deleteEvent } = useCalendarContext();

  const [text, setText] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [draftSource, setDraftSource] = useState<'ai' | 'rules'>('rules');
  const [filter, setFilter] = useState<ListFilter>('open');
  const [areaFilter, setAreaFilter] = useState<PropertyIssueArea | 'all'>('all');
  const [listening, setListening] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const today = toYMD(new Date());
  const speechSupported = useMemo(() => Boolean(getSpeechRecognition()), []);

  const adults = useMemo(() => {
    const grownUps = people.filter((person) => person.ageGroup === 'Adult' || person.role === 'Parent');
    return grownUps.length > 0 ? grownUps : people;
  }, [people]);

  useEffect(() => {
    if (!assigneeId && adults.length > 0) setAssigneeId(adults[0].id);
  }, [adults, assigneeId]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const postcode = useMemo(
    () => profile.address?.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i)?.[0] ?? 'SE20',
    [profile.address]
  );

  const findHelpUrl = (issue: PropertyIssue) =>
    issue.diy
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to ${issue.title} UK`)}`
      : `https://www.google.com/maps/search/${encodeURIComponent(`${issue.trade} near ${postcode}`)}`;

  // ---------------------------------------------------------------
  // Capture
  // ---------------------------------------------------------------

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'en-GB';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as ArrayLike<any>)
        .map((result: any) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (transcript) {
        setText((current) => (current ? `${current.trim()}\n${transcript}` : transcript));
      }
    };
    recognition.onerror = (event: any) => {
      if (event?.error !== 'aborted' && event?.error !== 'no-speech') {
        toast.error('Could not use the microphone. Check browser permissions.');
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const handleEnhance = async () => {
    const note = text.trim();
    if (!note || enhancing) return;
    recognitionRef.current?.stop();
    setEnhancing(true);
    try {
      const result = await enhanceIssueText(note);
      setDraftSource(result.source);
      const stillOpen = useFamilyStore.getState().propertyIssues
        .filter((issue) => issue.status === 'open' || issue.status === 'scheduled');
      setDrafts(
        result.drafts.map((draft) => {
          const existing = stillOpen.find((issue) => sameJob(issue.title, draft.title) || sameJob(issue.sourceText, draft.sourceText));
          return {
            ...draft,
            key: createId('draft'),
            time: draft.diy ? '10:00' : '09:00',
            // Only put pressing jobs straight into the calendar; everything goes on the task list.
            // A repeat of an open issue is not synced again unless ticked.
            addToCalendar: !existing && (draft.urgency === 'urgent' || draft.urgency === 'soon'),
            addToTasks: !existing,
            alreadyLogged: existing
              ? new Date(existing.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : undefined,
          };
        })
      );
      setText('');
    } finally {
      setEnhancing(false);
    }
  };

  const updateDraft = (key: string, updates: Partial<ReviewDraft>) =>
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...updates } : draft)));

  const removeDraft = (key: string) => setDrafts((current) => current.filter((draft) => draft.key !== key));

  // ---------------------------------------------------------------
  // Sync helpers
  // ---------------------------------------------------------------

  const buildTask = (issue: PropertyIssue): PropertyTask => {
    const now = new Date().toISOString();
    return {
      id: createId('task'),
      title: issue.title,
      category: taskCategoryFor(issue, useFamilyStore.getState().propertyTasks.map((task) => task.category)),
      conditionRating: issue.urgency === 'urgent' ? 3 : issue.urgency === 'soon' ? 2 : 1,
      priority: TASK_PRIORITY[issue.urgency],
      impact: issue.safetyNote || issue.sourceText,
      timeframe: ISSUE_URGENCY_LABELS[issue.urgency],
      recommendedContractor: issue.diy ? 'DIY' : issue.trade,
      defaultCostRange: issue.costRange,
      status: 'outstanding',
      nextDueDate: issue.scheduledDate || issue.suggestedDate,
      recurrence: issue.recurrence,
      attachments: [],
      workLogs: [],
      source: 'owner',
      createdAt: now,
      updatedAt: now,
    };
  };

  const calendarDraft = (issue: PropertyIssue, date: string, time: string) => {
    const cost = issue.costRange ? `£${issue.costRange.min}–£${issue.costRange.max}` : 'not estimated';
    return {
      title: `Home: ${issue.title}`,
      person: assigneeId || adults[0]?.id || '',
      date,
      time,
      duration: issue.diy ? 120 : 60,
      location: profile.address,
      recurring: 'none' as const,
      cost: 0,
      type: (issue.diy ? 'personal' : 'appointment') as 'personal' | 'appointment',
      notes: [
        `Logged issue: "${issue.sourceText}"`,
        issue.diy ? 'DIY job' : `Trade: ${issue.trade}`,
        `Estimated cost: ${cost}`,
        issue.safetyNote ? `Safety: ${issue.safetyNote}` : '',
        issue.steps.length ? `Next steps:\n- ${issue.steps.join('\n- ')}` : '',
      ].filter(Boolean).join('\n'),
      isRecurring: false,
      priority: CALENDAR_PRIORITY[issue.urgency],
      status: 'confirmed' as const,
    };
  };

  // Returns the calendar event id, or undefined if it could not be created.
  const pushToCalendar = async (issue: PropertyIssue, date: string, time: string) => {
    if (!assigneeId && adults.length === 0) {
      toast.error('Add a family member first so the event has someone to belong to');
      return undefined;
    }
    const draft = calendarDraft(issue, date, time);
    const existing = issue.calendarEventId
      ? useFamilyStore.getState().events.find((event) => event.id === issue.calendarEventId)
      : undefined;

    if (existing) {
      await updateEvent(existing.id, draft);
      return existing.id;
    }
    const result = await createEvent(draft);
    return result.status === 'created' ? result.event.id : undefined;
  };

  // ---------------------------------------------------------------
  // Save reviewed drafts
  // ---------------------------------------------------------------

  const handleSaveDrafts = async () => {
    if (drafts.length === 0 || saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const created: PropertyIssue[] = [];
    let calendarCount = 0;
    let taskCount = 0;
    let calendarFailures = 0;

    try {
      for (const draft of drafts) {
        const { key: _key, time, addToCalendar, addToTasks, ...fields } = draft;
        let issue: PropertyIssue = {
          ...fields,
          title: fields.title.trim() || 'Untitled issue',
          trade: fields.diy ? 'DIY' : fields.trade.trim() || 'Handyman',
          id: createId('issue'),
          status: 'open',
          enhancedBy: draftSource,
          createdAt: now,
          updatedAt: now,
        };

        if (addToTasks) {
          const task = buildTask(issue);
          addPropertyTask(task);
          issue = { ...issue, linkedTaskId: task.id };
          taskCount += 1;
        }

        if (addToCalendar && issue.suggestedDate) {
          try {
            const eventId = await pushToCalendar(issue, issue.suggestedDate, time);
            if (eventId) {
              issue = {
                ...issue,
                status: 'scheduled',
                scheduledDate: issue.suggestedDate,
                scheduledTime: time,
                calendarEventId: eventId,
              };
              calendarCount += 1;
            } else {
              calendarFailures += 1;
            }
          } catch (error) {
            console.error('Failed to add issue to calendar:', error);
            calendarFailures += 1;
          }
        }

        created.push(issue);
      }

      addPropertyIssues(created);
      setDrafts([]);

      const parts = [`${created.length} issue${created.length === 1 ? '' : 's'} logged`];
      if (taskCount) parts.push(`${taskCount} added to tasks`);
      if (calendarCount) parts.push(`${calendarCount} in calendar`);
      toast.success(parts.join(' · '));
      if (calendarFailures) {
        toast.error(`${calendarFailures} couldn't be added to the calendar. Use Schedule on the issue to retry.`);
      }
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------
  // Issue actions
  // ---------------------------------------------------------------

  const handleSchedule = async (issue: PropertyIssue, date: string, time: string) => {
    try {
      const eventId = await pushToCalendar(issue, date, time);
      if (!eventId) {
        toast.error('Could not add to calendar');
        return;
      }
      updatePropertyIssue(issue.id, {
        status: 'scheduled',
        scheduledDate: date,
        scheduledTime: time,
        calendarEventId: eventId,
      });
      if (issue.linkedTaskId) {
        updatePropertyTask(issue.linkedTaskId, { nextDueDate: date, updatedAt: new Date().toISOString() });
      }
      toast.success(issue.calendarEventId ? 'Calendar updated' : 'Added to calendar');
    } catch (error) {
      console.error('Failed to schedule issue:', error);
      toast.error('Could not add to calendar. Check your connection and try again.');
    }
  };

  const handleAddToTasks = (issue: PropertyIssue) => {
    const task = buildTask(issue);
    addPropertyTask(task);
    updatePropertyIssue(issue.id, { linkedTaskId: task.id });
    toast.success('Added to property tasks');
  };

  const handleMarkDone = (issue: PropertyIssue) => {
    const now = new Date();
    updatePropertyIssue(issue.id, { status: 'done', completedAt: now.toISOString() });
    if (issue.linkedTaskId && propertyTasks.some((task) => task.id === issue.linkedTaskId)) {
      updatePropertyTask(issue.linkedTaskId, { status: 'completed', updatedAt: now.toISOString() });
    }

    if (issue.recurrence) {
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (issue.recurrence.unit === 'year') next.setFullYear(next.getFullYear() + issue.recurrence.interval);
      else next.setMonth(next.getMonth() + issue.recurrence.interval);
      const nextDate = toYMD(next);
      const stamp = now.toISOString();
      addPropertyIssues([{
        ...issue,
        id: createId('issue'),
        status: 'open',
        suggestedDate: nextDate,
        scheduledDate: undefined,
        scheduledTime: undefined,
        calendarEventId: undefined,
        linkedTaskId: undefined,
        completedAt: undefined,
        createdAt: stamp,
        updatedAt: stamp,
      }]);
      toast.success(`Done! Next one logged for ${next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    } else {
      toast.success('Nice one, marked as done');
    }
  };

  const handleReopen = (issue: PropertyIssue) => {
    updatePropertyIssue(issue.id, {
      status: issue.calendarEventId ? 'scheduled' : 'open',
      completedAt: undefined,
    });
    if (issue.linkedTaskId && propertyTasks.some((task) => task.id === issue.linkedTaskId)) {
      updatePropertyTask(issue.linkedTaskId, { status: 'outstanding', updatedAt: new Date().toISOString() });
    }
  };

  const handleDelete = async (issue: PropertyIssue) => {
    const hasEvent = issue.calendarEventId
      && useFamilyStore.getState().events.some((event) => event.id === issue.calendarEventId);
    const message = hasEvent
      ? `Delete "${issue.title}"? Its calendar event will be removed too.`
      : `Delete "${issue.title}"?`;
    if (!window.confirm(message)) return;

    removePropertyIssue(issue.id);
    if (hasEvent) {
      try {
        await deleteEvent(issue.calendarEventId!);
      } catch (error) {
        console.error('Failed to remove calendar event for issue:', error);
        toast.error('Issue deleted, but the calendar event could not be removed');
        return;
      }
    }
    toast.success('Issue deleted');
  };

  // ---------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------

  const openIssues = useMemo(() => issues.filter((issue) => issue.status === 'open' || issue.status === 'scheduled'), [issues]);

  const stats = useMemo(() => {
    const estimate = openIssues.reduce((sum, issue) => {
      if (!issue.costRange) return sum;
      return sum + (issue.costRange.min + issue.costRange.max) / 2;
    }, 0);
    return {
      open: openIssues.length,
      urgent: openIssues.filter((issue) => issue.urgency === 'urgent').length,
      scheduled: openIssues.filter((issue) => issue.calendarEventId).length,
      estimate: Math.round(estimate / 10) * 10,
    };
  }, [openIssues]);

  const visibleIssues = useMemo(() => {
    const byStatus = filter === 'open'
      ? openIssues
      : filter === 'done'
        ? issues.filter((issue) => issue.status === 'done')
        : issues;
    const byArea = areaFilter === 'all' ? byStatus : byStatus.filter((issue) => issue.area === areaFilter);
    return [...byArea].sort((a, b) => {
      if (filter === 'done') return (b.completedAt || '').localeCompare(a.completedAt || '');
      const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (rank !== 0) return rank;
      return (a.scheduledDate || a.suggestedDate || '9999').localeCompare(b.scheduledDate || b.suggestedDate || '9999');
    });
  }, [issues, openIssues, filter, areaFilter]);

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <div className="space-y-5">
      {!isReadOnly && (
        <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-5 dark:border-blue-500/30 dark:from-blue-500/10 dark:to-indigo-500/10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Spotted something?</h3>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-slate-300">
            Type or say it how you&apos;d text it. AI works out the trade, cost and timing, then adds it to your tasks and calendar.
          </p>

          <div className="mt-3 flex items-start gap-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleEnhance();
                }
              }}
              rows={2}
              maxLength={2000}
              placeholder="e.g. gutters overflowing at the back, and the windows need a clean"
              className="min-h-[3.5rem] flex-1 resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              aria-label="Describe the issue"
            />
            {speechSupported && (
              <button
                onClick={toggleListening}
                className={`rounded-lg p-3 transition-colors ${
                  listening
                    ? 'animate-pulse bg-red-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                aria-label={listening ? 'Stop listening' : 'Speak the issue'}
                title={listening ? 'Stop listening' : 'Speak the issue'}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void handleEnhance()}
              disabled={!text.trim() || enhancing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {enhancing ? 'Working it out…' : 'Log it'}
            </button>
            {!text && drafts.length === 0 && EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setText(example);
                  textareaRef.current?.focus();
                }}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {example}
              </button>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm dark:border-purple-500/40 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-300" />
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                Check {drafts.length === 1 ? 'this' : `these ${drafts.length}`} before saving
              </h3>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {draftSource === 'ai' ? 'Structured by AI' : 'Structured with built-in rules'}
              </span>
            </div>
            {adults.length > 1 && (
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                Calendar for
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {adults.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {drafts.map((draft) => (
              <div key={draft.key} className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <input
                    value={draft.title}
                    onChange={(event) => updateDraft(draft.key, { title: event.target.value })}
                    className={`${inputClass} font-medium`}
                    aria-label="Title"
                  />
                  <button
                    onClick={() => removeDraft(draft.key)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
                    aria-label="Remove this issue"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {draft.alreadyLogged && (
                  <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    Looks like one you already logged on {draft.alreadyLogged} and is still open. Remove it with the × or save it again on purpose.
                  </p>
                )}

                {draft.safetyNote && (
                  <div className="mt-2 flex gap-2 rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-500/10 dark:text-red-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {draft.safetyNote}
                  </div>
                )}

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="text-xs text-gray-500 dark:text-slate-400">
                    Area
                    <select
                      value={draft.area}
                      onChange={(event) => updateDraft(draft.key, { area: event.target.value as PropertyIssueArea })}
                      className={`${inputClass} mt-1`}
                    >
                      {ISSUE_AREAS.map((area) => (
                        <option key={area} value={area}>{ISSUE_AREA_LABELS[area]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-gray-500 dark:text-slate-400">
                    When
                    <select
                      value={draft.urgency}
                      onChange={(event) => {
                        const urgency = event.target.value as PropertyIssueUrgency;
                        updateDraft(draft.key, { urgency, addToCalendar: urgency === 'urgent' || urgency === 'soon' ? true : draft.addToCalendar });
                      }}
                      className={`${inputClass} mt-1`}
                    >
                      {ISSUE_URGENCIES.map((urgency) => (
                        <option key={urgency} value={urgency}>{ISSUE_URGENCY_LABELS[urgency]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-gray-500 dark:text-slate-400">
                    Who
                    <input
                      value={draft.diy ? 'DIY' : draft.trade}
                      disabled={draft.diy}
                      onChange={(event) => updateDraft(draft.key, { trade: event.target.value })}
                      className={`${inputClass} mt-1 disabled:opacity-60`}
                    />
                  </label>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Cost (£)
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={draft.costRange?.min ?? ''}
                        onChange={(event) => updateDraft(draft.key, {
                          costRange: { min: Number(event.target.value) || 0, max: draft.costRange?.max ?? 0, currency: 'GBP' },
                        })}
                        className={inputClass}
                        aria-label="Minimum cost"
                      />
                      <span>–</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.costRange?.max ?? ''}
                        onChange={(event) => updateDraft(draft.key, {
                          costRange: { min: draft.costRange?.min ?? 0, max: Number(event.target.value) || 0, currency: 'GBP' },
                        })}
                        className={inputClass}
                        aria-label="Maximum cost"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-slate-200">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={draft.diy}
                      onChange={(event) => updateDraft(draft.key, { diy: event.target.checked })}
                      className="rounded text-blue-600"
                    />
                    DIY
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={draft.addToTasks}
                      onChange={(event) => updateDraft(draft.key, { addToTasks: event.target.checked })}
                      className="rounded text-blue-600"
                    />
                    Add to tasks
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={draft.addToCalendar}
                      onChange={(event) => updateDraft(draft.key, { addToCalendar: event.target.checked })}
                      className="rounded text-blue-600"
                    />
                    Add to calendar
                  </label>
                  {draft.addToCalendar && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={draft.suggestedDate || today}
                        min={today}
                        onChange={(event) => updateDraft(draft.key, { suggestedDate: event.target.value })}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        aria-label="Date"
                      />
                      <input
                        type="time"
                        value={draft.time}
                        onChange={(event) => updateDraft(draft.key, { time: event.target.value })}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        aria-label="Time"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setDrafts([])}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Discard
            </button>
            <button
              onClick={() => void handleSaveDrafts()}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save {drafts.length === 1 ? 'issue' : `${drafts.length} issues`}
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Open', value: stats.open, icon: ClipboardList, tone: 'text-blue-600 dark:text-blue-300' },
          { label: 'Urgent', value: stats.urgent, icon: AlertTriangle, tone: 'text-red-600 dark:text-red-300' },
          { label: 'In calendar', value: stats.scheduled, icon: CalendarCheck, tone: 'text-green-600 dark:text-green-300' },
          { label: 'Est. to fix', value: `£${stats.estimate.toLocaleString('en-GB')}`, icon: PoundSterling, tone: 'text-amber-600 dark:text-amber-300' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <Icon className={`h-4 w-4 ${tone}`} />
              {label}
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-slate-700" role="tablist">
            {(['open', 'done', 'all'] as ListFilter[]).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1 text-sm capitalize transition-colors ${
                  filter === value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <select
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value as PropertyIssueArea | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Filter by area"
          >
            <option value="all">All areas</option>
            {ISSUE_AREAS.filter((area) => issues.some((issue) => issue.area === area)).map((area) => (
              <option key={area} value={area}>{ISSUE_AREA_LABELS[area]}</option>
            ))}
          </select>
        </div>

        {visibleIssues.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visibleIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                today={today}
                isReadOnly={isReadOnly}
                findHelpUrl={findHelpUrl(issue)}
                onSchedule={handleSchedule}
                onAddToTasks={handleAddToTasks}
                onMarkDone={handleMarkDone}
                onReopen={handleReopen}
                onDelete={(target) => void handleDelete(target)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center dark:border-slate-700">
            <ClipboardList className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-slate-600" />
            <p className="font-medium text-gray-700 dark:text-slate-200">
              {filter === 'done' ? 'Nothing finished yet' : issues.length === 0 ? 'No issues logged yet' : 'Nothing here'}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {filter === 'done'
                ? 'Completed jobs will show up here.'
                : 'Jot things down as you notice them. They only take a few seconds.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
