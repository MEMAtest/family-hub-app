'use client'

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 rounded-full bg-gray-200 p-2 shadow-lg transition-all hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 md:p-3"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-gray-700 md:h-6 md:w-6" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-400 md:h-6 md:w-6" />
      )}
    </button>
  );
}
