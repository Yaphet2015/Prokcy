import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const RulesContext = createContext({
  rules: '',
  originalRules: '',
  ruleGroups: [],
  activeGroupNames: [],
  activeEditorGroupName: 'Default',
  isDirty: false,
  isEnabled: true,
  isLoading: false,
  isSaving: false,
  error: null,
  setRules: () => {},
  saveRules: async () => {},
  revertRules: async () => {},
  toggleEnabled: async () => {},
  setActiveEditorGroup: () => {},
  setRuleGroupSelection: async () => {},
  refreshRules: async () => {},
});

export function RulesProvider({ children }) {
  const [rules, setRulesState] = useState('');
  const [originalRules, setOriginalRules] = useState('');
  const [ruleGroups, setRuleGroups] = useState([]);
  const [activeGroupNames, setActiveGroupNames] = useState([]);
  const [activeEditorGroupName, setActiveEditorGroupName] = useState('Default');
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
        const next = normalizeRulesData(rulesData);
        const nextEditorGroupName = getEditorGroupName(next.ruleGroups, activeEditorGroupName);
        const nextEditorText = getEditorGroupText(next.ruleGroups, nextEditorGroupName);
        setIsEnabled(next.isEnabled);
        setOriginalRules(nextEditorText);
        setRuleGroups(next.ruleGroups);
        setActiveGroupNames(next.activeGroupNames);
        setActiveEditorGroupName(nextEditorGroupName);
        // Only update if not dirty (user is editing)
        if (!isDirty) {
          setRulesState(nextEditorText);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isDirty, activeEditorGroupName]);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (window.electron?.getRules) {
        const rulesData = await window.electron.getRules();
        const next = normalizeRulesData(rulesData);
        const nextEditorGroupName = getEditorGroupName(next.ruleGroups, activeEditorGroupName);
        const nextEditorText = getEditorGroupText(next.ruleGroups, nextEditorGroupName);
        setIsEnabled(next.isEnabled);
        setOriginalRules(nextEditorText);
        setRulesState(nextEditorText);
        setRuleGroups(next.ruleGroups);
        setActiveGroupNames(next.activeGroupNames);
        setActiveEditorGroupName(nextEditorGroupName);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
      setError(err.message || 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, [activeEditorGroupName]);

  // Reload rules when service restarts to avoid startup timing gaps.
  useEffect(() => {
    if (!window.electron?.onServiceStatusChanged) {
      return undefined;
    }
    const unsubscribe = window.electron.onServiceStatusChanged((status) => {
      if (status?.running) {
        loadRules();
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadRules]);

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
      await window.electron.setRules(rules, activeEditorGroupName);
      setOriginalRules(rules);
      setRuleGroups((prev) => prev.map((group) => (group.name === activeEditorGroupName
        ? { ...group, data: rules }
        : group)));
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save rules:', err);
      setError(err.message || 'Failed to save rules');
    } finally {
      setIsSaving(false);
    }
  }, [rules, isDirty, activeEditorGroupName]);

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

  const setRuleGroupSelection = useCallback(async (name, options = {}) => {
    if (!name || !window.electron?.setRuleSelection) {
      return;
    }
    const target = ruleGroups.find((group) => group.name === name);
    if (!target) {
      return;
    }

    const explicitSelected = typeof options.selected === 'boolean' ? options.selected : null;
    const nextSelected = explicitSelected === null ? !target.selected : explicitSelected;

    try {
      setError(null);
      await window.electron.setRuleSelection(name, nextSelected);
    } catch (err) {
      console.error('Failed to update rules group selection:', err);
      setError(err.message || 'Failed to update rules group selection');
    }
  }, [ruleGroups]);

  const setActiveEditorGroup = useCallback((name) => {
    if (!name) {
      return;
    }
    const target = ruleGroups.find((group) => group.name === name);
    if (!target) {
      return;
    }
    setActiveEditorGroupName(name);
    setOriginalRules(target.data || '');
    setRulesState(target.data || '');
    setIsDirty(false);
    setError(null);
  }, [ruleGroups]);

  const value = useMemo(() => ({
    rules,
    originalRules,
    ruleGroups,
    activeGroupNames,
    activeEditorGroupName,
    isDirty,
    isEnabled,
    isLoading,
    isSaving,
    error,
    setRules,
    saveRules,
    revertRules,
    toggleEnabled,
    setActiveEditorGroup,
    setRuleGroupSelection,
    refreshRules: loadRules,
  }), [
    rules,
    originalRules,
    ruleGroups,
    activeGroupNames,
    activeEditorGroupName,
    isDirty,
    isEnabled,
    isLoading,
    isSaving,
    error,
    setRules,
    saveRules,
    revertRules,
    toggleEnabled,
    setActiveEditorGroup,
    setRuleGroupSelection,
    loadRules,
  ]);

  return (
    <RulesContext.Provider value={value}>
      {children}
    </RulesContext.Provider>
  );
}

function getEditorGroupName(ruleGroups, preferredName) {
  if (preferredName && ruleGroups.some((group) => group.name === preferredName)) {
    return preferredName;
  }
  const defaultGroup = ruleGroups.find((group) => group.isDefault);
  if (defaultGroup) {
    return defaultGroup.name;
  }
  return ruleGroups[0]?.name || 'Default';
}

function getEditorGroupText(ruleGroups, groupName) {
  const target = ruleGroups.find((group) => group.name === groupName);
  return target?.data || '';
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
function normalizeRulesData(rulesData) {
  const fallback = {
    text: '',
    isEnabled: true,
    ruleGroups: [],
    activeGroupNames: [],
  };

  if (!rulesData) {
    return fallback;
  }

  if (typeof rulesData === 'string') {
    return {
      ...fallback,
      text: rulesData,
      ruleGroups: [{
        name: 'Default',
        data: rulesData,
        selected: true,
        isDefault: true,
        priority: 1,
      }],
      activeGroupNames: ['Default'],
    };
  }

  const isEnabled = rulesData.disabled !== true;
  const rawList = Array.isArray(rulesData.list) ? rulesData.list : [];
  const ruleGroups = rawList
    .filter((item) => item && typeof item.name === 'string')
    .map((item, index) => ({
      name: item.name,
      data: typeof item.data === 'string' ? item.data : '',
      selected: !!item.selected,
      isDefault: /^default$/i.test(item.name),
      priority: index + 1,
    }));

  // Whistle uses `defalutRules` in its payload (typo kept for compatibility).
  const defaultText = typeof rulesData.defalutRules === 'string'
    ? rulesData.defalutRules
    : (typeof rulesData.defaultRules === 'string' ? rulesData.defaultRules : '');
  const defaultGroup = ruleGroups.find((item) => item.isDefault);
  if (defaultText && defaultGroup && defaultGroup.data !== defaultText) {
    defaultGroup.data = defaultText;
  }

  if (!ruleGroups.length) {
    ruleGroups.push({
      name: 'Default',
      data: defaultText,
      selected: true,
      isDefault: true,
      priority: 1,
    });
  }

  const activeGroupNames = ruleGroups.filter((item) => item.selected).map((item) => item.name);
  const editorGroup = ruleGroups.find((item) => item.isDefault);
  const text = editorGroup && typeof editorGroup.data === 'string'
    ? editorGroup.data
    : defaultText;

  return {
    text: typeof text === 'string' ? text : '',
    isEnabled,
    ruleGroups,
    activeGroupNames,
  };
}

export function useRules() {
  return useContext(RulesContext);
}

RulesContext.displayName = 'RulesContext';
