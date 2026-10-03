'use client';

import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface AIEnhancedFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  context: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
  mode?: 'polish' | 'spellcheck' | 'summarize';
}

const AIEnhancedField: React.FC<AIEnhancedFieldProps> = ({
  id,
  value,
  onChange,
  context,
  placeholder,
  rows = 4,
  multiline = true,
  className = '',
  disabled = false,
  mode = 'polish',
}) => {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summarySuggestion, setSummarySuggestion] = useState<string | null>(null);
  const actionLabel = mode === 'summarize' ? 'Summarise with AI' : 'AI enhance';

  const enhance = async () => {
    if (!value.trim() || enhancing || disabled) return;

    setEnhancing(true);
    setError(null);
    setSummarySuggestion(null);
    try {
      const response = await fetch('/api/ai/text-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value,
          context,
          mode,
        }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload?.enhanced !== 'string') {
        throw new Error(payload?.error || 'Enhancement failed');
      }
      if (mode === 'summarize') setSummarySuggestion(payload.enhanced);
      else onChange(payload.enhanced);
    } catch (err) {
      console.error('AI text enhancement failed:', err);
      setError(err instanceof Error ? err.message : 'Enhance unavailable');
    } finally {
      setEnhancing(false);
    }
  };

  const baseClassName =
    className ||
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  return (
    <div className="space-y-2">
      <div className="relative">
        {multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onInput={(event) => onChange(event.currentTarget.value)}
            rows={rows}
            placeholder={placeholder}
            spellCheck
            lang="en-GB"
            disabled={disabled}
            className={`${baseClassName} pr-12`}
          />
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onInput={(event) => onChange(event.currentTarget.value)}
            placeholder={placeholder}
            spellCheck
            lang="en-GB"
            disabled={disabled}
            className={`${baseClassName} pr-12`}
          />
        )}
        <button
          type="button"
          onClick={() => void enhance()}
          disabled={!value.trim() || enhancing || disabled}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#147c72] transition hover:bg-[#eaf1e7] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#56c6b8] dark:hover:bg-slate-800"
          title={actionLabel}
          aria-label={actionLabel}
        >
          {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </button>
      </div>
      {summarySuggestion && (
        <div className="space-y-2 rounded-md border border-[#c8ded8] bg-[#f5faf7] p-3 dark:border-slate-700 dark:bg-slate-900" role="status" aria-live="polite">
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">Suggested summary</p>
          <p className="whitespace-pre-line text-sm leading-5 text-gray-700 dark:text-slate-200">{summarySuggestion}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSummarySuggestion(null)} className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">Keep original</button>
            <button type="button" onClick={() => { onChange(summarySuggestion); setSummarySuggestion(null); }} className="rounded bg-[#147c72] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#116b63]">Use summary</button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-amber-600 dark:text-amber-300">{error}</p>}
    </div>
  );
};

export default AIEnhancedField;
