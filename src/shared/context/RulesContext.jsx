import { createContext, useContext, useState, useCallback } from 'react';

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
    setRulesState(newRules);
    setIsDirty(newRules !== rules);
  }, [rules]);

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

  return (
    <RulesContext.Provider
      value={{
        rules,
        isDirty,
        isEnabled,
        setRules,
        saveRules,
        revertRules,
        toggleEnabled,
      }}
    >
      {children}
    </RulesContext.Provider>
  );
}

export function useRules() {
  return useContext(RulesContext);
}
