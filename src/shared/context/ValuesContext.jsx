import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ValuesContext = createContext({
  values: {},
  selectedKey: null,
  selectKey: () => {},
  setValue: async () => {},
  deleteValue: async () => {},
});

export function ValuesProvider({ children }) {
  const [values, setValuesState] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);

  const selectKey = useCallback((key) => {
    setSelectedKey(key);
  }, []);

  const setValue = useCallback(async (key, value) => {
    setValuesState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const deleteValue = useCallback(async (key) => {
    setValuesState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedKey === key) {
      setSelectedKey(null);
    }
  }, [selectedKey]);

  const value = useMemo(() => ({
    values,
    selectedKey,
    selectKey,
    setValue,
    deleteValue,
  }), [values, selectedKey, selectKey, setValue, deleteValue]);

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
