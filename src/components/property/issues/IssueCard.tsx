'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ExternalLink,
  Hammer,
  ListPlus,
  Repeat,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { PropertyIssue } from '@/types/property.types';
import { ISSUE_AREA_LABELS, ISSUE_URGENCY_LABELS } from '@/utils/propertyIssueRules';

export const URGENCY_STYLES: Record<PropertyIssue['urgency'], string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
  soon: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  routine: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  someday: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
};

const formatShortDate = (ymd?: string) => {
  if (!ymd) return '';
  const date = new Date(`${ymd}T12:00:00`);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatCost = (issue: PropertyIssue) => {
  if (!issue.costRange) return null;
  const { min, max } = issue.costRange;
  return min === max ? `£${min}` : `£${min}–£${max}`;
};

// Lower-case the trade for a sentence, but keep registered names like "Gas Safe" and "NICEIC".
const tradeLabel = (trade: string) =>
  trade.toLowerCase().replace(/gas safe/g, 'Gas Safe').replace(/niceic/g, 'NICEIC');

const recurrenceLabel = (issue: PropertyIssue) => {
  if (!issue.recurrence) return null;
  const { interval, unit } = issue.recurrence;
  if (interval === 1) return unit === 'year' ? 'Yearly' : 'Monthly';
  return `Every ${interval} ${unit}s`;
};

interface IssueCardProps {
  issue: PropertyIssue;
  today: string;
  isReadOnly: boolean;
  findHelpUrl: string;
  onSchedule: (issue: PropertyIssue, date: string, time: string) => Promise<void>;
  onAddToTasks: (issue: PropertyIssue) => void;
  onMarkDone: (issue: PropertyIssue) => void;
  onReopen: (issue: PropertyIssue) => void;
  onDelete: (issue: PropertyIssue) => void;
}

export const IssueCard = ({
  issue,
  today,
  isReadOnly,
  findHelpUrl,
  onSchedule,
  onAddToTasks,
  onMarkDone,
  onReopen,
  onDelete,
}: IssueCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(issue.scheduledDate || issue.suggestedDate || today);
  const [time, setTime] = useState(issue.scheduledTime || (issue.diy ? '10:00' : '09:00'));

  const isDone = issue.status === 'done';
  const dueDate = issue.scheduledDate || issue.suggestedDate;
  const isOverdue = !isDone && !!dueDate && dueDate < today;
  const cost = formatCost(issue);
  const repeat = recurrenceLabel(issue);

  const handleSchedule = async () => {
    setSaving(true);
    try {
      await onSchedule(issue, date, time);
      setScheduling(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 ${
        issue.urgency === 'urgent' && !isDone
          ? 'border-red-200 dark:border-red-500/40'
          : 'border-gray-200 dark:border-slate-700'
      } ${isDone ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[issue.urgency]}`}>
              {ISSUE_URGENCY_LABELS[issue.urgency]}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
              {ISSUE_AREA_LABELS[issue.area]}
            </span>
            {issue.room && issue.room !== ISSUE_AREA_LABELS[issue.area] && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                {issue.room}
              </span>
            )}
            {issue.enhancedBy === 'ai' && (
              <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-300" title="Structured by AI">
                <Sparkles className="h-3 w-3" />
                AI
              </span>
            )}
          </div>

          <h4 className={`font-semibold text-gray-900 dark:text-slate-100 ${isDone ? 'line-through' : ''}`}>
            {issue.title}
          </h4>
          {issue.sourceText && issue.sourceText !== issue.title && (
            <p className="mt-0.5 text-xs italic text-gray-500 dark:text-slate-400">&ldquo;{issue.sourceText}&rdquo;</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Hammer className="h-3.5 w-3.5 text-gray-400" />
              {issue.diy ? 'DIY' : issue.trade}
            </span>
            {cost && <span className="font-medium text-gray-900 dark:text-slate-100">{cost}</span>}
            {dueDate && !isDone && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'font-medium text-red-600 dark:text-red-300' : ''}`}>
                {issue.calendarEventId ? <CalendarCheck className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5 text-gray-400" />}
                {isOverdue ? 'Overdue · ' : issue.status === 'scheduled' ? '' : 'Suggested '}
                {formatShortDate(dueDate)}
                {issue.status === 'scheduled' && issue.scheduledTime ? ` ${issue.scheduledTime}` : ''}
              </span>
            )}
            {isDone && issue.completedAt && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-300">
                <Check className="h-3.5 w-3.5" />
                Done {formatShortDate(issue.completedAt.slice(0, 10))}
              </span>
            )}
            {repeat && (
              <span className="flex items-center gap-1 text-xs">
                <Repeat className="h-3.5 w-3.5 text-gray-400" />
                {repeat}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {issue.calendarEventId && (
              <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-500/10 dark:text-green-300">
                In calendar
              </span>
            )}
            {issue.linkedTaskId && (
              <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-500/10 dark:text-green-300">
                In property tasks
              </span>
            )}
          </div>
        </div>
      </div>

      {issue.safetyNote && !isDone && (
        <div className="mt-3 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{issue.safetyNote}</span>
        </div>
      )}

      {issue.steps.length > 0 && (
        <button
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Hide next steps' : 'Next steps'}
        </button>
      )}
      {expanded && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-slate-300">
          {issue.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      {scheduling && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
          <label className="text-xs text-gray-600 dark:text-slate-300">
            Date
            <input
              type="date"
              value={date}
              min={today}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="text-xs text-gray-600 dark:text-slate-300">
            Time
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <button
            onClick={handleSchedule}
            disabled={saving || !date || !time}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : issue.calendarEventId ? 'Update calendar' : 'Add to calendar'}
          </button>
          <button
            onClick={() => setScheduling(false)}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
        {!isReadOnly && !isDone && (
          <>
            <button
              onClick={() => onMarkDone(issue)}
              className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
            >
              <Check className="h-3.5 w-3.5" />
              Done
            </button>
            <button
              onClick={() => setScheduling((value) => !value)}
              className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              {issue.calendarEventId ? 'Reschedule' : 'Schedule'}
            </button>
            {!issue.linkedTaskId && (
              <button
                onClick={() => onAddToTasks(issue)}
                className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ListPlus className="h-3.5 w-3.5" />
                Add to tasks
              </button>
            )}
          </>
        )}
        {!isReadOnly && isDone && (
          <button
            onClick={() => onReopen(issue)}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reopen
          </button>
        )}
        {!isDone && (
          <a
            href={findHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
          >
            {issue.diy ? <ClipboardCheck className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
            {issue.diy ? 'How-to videos' : `Find a ${tradeLabel(issue.trade)}`}
          </a>
        )}
        {!isReadOnly && (
          <button
            onClick={() => onDelete(issue)}
            className="ml-auto rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            aria-label={`Delete ${issue.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
};
