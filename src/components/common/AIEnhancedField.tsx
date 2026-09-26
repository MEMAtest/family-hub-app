'use client';

import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface AIEnhancedFieldProps {
  value: string;
  onChange: (value: string) => void;
  context: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
}

const AIEnhancedField: React.FC<AIEnhancedFieldProps> = ({
  value,
  onChange,
  context,
  placeholder,
  rows = 4,
  multiline = true,
  className = '',
  disabled = false,
}) => {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhance = async () => {
    if (!value.trim() || enhancing || disabled) return;

    setEnhancing(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/text-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: value,
          context,
          mode: 'polish',
        }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload?.enhanced !== 'string') {
        throw new Error(payload?.error || 'Enhancement failed');
      }
      onChange(payload.enhanced);
    } catch (err) {
      console.error('AI text enhancement failed:', err);
      setError('Enhance unavailable');
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
          title="AI enhance"
          aria-label="AI enhance"
        >
          {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-amber-600 dark:text-amber-300">{error}</p>}
    </div>
  );
};

export default AIEnhancedField;
