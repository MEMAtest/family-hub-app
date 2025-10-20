'use client'

import { useMemo } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme, mounted } = useTheme();

  const title = useMemo(
    () => `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`,
    [theme]
  );

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={title}
      title={title}
      className="rounded-full border border-gray-200 bg-white/90 p-2 text-gray-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 md:h-5 md:w-5" />
      ) : (
        <Moon className="h-4 w-4 md:h-5 md:w-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
