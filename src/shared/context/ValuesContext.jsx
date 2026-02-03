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
    const oldValue = values[key];
    // Optimistic update
    setValuesState((prev) => ({ ...prev, [key]: value }));
    setIsSaving(true);
    setError(null);
    try {
      const { setValue: apiSetValue } = await import('../api/whistle');
      await apiSetValue(key, value);
    } catch (err) {
      // Revert optimistic update on error
      console.error('Failed to save value:', err);
      setValuesState((prev) => ({ ...prev, [key]: oldValue }));
      setError(err.message || 'Failed to save value');
    } finally {
      setIsSaving(false);
    }
  }, [values]);

  /**
   * Delete a value
   * Note: Confirmation should be handled by the calling component
   */
  const deleteValue = useCallback(async (key) => {
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
      const { deleteValue: apiDeleteValue } = await import('../api/whistle');
      await apiDeleteValue(key);
    } catch (err) {
      // Revert optimistic update on error
      console.error('Failed to delete value:', err);
      setValuesState((prev) => ({ ...prev, [key]: oldValue }));
      if (selectedKey === key) {
        setSelectedKey(key);
      }
      setError(err.message || 'Failed to delete value');
    } finally {
      setIsSaving(false);
    }
  }, [values, selectedKey]);

  /**
   * Create a new value with an empty JSON object
   * Returns true if successful, false otherwise
   * Note: Caller is responsible for selecting the new key after success
   */
  const createValue = useCallback(async (key) => {
    if (!key || values[key]) {
      return false;
    }
    const emptyValue = '{}';
    try {
      const { setValue: apiSetValue } = await import('../api/whistle');
      await apiSetValue(key, emptyValue);
      // Only update local state after API succeeds
      setValuesState((prev) => ({ ...prev, [key]: emptyValue }));
      return true;
    } catch (err) {
      console.error('Failed to create value:', err);
      setError(err.message || 'Failed to create value');
      return false;
    }
  }, [values]);

  /**
   * Rename a value key
   * Returns true if successful, false otherwise
   * Note: Uses API directly for both operations to avoid race conditions
   */
  const renameKey = useCallback(async (oldKey, newKey) => {
    if (!oldKey || !newKey || oldKey === newKey || values[newKey]) {
      return false;
    }
    const value = values[oldKey];
    setIsSaving(true);
    setError(null);
    try {
      const { setValue: apiSetValue, deleteValue: apiDeleteValue } = await import('../api/whistle');
      // First set the new key
      await apiSetValue(newKey, value);
      // Then delete the old key
      await apiDeleteValue(oldKey);
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
      console.error('Failed to rename key:', err);
      setError(err.message || 'Failed to rename key');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [values]);

  // Fetch values on mount
  useEffect(() => {
    fetchValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
