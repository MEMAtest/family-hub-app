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
      className="fixed top-3 right-3 z-50 rounded-full bg-gray-200 p-1.5 shadow-md transition-all hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 text-gray-700" />
      ) : (
        <Sun className="h-4 w-4 text-yellow-400" />
      )}
    </button>
  );
}
