import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Always start with initialValue to avoid hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage only on client side after hydration
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          setStoredValue(parsed);
        }
        setIsInitialized(true);
      } catch (error) {
        console.log(`Error loading ${key} from localStorage:`, error);
        setIsInitialized(true);
      }
    }
  }, [key, isInitialized]);

  // Listen for storage events (for cross-tab sync and Chrome compatibility)
  useEffect(() => {
    if (!isInitialized) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage event for ${key}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, isInitialized]);

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to local storage only if initialized
      if (typeof window !== 'undefined' && isInitialized) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));

        // Chrome fix: Dispatch a custom event for immediate updates
        window.dispatchEvent(new StorageEvent('storage', {
          key: key,
          newValue: JSON.stringify(valueToStore),
          oldValue: JSON.stringify(storedValue),
          storageArea: window.localStorage,
          url: window.location.href
        }));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(`Error saving ${key} to localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}