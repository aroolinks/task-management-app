import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsedItem = JSON.parse(item);
          // Convert date strings back to Date objects for tasks
          if (Array.isArray(parsedItem)) {
            const tasksWithDates = parsedItem.map((task: Record<string, unknown>) => ({
              // Spread existing task data but exclude old name and assignee fields
              id: task.id as string,
              completed: task.completed as boolean,
              // Ensure date fields are Date objects
              createdAt: new Date(task.createdAt as string),
              updatedAt: new Date(task.updatedAt as string),
              dueDate: task.dueDate ? new Date(task.dueDate as string) : null,
              // Provide defaults for new fields that might not exist in stored data
              priority: (task.priority as string) || 'Medium',
              status: (task.status as string) || 'InProcess',
              clientName: (task.clientName as string) || (task.name as string) || 'Unnamed Client', // Migrate old name field to clientName if exists
              cms: (task.cms as string) || null,
              webUrl: (task.webUrl as string) || '',
              figmaUrl: (task.figmaUrl as string) || '',
              assetUrl: (task.assetUrl as string) || '',
              totalPrice: (task.totalPrice as number) || null,
              deposit: (task.deposit as number) || null,
            }));
            setStoredValue(tasksWithDates as T);
          } else {
            setStoredValue(parsedItem);
          }
        }
      }
    } catch (error) {
      console.log(error);
      setStoredValue(initialValue);
    }
  }, [key]); // Remove initialValue from dependencies to prevent infinite loops

  return [storedValue, setValue] as const;
}