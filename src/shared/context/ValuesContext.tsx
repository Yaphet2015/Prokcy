import {
  createContext, useContext, useState, useCallback, useMemo, useEffect, useRef,
} from 'react';
import type { ReactNode } from 'react';
import { normalizeValuesResponse } from '../../features/values/utils/normalizeValuesResponse';
import {
  createPersistedValueState,
  deletePersistedValueState,
  hasDirtyValues,
  renamePersistedValueState,
} from '../../features/values/utils/persistedState';
import { persistValuesSave } from '../../features/values/utils/valueJson5';
import { useService } from './ServiceContext';

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
  deleteValue: (key: string) => Promise<boolean>;
  createValue: (key: string) => Promise<boolean>;
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
  deleteValue: async () => false,
  createValue: async () => false,
  renameKey: async () => false,
  setSearchQuery: () => {},
  saveValues: async () => {},
});

interface ValuesProviderProps {
  children: ReactNode;
}

export function ValuesProvider({ children }: ValuesProviderProps): React.JSX.Element {
  const { isRunning } = useService();
  const [values, setValuesState] = useState<ValuesData>({});
  const valuesRef = useRef(values);
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
    valuesRef.current = values;
  }, [values]);

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
      const data = normalizeValuesResponse(await window.electron.getValues());

      // Clean up empty keys
      const hasEmptyKey = '' in data;
      if (hasEmptyKey) {
        console.warn('Found empty key in values, removing it...');
        try {
          await window.electron.deleteValue('');
          // Remove empty key from local state
          const cleanedData = { ...data };
          delete cleanedData[''];
          valuesRef.current = cleanedData;
          originalValuesRef.current = cleanedData;
          setValuesState(cleanedData);
          setOriginalValues(cleanedData);
        } catch (cleanupError) {
          console.error('Failed to remove empty key:', cleanupError);
          valuesRef.current = data;
          originalValuesRef.current = data;
          setValuesState(data);
          setOriginalValues(data);
        }
      } else {
        valuesRef.current = data;
        originalValuesRef.current = data;
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
   * Set a value (local only, call saveValues to persist)
   * Updates local state immediately, updates dirty flag based on whether values match original
   */
  const setValue = useCallback((key: string, value: string) => {
    setValuesState((prev) => {
      const newValues = { ...prev, [key]: value };
      valuesRef.current = newValues;
      const hasChanges = hasDirtyValues(newValues, originalValuesRef.current);
      setIsDirty(hasChanges);
      return newValues;
    });
  }, []);

  /**
   * Delete a value and persist immediately
   */
  const deleteValue = useCallback(async (key: string): Promise<boolean> => {
    if (!key || !(key in valuesRef.current)) {
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (!window.electron?.deleteValue) {
        throw new Error('Electron API not available');
      }

      await window.electron.deleteValue(key);

      const next = deletePersistedValueState({
        values: valuesRef.current,
        originalValues: originalValuesRef.current,
        key,
      });

      valuesRef.current = next.values;
      originalValuesRef.current = next.originalValues;
      setValuesState(next.values);
      setOriginalValues(next.originalValues);
      setIsDirty(next.isDirty);
      setSelectedKey((current) => (current === key ? null : current));

      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Failed to delete value:', error);
      setError(error.message || 'Failed to delete value');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Create a new value with an empty JSON object and persist immediately
   * Returns true if successful, false otherwise
   */
  const createValue = useCallback(async (key: string): Promise<boolean> => {
    if (!key || key in valuesRef.current) {
      return false;
    }

    const emptyValue = '{}';
    setIsSaving(true);
    setError(null);

    try {
      if (!window.electron?.setValue) {
        throw new Error('Electron API not available');
      }

      await window.electron.setValue(key, emptyValue);

      const next = createPersistedValueState({
        values: valuesRef.current,
        originalValues: originalValuesRef.current,
        key,
        value: emptyValue,
      });

      valuesRef.current = next.values;
      originalValuesRef.current = next.originalValues;
      setValuesState(next.values);
      setOriginalValues(next.originalValues);
      setIsDirty(next.isDirty);

      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Failed to create value:', error);
      setError(error.message || 'Failed to create value');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Rename a value key
   * Returns true if successful, false otherwise
   * Note: Uses API directly for both operations to avoid race conditions
   */
  const renameKey = useCallback(async (oldKey: string, newKey: string): Promise<boolean> => {
    if (!oldKey || !newKey || oldKey === newKey || newKey in valuesRef.current) {
      return false;
    }
    const value = valuesRef.current[oldKey];
    if (typeof value !== 'string') {
      return false;
    }
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
      const next = renamePersistedValueState({
        values: valuesRef.current,
        originalValues: originalValuesRef.current,
        oldKey,
        newKey,
      });

      valuesRef.current = next.values;
      originalValuesRef.current = next.originalValues;
      setValuesState(next.values);
      setOriginalValues(next.originalValues);
      setIsDirty(next.isDirty);
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
  }, []);

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
      const electronApi = window.electron;

      const nextValues = await persistValuesSave({
        values: valuesRef.current,
        originalValues: originalValuesRef.current,
        deleteValue: async (key: string) => {
          await electronApi.deleteValue(key);
        },
        setValue: async (key: string, value: string) => {
          await electronApi.setValue(key, value);
        },
      });

      // Update original values to current values
      valuesRef.current = nextValues;
      originalValuesRef.current = nextValues;
      setValuesState(nextValues);
      setOriginalValues(nextValues);
      setIsDirty(false);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to save values:', error);
      setError(error.message || 'Failed to save values');
    } finally {
      setIsSaving(false);
    }
  }, [isDirty]);

  // Fetch values when service becomes available
  useEffect(() => {
    if (isRunning) {
      fetchValues();
    }
  }, [isRunning, fetchValues]);

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
