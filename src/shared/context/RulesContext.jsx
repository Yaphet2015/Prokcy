import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const RulesContext = createContext({
  rules: '',
  isDirty: false,
  isEnabled: true,
  setRules: () => {},
  saveRules: async () => {},
  revertRules: () => {},
  toggleEnabled: () => {},
});

export function RulesProvider({ children }) {
  const [rules, setRulesState] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  const setRules = useCallback((newRules) => {
    setRulesState((prev) => {
      setIsDirty(newRules !== prev);
      return newRules;
    });
  }, []);

  const saveRules = useCallback(async () => {
    // Will be implemented with API
    setIsDirty(false);
  }, []);

  const revertRules = useCallback(() => {
    // Will be implemented with API
    setIsDirty(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const value = useMemo(() => ({
    rules,
    isDirty,
    isEnabled,
    setRules,
    saveRules,
    revertRules,
    toggleEnabled,
  }), [rules, isDirty, isEnabled, setRules, saveRules, revertRules, toggleEnabled]);

  return (
    <RulesContext.Provider value={value}>
      {children}
    </RulesContext.Provider>
  );
}

export function useRules() {
  return useContext(RulesContext);
}

RulesContext.displayName = 'RulesContext';
