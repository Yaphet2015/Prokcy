import {
  createContext, useContext, useState, useCallback, useMemo, useEffect, useRef,
} from 'react';
import type { ReactNode } from 'react';

// Values type - key-value pairs
type ValuesData = Record<string, string>;

interface ValuesContextValue {
  values: ValuesData;
  originalValues: ValuesData;
  selectedKey: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;
  searchQuery: string;
  selectKey: (key: string | null) => void;
  fetchValues: () => Promise<void>;
  setValue: (key: string, value: string) => void;
  deleteValue: (key: string) => void;
  createValue: (key: string) => boolean;
  renameKey: (oldKey: string, newKey: string) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
  saveValues: () => Promise<void>;
}

const ValuesContext = createContext<ValuesContextValue>({
  values: {},
  originalValues: {},
  selectedKey: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  error: null,
  searchQuery: '',
  selectKey: () => {},
  fetchValues: async () => {},
  setValue: () => {},
  deleteValue: () => {},
  createValue: () => false,
  renameKey: async () => false,
  setSearchQuery: () => {},
  saveValues: async () => {},
});

interface ValuesProviderProps {
  children: ReactNode;
}

export function ValuesProvider({ children }: ValuesProviderProps): React.JSX.Element {
  const [values, setValuesState] = useState<ValuesData>({});
  const [originalValues, setOriginalValues] = useState<ValuesData>({});
  const originalValuesRef = useRef(originalValues);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep ref in sync with state
  useEffect(() => {
    originalValuesRef.current = originalValues;
  }, [originalValues]);

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
      if (!window.electron?.getValues) {
        throw new Error('Electron API not available');
      }
      const data = await window.electron.getValues();

      // Clean up empty keys
      const hasEmptyKey = '' in data;
      if (hasEmptyKey) {
        console.warn('Found empty key in values, removing it...');
        try {
          await window.electron.deleteValue('');
          // Remove empty key from local state
          const cleanedData = { ...data };
          delete cleanedData[''];
          setValuesState(cleanedData);
          setOriginalValues(cleanedData);
        } catch (cleanupError) {
          console.error('Failed to remove empty key:', cleanupError);
          setValuesState(data);
          setOriginalValues(data);
        }
      } else {
        setValuesState(data);
        setOriginalValues(data);
      }
      setIsDirty(false);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to load values:', error);
      setError(error.message || 'Failed to load values');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if values have changes compared to original
   */
  const checkDirty = useCallback((currentValues: ValuesData): boolean => {
    const currentKeys = new Set(Object.keys(currentValues));
    const originalKeys = new Set(Object.keys(originalValuesRef.current));

    // Check for added keys
    for (const key of currentKeys) {
      if (!originalKeys.has(key)) {
        return true; // New key added
      }
      if (currentValues[key] !== originalValuesRef.current[key]) {
        return true; // Value changed
      }
    }

    // Check for deleted keys
    for (const key of originalKeys) {
      if (!currentKeys.has(key)) {
        return true; // Key was deleted
      }
    }

    return false; // No changes
  }, []); // No dependencies - we use ref instead

  /**
   * Set a value (local only, call saveValues to persist)
   * Updates local state immediately, updates dirty flag based on whether values match original
   */
  const setValue = useCallback((key: string, value: string) => {
    setValuesState((prev) => {
      const newValues = { ...prev, [key]: value };
      const hasChanges = checkDirty(newValues);
      setIsDirty(hasChanges);
      return newValues;
    });
  }, [checkDirty]);

  /**
   * Delete a value (local only, call saveValues to persist)
   * Updates local state immediately, updates dirty flag
   */
  const deleteValue = useCallback((key: string) => {
    setValuesState((prev) => {
      const next = { ...prev };
      delete next[key];
      const hasChanges = checkDirty(next);
      setIsDirty(hasChanges);
      return next;
    });
    if (selectedKey === key) {
      setSelectedKey(null);
    }
  }, [checkDirty, selectedKey]);

  /**
   * Create a new value with an empty JSON object (local only)
   * Returns true if successful, false otherwise
   * Note: Caller is responsible for selecting the new key after success
   */
  const createValue = useCallback((key: string): boolean => {
    if (!key || values[key]) {
      return false;
    }
    const emptyValue = '{}';
    setValuesState((prev) => {
      const newValues = { ...prev, [key]: emptyValue };
      // New key is not in originalValues, so we're definitely dirty
      setIsDirty(true);
      return newValues;
    });
    return true;
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
      if (!window.electron?.setValue || !window.electron?.deleteValue) {
        throw new Error('Electron API not available');
      }
      // First set new key
      await window.electron.setValue(newKey, value);
      // Then delete old key
      await window.electron.deleteValue(oldKey);
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

  /**
   * Save all values to the API
   * Compares current values with original values and sends only changed values
   */
  const saveValues = useCallback(async () => {
    if (!isDirty) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (!window.electron?.setValue || !window.electron?.deleteValue) {
        throw new Error('Electron API not available');
      }

      const originalKeys = new Set(Object.keys(originalValues));
      const currentKeys = new Set(Object.keys(values));

      // Delete keys that were removed
      for (const key of originalKeys) {
        if (!currentKeys.has(key)) {
          await window.electron.deleteValue(key);
        }
      }

      // Save or update all current values
      for (const key of currentKeys) {
        await window.electron.setValue(key, values[key]);
      }

      // Update original values to current values
      setOriginalValues(values);
      setIsDirty(false);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to save values:', error);
      setError(error.message || 'Failed to save values');
    } finally {
      setIsSaving(false);
    }
  }, [values, originalValues, isDirty]);

  // Fetch values on mount
  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  // Auto-select first value when values are loaded and nothing is selected
  useEffect(() => {
    if (!isLoading && values && Object.keys(values).length > 0 && !selectedKey) {
      const firstKey = Object.keys(values)[0];
      selectKey(firstKey);
    }
  }, [isLoading, values, selectedKey, selectKey]);

  const value = useMemo<ValuesContextValue>(() => ({
    values,
    originalValues,
    selectedKey,
    isLoading,
    isSaving,
    isDirty,
    error,
    searchQuery,
    selectKey,
    fetchValues,
    setValue,
    deleteValue,
    createValue,
    renameKey,
    setSearchQuery,
    saveValues,
  }), [
    values,
    originalValues,
    selectedKey,
    isLoading,
    isSaving,
    isDirty,
    error,
    searchQuery,
    selectKey,
    fetchValues,
    setValue,
    deleteValue,
    createValue,
    renameKey,
    saveValues,
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
