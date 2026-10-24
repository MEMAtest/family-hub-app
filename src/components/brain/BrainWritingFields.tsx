"use client";

import { Loader2, RefreshCw, Undo2, X, Check } from "lucide-react";
import type { BrainWritingAssist } from "./useBrainWritingAssist";

export function BrainTitleField({
  assist,
  placeholder = "Optional note title",
}: {
  assist: BrainWritingAssist;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <input
        aria-label="Note title"
        value={assist.title}
        onChange={(event) => assist.changeTitle(event.target.value)}
        placeholder={placeholder}
        spellCheck
        lang="en-GB"
        className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      {assist.suggestion && (
        <div
          className="border-l-2 border-teal-500 pl-3 text-sm"
          aria-label="Automatic title suggestion"
        >
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Suggested title
          </p>
          <p className="mt-1 break-words text-gray-900 dark:text-slate-100">
            {assist.suggestion}
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={assist.useTitle}
              className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300"
            >
              <Check className="h-4 w-4" />
              Use title
            </button>
            <button
              type="button"
              title="Keep current title"
              aria-label="Keep current title"
              onClick={assist.dismissTitle}
              className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BrainContentField({
  assist,
  placeholder,
  rows = 6,
}: {
  assist: BrainWritingAssist;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <textarea
        aria-label="Notes"
        value={assist.content}
        onChange={(event) => assist.changeContent(event.target.value)}
        onFocus={assist.focus}
        onBlur={assist.blur}
        onCompositionStart={assist.compositionStart}
        onCompositionEnd={assist.compositionEnd}
        placeholder={placeholder}
        rows={rows}
        spellCheck
        lang="en-GB"
        className="min-h-28 max-h-[40dvh] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-base leading-6 text-gray-900 [overflow-wrap:anywhere] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      {assist.loading && (
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-300"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Refining subject and notes...
        </p>
      )}
      {assist.notice && (
        <p
          role="status"
          className="break-words text-xs text-gray-600 dark:text-slate-300"
        >
          {assist.notice}
        </p>
      )}
      {assist.error && (
        <div>
          <p
            role="alert"
            className="break-words text-xs text-amber-700 dark:text-amber-300"
          >
            {assist.error}
          </p>
          <button
            type="button"
            onClick={assist.retry}
            className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-teal-700 dark:text-teal-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry refinement
          </button>
        </div>
      )}
      {assist.canUndo && (
        <button
          type="button"
          onClick={assist.undo}
          className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-teal-700 dark:text-teal-300"
        >
          <Undo2 className="h-4 w-4" />
          Undo AI changes
        </button>
      )}
    </div>
  );
}
