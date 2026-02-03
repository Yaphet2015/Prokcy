import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const ValuesContext = createContext({
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
  createValue: async () => {},
  renameKey: async () => {},
  setSearchQuery: () => {},
});

export function ValuesProvider({ children }) {
  const [values, setValuesState] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectKey = useCallback((key) => {
    setSelectedKey(key);
  }, []);

  /**
   * Fetch all values from the Whistle API
   */
  const fetchValues = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { getValues } = await import('../api/whistle');
      const data = await getValues();
      setValuesState(data);
    } catch (err) {
      console.error('Failed to load values:', err);
      setError(err.message || 'Failed to load values');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set a value and auto-save to the API
   * Updates local state immediately for optimistic UI
   */
  const setValue = useCallback(async (key, value) => {
    setValuesState((prev) => ({ ...prev, [key]: value }));
    setIsSaving(true);
    setError(null);
    try {
      const { setValue: apiSetValue } = await import('../api/whistle');
      await apiSetValue(key, value);
    } catch (err) {
      console.error('Failed to save value:', err);
      setError(err.message || 'Failed to save value');
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Delete a value after user confirmation
   */
  const deleteValue = useCallback(async (key) => {
    if (!window.confirm(`Delete "${key}"?`)) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const { deleteValue: apiDeleteValue } = await import('../api/whistle');
      await apiDeleteValue(key);
      setValuesState((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (selectedKey === key) {
        setSelectedKey(null);
      }
    } catch (err) {
      console.error('Failed to delete value:', err);
      setError(err.message || 'Failed to delete value');
    } finally {
      setIsSaving(false);
    }
  }, [selectedKey]);

  /**
   * Create a new value with an empty JSON object
   * Returns true if successful, false otherwise
   */
  const createValue = useCallback(async (key) => {
    if (!key || values[key]) {
      return false;
    }
    const emptyValue = '{}';
    await setValue(key, emptyValue);
    setSelectedKey(key);
    return true;
  }, [values, setValue]);

  /**
   * Rename a value key
   * Returns true if successful, false otherwise
   */
  const renameKey = useCallback(async (oldKey, newKey) => {
    if (!oldKey || !newKey || oldKey === newKey || values[newKey]) {
      return false;
    }
    const value = values[oldKey];
    await setValue(newKey, value);
    await deleteValue(oldKey);
    setSelectedKey(newKey);
    return true;
  }, [values, setValue, deleteValue]);

  // Fetch values on mount
  useEffect(() => {
    fetchValues();
  }, [fetchValues]);

  const value = useMemo(() => ({
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

export function useValues() {
  return useContext(ValuesContext);
}

ValuesContext.displayName = 'ValuesContext';
