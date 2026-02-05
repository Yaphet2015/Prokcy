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
  createGroup: async () => {},
  deleteGroup: async () => {},
  renameGroup: async () => {},
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

  const createGroup = useCallback(async (name, content = '') => {
    if (!name || !window.electron?.createRulesGroup) {
      return { success: false, message: 'Invalid name' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Name cannot be empty' };
    }
    if (/^default$/i.test(trimmedName)) {
      return { success: false, message: 'Cannot create Default group' };
    }
    if (ruleGroups.some((g) => g.name === trimmedName)) {
      return { success: false, message: 'Group already exists' };
    }

    try {
      setError(null);
      await window.electron.createRulesGroup(trimmedName, content);
      return { success: true };
    } catch (err) {
      console.error('Failed to create rules group:', err);
      setError(err.message || 'Failed to create rules group');
      return { success: false, message: err.message || 'Failed to create rules group' };
    }
  }, [ruleGroups]);

  const deleteGroup = useCallback(async (name) => {
    if (!name || !window.electron?.deleteRulesGroup) {
      return { success: false, message: 'Invalid name' };
    }
    const trimmedName = name.trim();
    if (/^default$/i.test(trimmedName)) {
      return { success: false, message: 'Cannot delete Default group' };
    }

    try {
      setError(null);
      await window.electron.deleteRulesGroup(trimmedName);
      // If deleted group was being edited, switch to Default
      if (activeEditorGroupName === trimmedName) {
        setActiveEditorGroupName('Default');
        const defaultGroup = ruleGroups.find((g) => g.isDefault) || ruleGroups[0];
        if (defaultGroup) {
          setOriginalRules(defaultGroup.data || '');
          setRulesState(defaultGroup.data || '');
        }
      }
      setIsDirty(false);
      return { success: true };
    } catch (err) {
      console.error('Failed to delete rules group:', err);
      setError(err.message || 'Failed to delete rules group');
      return { success: false, message: err.message || 'Failed to delete rules group' };
    }
  }, [activeEditorGroupName, ruleGroups]);

  const renameGroup = useCallback(async (name, newName) => {
    if (!name || !newName || !window.electron?.renameRulesGroup) {
      return { success: false, message: 'Invalid names' };
    }
    const trimmedName = name.trim();
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      return { success: false, message: 'New name cannot be empty' };
    }
    if (/^default$/i.test(trimmedName)) {
      return { success: false, message: 'Cannot rename Default group' };
    }
    if (/^default$/i.test(trimmedNewName)) {
      return { success: false, message: 'Cannot rename to Default' };
    }
    if (trimmedName === trimmedNewName) {
      return { success: true };
    }
    if (ruleGroups.some((g) => g.name === trimmedNewName)) {
      return { success: false, message: 'A group with this name already exists' };
    }

    try {
      setError(null);
      await window.electron.renameRulesGroup(trimmedName, trimmedNewName);
      // Update editor group name if renamed group was being edited
      if (activeEditorGroupName === trimmedName) {
        setActiveEditorGroupName(trimmedNewName);
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to rename rules group:', err);
      setError(err.message || 'Failed to rename rules group');
      return { success: false, message: err.message || 'Failed to rename rules group' };
    }
  }, [activeEditorGroupName, ruleGroups]);

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
    createGroup,
    deleteGroup,
    renameGroup,
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
    createGroup,
    deleteGroup,
    renameGroup,
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
