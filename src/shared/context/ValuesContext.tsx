import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';

// Values type - key-value pairs
type ValuesData = Record<string, string>;

// Electron API interface
interface ElectronWindowValues {
  electron?: {
    getValues?: () => Promise<ValuesData>;
    setValue?: (key: string, value: string) => Promise<void>;
    deleteValue?: (key: string) => Promise<void>;
  };
}

interface ValuesContextValue {
  values: ValuesData;
  selectedKey: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  searchQuery: string;
  selectKey: (key: string | null) => void;
  fetchValues: () => Promise<void>;
  setValue: (key: string, value: string) => Promise<void>;
  deleteValue: (key: string) => Promise<void>;
  createValue: (key: string) => Promise<boolean>;
  renameKey: (oldKey: string, newKey: string) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
}

const ValuesContext = createContext<ValuesContextValue>({
  values: {},
  selectedKey: null,
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: '',
  selectKey: () => {},
  fetchValues: async () => {},
  setValue: async () => {},
  deleteValue: async () => {},
  createValue: async () => false,
  renameKey: async () => false,
  setSearchQuery: () => {},
});

interface ValuesProviderProps {
  children: ReactNode;
}

export function ValuesProvider({ children }: ValuesProviderProps): React.JSX.Element {
  const [values, setValuesState] = useState<ValuesData>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectKey = useCallback((key: string | null) => {
    setSelectedKey(key);
  }, []);

  /**
   * Fetch all values from Whistle API
   */
  const fetchValues = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const electronWin = window as unknown as ElectronWindowValues;
      if (!electronWin.electron?.getValues) {
        throw new Error('Electron API not available');
      }
      const data = await electronWin.electron.getValues();
      setValuesState(data);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to load values:', error);
      setError(error.message || 'Failed to load values');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set a value and auto-save to API
   * Updates local state immediately for optimistic UI
   */
  const setValue = useCallback(async (key: string, value: string) => {
    const oldValue = values[key];
    // Optimistic update
    setValuesState((prev) => ({ ...prev, [key]: value }));
    setIsSaving(true);
    setError(null);
    try {
      const electronWin = window as unknown as ElectronWindowValues;
      if (!electronWin.electron?.setValue) {
        throw new Error('Electron API not available');
      }
      await electronWin.electron.setValue(key, value);
    } catch (err) {
      // Revert optimistic update on error
      const error = err as Error;
      console.error('Failed to save value:', error);
      setValuesState((prev) => ({ ...prev, [key]: oldValue }));
      setError(error.message || 'Failed to save value');
    } finally {
      setIsSaving(false);
    }
  }, [values]);

  /**
   * Delete a value
   * Note: Confirmation should be handled by the calling component
   */
  const deleteValue = useCallback(async (key: string) => {
    // Optimistic update
    const oldValue = values[key];
    setValuesState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedKey === key) {
      setSelectedKey(null);
    }
    setIsSaving(true);
    setError(null);
    try {
      const electronWin = window as unknown as ElectronWindowValues;
      if (!electronWin.electron?.deleteValue) {
        throw new Error('Electron API not available');
      }
      await electronWin.electron.deleteValue(key);
    } catch (err) {
      // Revert optimistic update on error
      const error = err as Error;
      console.error('Failed to delete value:', error);
      setValuesState((prev) => ({ ...prev, [key]: oldValue }));
      if (selectedKey === key) {
        setSelectedKey(key);
      }
      setError(error.message || 'Failed to delete value');
    } finally {
      setIsSaving(false);
    }
  }, [values, selectedKey]);

  /**
   * Create a new value with an empty JSON object
   * Returns true if successful, false otherwise
   * Note: Caller is responsible for selecting the new key after success
   */
  const createValue = useCallback(async (key: string): Promise<boolean> => {
    if (!key || values[key]) {
      return false;
    }
    const emptyValue = '{}';
    try {
      const electronWin = window as unknown as ElectronWindowValues;
      if (!electronWin.electron?.setValue) {
        throw new Error('Electron API not available');
      }
      await electronWin.electron.setValue(key, emptyValue);
      // Only update local state after API succeeds
      setValuesState((prev) => ({ ...prev, [key]: emptyValue }));
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Failed to create value:', error);
      setError(error.message || 'Failed to create value');
      return false;
    }
  }, [values]);

  /**
   * Rename a value key
   * Returns true if successful, false otherwise
   * Note: Uses API directly for both operations to avoid race conditions
   */
  const renameKey = useCallback(async (oldKey: string, newKey: string): Promise<boolean> => {
    if (!oldKey || !newKey || oldKey === newKey || values[newKey]) {
      return false;
    }
    const value = values[oldKey];
    setIsSaving(true);
    setError(null);
    try {
      const electronWin = window as unknown as ElectronWindowValues;
      if (!electronWin.electron?.setValue || !electronWin.electron?.deleteValue) {
        throw new Error('Electron API not available');
      }
      // First set new key
      await electronWin.electron.setValue(newKey, value);
      // Then delete old key
      await electronWin.electron.deleteValue(oldKey);
      // Only update local state after both operations succeed
      setValuesState((prev) => {
        const next = { ...prev };
        delete next[oldKey];
        next[newKey] = value;
        return next;
      });
      setSelectedKey(newKey);
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Failed to rename key:', error);
      setError(error.message || 'Failed to rename key');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [values]);

  // Fetch values on mount
  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const value = useMemo<ValuesContextValue>(() => ({
    values,
    selectedKey,
    isLoading,
    isSaving,
    error,
    searchQuery,
    selectKey,
    fetchValues,
    setValue,
    deleteValue,
    createValue,
    renameKey,
    setSearchQuery,
  }), [
    values,
    selectedKey,
    isLoading,
    isSaving,
    error,
    searchQuery,
    selectKey,
    fetchValues,
    setValue,
    deleteValue,
    createValue,
    renameKey,
  ]);

  return (
    <ValuesContext.Provider value={value}>
      {children}
    </ValuesContext.Provider>
  );
}

export function useValues(): ValuesContextValue {
  return useContext(ValuesContext);
}

ValuesContext.displayName = 'ValuesContext';
