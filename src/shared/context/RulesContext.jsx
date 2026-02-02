import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const RulesContext = createContext({
  rules: '',
  originalRules: '',
  isDirty: false,
  isEnabled: true,
  isLoading: false,
  isSaving: false,
  error: null,
  setRules: () => {},
  saveRules: async () => {},
  revertRules: async () => {},
  toggleEnabled: async () => {},
  refreshRules: async () => {},
});

export function RulesProvider({ children }) {
  const [rules, setRulesState] = useState('');
  const [originalRules, setOriginalRules] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load rules on mount
  useEffect(() => {
    loadRules();
  }, []);

  // Listen for rules updates from Whistle utility process
  useEffect(() => {
    if (window.electron?.onRulesUpdated) {
      const unsubscribe = window.electron.onRulesUpdated((rulesData) => {
        // Update original rules from external changes
        if (rulesData) {
          const rulesText = extractDefaultRules(rulesData);
          setOriginalRules(rulesText);
          // Only update if not dirty (user is editing)
          if (!isDirty) {
            setRulesState(rulesText);
          }
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isDirty]);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (window.electron?.getRules) {
        const rulesData = await window.electron.getRules();
        const rulesText = extractDefaultRules(rulesData);
        setOriginalRules(rulesText);
        setRulesState(rulesText);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
      setError(err.message || 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setRules = useCallback((newRules) => {
    setRulesState(newRules);
    setIsDirty(newRules !== originalRules);
  }, [originalRules]);

  const saveRules = useCallback(async () => {
    if (!isDirty || !window.electron?.setRules) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await window.electron.setRules(rules);
      setOriginalRules(rules);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save rules:', err);
      setError(err.message || 'Failed to save rules');
    } finally {
      setIsSaving(false);
    }
  }, [rules, isDirty]);

  const revertRules = useCallback(async () => {
    setRulesState(originalRules);
    setIsDirty(false);
    setError(null);
  }, [originalRules]);

  const toggleEnabled = useCallback(async () => {
    if (!window.electron?.setRulesEnabled) {
      return;
    }

    try {
      const newState = !isEnabled;
      await window.electron.setRulesEnabled(newState);
      setIsEnabled(newState);
    } catch (err) {
      console.error('Failed to toggle rules:', err);
      setError(err.message || 'Failed to toggle rules');
    }
  }, [isEnabled]);

  const value = useMemo(() => ({
    rules,
    originalRules,
    isDirty,
    isEnabled,
    isLoading,
    isSaving,
    error,
    setRules,
    saveRules,
    revertRules,
    toggleEnabled,
    refreshRules: loadRules,
  }), [rules, originalRules, isDirty, isEnabled, isLoading, isSaving, error, setRules, saveRules, revertRules, toggleEnabled, loadRules]);

  return (
    <RulesContext.Provider value={value}>
      {children}
    </RulesContext.Provider>
  );
}

/**
 * Extract Default rules text from Whistle rules data structure
 *
 * Whistle rules data structure:
 * {
 *   list: [
 *     { name: 'Default', data: '...', selected: true },
 *     { name: 'MyRules', data: '...', selected: false },
 *     ...
 *   ]
 * }
 */
function extractDefaultRules(rulesData) {
  if (!rulesData) {
    return '';
  }

  // If rulesData is a string, return it directly
  if (typeof rulesData === 'string') {
    return rulesData;
  }

  // If rulesData has a list property, find the Default rules
  if (Array.isArray(rulesData.list)) {
    const defaultRules = rulesData.list.find(r => r.name === 'Default');
    if (defaultRules && typeof defaultRules.data === 'string') {
      return defaultRules.data;
    }
  }

  return '';
}

export function useRules() {
  return useContext(RulesContext);
}

RulesContext.displayName = 'RulesContext';
