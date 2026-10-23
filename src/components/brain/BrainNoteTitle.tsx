"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

export function BrainNoteTitle({
  title,
  content,
  onChange,
  placeholder = "Optional note title",
}: {
  title: string;
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef({ title, content });
  latest.current = { title, content };
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const suggest = async () => {
    const source = { title, content };
    const request = new AbortController();
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 45000);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/text-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          text: content,
          context: "Project Brain note subject",
          mode: "title",
        }),
      });
      const body = await response.json();
      if (!response.ok || typeof body.enhanced !== "string")
        throw new Error(body.error || "Could not suggest a title.");
      if (
        latest.current.title !== source.title ||
        latest.current.content !== source.content
      ) {
        setError("Your draft changed. Try again for the latest note.");
        return;
      }
      onChange(body.enhanced);
    } catch (reason) {
      setError(
        request.signal.aborted
          ? "Title suggestion took too long. Your title is unchanged."
          : reason instanceof Error
            ? reason.message
            : "Title suggestion unavailable.",
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };
  return (
    <div className="min-w-0">
      <div className="relative">
        <input
          aria-label="Note title"
          value={title}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck
          lang="en-GB"
          className="min-h-11 w-full rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-12 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <button
          type="button"
          aria-label="Suggest note title"
          title="Suggest a title from this note"
          disabled={loading || !content.trim()}
          onClick={() => void suggest()}
          className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-teal-700 hover:bg-teal-50 disabled:opacity-40 dark:text-teal-300 dark:hover:bg-slate-800"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </button>
      </div>
      {loading && (
        <p role="status" className="mt-1 text-xs text-teal-700">
          Writing a title...
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-1 break-words text-xs text-amber-700 dark:text-amber-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
