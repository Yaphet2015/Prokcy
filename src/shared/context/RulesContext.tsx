import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

// Types
export interface RuleGroup {
  name: string;
  data: string;
  selected: boolean;
  priority?: number;
}

interface RulesDataResponse {
  disabled?: boolean;
  list?: Array<{ name: string; data: string; selected: boolean }>;
}

interface RulesResult {
  text: string;
  isEnabled: boolean;
  ruleGroups: RuleGroup[];
  activeGroupNames: string[];
}

interface ElectronWindowRules {
  electron?: {
    getRules?: () => Promise<string | RulesDataResponse>;
    setRules?: (rules: string, groupName: string) => Promise<void>;
    setRulesEnabled?: (enabled: boolean) => Promise<void>;
    onRulesUpdated?: (callback: (data: string | RulesDataResponse) => void) => () => void;
    getRulesOrder?: () => Promise<string[]>;
    setRulesOrder?: (order: string[]) => Promise<void>;
    setRuleSelection?: (name: string, selected: boolean) => Promise<void>;
    createRulesGroup?: (name: string, content: string) => Promise<void>;
    deleteRulesGroup?: (name: string) => Promise<void>;
    renameRulesGroup?: (oldName: string, newName: string) => Promise<void>;
    reorderRulesGroups?: (order: string[]) => Promise<void>;
    onServiceStatusChanged?: (callback: (status: { running?: boolean }) => void) => () => void;
  };
}

interface GroupOperationResult {
  success: boolean;
  message?: string;
}

interface RulesContextValue {
  rules: string;
  originalRules: string;
  ruleGroups: RuleGroup[];
  activeGroupNames: string[];
  activeEditorGroupName: string;
  isDirty: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setRules: (rules: string) => void;
  saveRules: () => Promise<void>;
  revertRules: () => void;
  toggleEnabled: () => Promise<void>;
  setActiveEditorGroup: (name: string) => void;
  setRuleGroupSelection: (name: string, options?: { selected?: boolean }) => Promise<void>;
  createGroup: (name: string, content?: string) => Promise<GroupOperationResult>;
  deleteGroup: (name: string) => Promise<GroupOperationResult>;
  renameGroup: (name: string, newName: string) => Promise<GroupOperationResult>;
  reorderGroups: (newOrder: RuleGroup[]) => Promise<GroupOperationResult>;
  refreshRules: () => Promise<void>;
}

const RulesContext = createContext<RulesContextValue>({
  rules: '',
  originalRules: '',
  ruleGroups: [],
  activeGroupNames: [],
  activeEditorGroupName: '',
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
  createGroup: async () => ({ success: false, message: 'Invalid name' }),
  deleteGroup: async () => ({ success: false, message: 'Invalid name' }),
  renameGroup: async () => ({ success: false, message: 'Invalid names' }),
  reorderGroups: async () => ({ success: false, message: 'Reordering not supported' }),
  refreshRules: async () => {},
});

interface RulesProviderProps {
  children: ReactNode;
}

export function RulesProvider({ children }: RulesProviderProps): React.JSX.Element {
  const [rules, setRulesState] = useState('');
  const [originalRules, setOriginalRules] = useState('');
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
  const [activeGroupNames, setActiveGroupNames] = useState<string[]>([]);
  const [activeEditorGroupName, setActiveEditorGroupName] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ruleOrderRef = useRef<string[]>([]);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const electronWin = window as unknown as ElectronWindowRules;
      if (electronWin.electron?.getRules) {
        const persistedOrderPromise = electronWin.electron.getRulesOrder
          ? electronWin.electron.getRulesOrder().catch((err) => {
            if (!isMissingIpcHandler(err, 'get-rules-order')) {
              throw err;
            }
            return [];
          })
          : Promise.resolve([]);
        const [rulesData, persistedOrder] = await Promise.all([
          electronWin.electron.getRules(),
          persistedOrderPromise,
        ]);
        const next = normalizeRulesData(rulesData);
        const nextOrder = normalizeRuleOrder(persistedOrder, next.ruleGroups);
        const orderedGroups = applyRuleOrder(next.ruleGroups, nextOrder);
        const nextEditorGroupName = getEditorGroupName(orderedGroups, activeEditorGroupName);
        const nextEditorText = getEditorGroupText(orderedGroups, nextEditorGroupName);
        setIsEnabled(next.isEnabled);
        setOriginalRules(nextEditorText);
        setRulesState(nextEditorText);
        setRuleGroups(orderedGroups);
        setActiveGroupNames(orderedGroups.filter((item) => item.selected).map((item) => item.name));
        setActiveEditorGroupName(nextEditorGroupName);
        ruleOrderRef.current = nextOrder;
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to load rules:', error);
      setError(error.message || 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, [activeEditorGroupName]);

  // Load rules on mount
  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Listen for rules updates from Whistle utility process
  useEffect(() => {
    const electronWin = window as unknown as ElectronWindowRules;
    if (electronWin.electron?.onRulesUpdated) {
      const unsubscribe = electronWin.electron.onRulesUpdated((rulesData) => {
        const next = normalizeRulesData(rulesData);
        const nextOrder = normalizeRuleOrder(ruleOrderRef.current, next.ruleGroups);
        const orderedGroups = applyRuleOrder(next.ruleGroups, nextOrder);
        const nextEditorGroupName = getEditorGroupName(orderedGroups, activeEditorGroupName);
        const nextEditorText = getEditorGroupText(orderedGroups, nextEditorGroupName);
        setIsEnabled(next.isEnabled);
        setOriginalRules(nextEditorText);
        setRuleGroups(orderedGroups);
        setActiveGroupNames(orderedGroups.filter((item) => item.selected).map((item) => item.name));
        setActiveEditorGroupName(nextEditorGroupName);
        ruleOrderRef.current = nextOrder;
        // Only update if not dirty (user is editing)
        if (!isDirty) {
          setRulesState(nextEditorText);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
    return undefined;
  }, [isDirty, activeEditorGroupName]);

  // Reload rules when service restarts to avoid startup timing gaps.
  useEffect(() => {
    const electronWin = window as unknown as ElectronWindowRules;
    if (!electronWin.electron?.onServiceStatusChanged) {
      return undefined;
    }
    const unsubscribe = electronWin.electron.onServiceStatusChanged((status) => {
      if (status?.running) {
        loadRules();
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadRules]);

  const setRules = useCallback((newRules: string) => {
    setRulesState(newRules);
    setIsDirty(newRules !== originalRules);
  }, [originalRules]);

  const saveRules = useCallback(async () => {
    if (!isDirty) return;

    const electronWin = window as unknown as ElectronWindowRules;
    if (!electronWin.electron?.setRules) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await electronWin.electron.setRules(rules, activeEditorGroupName);
      setOriginalRules(rules);
      setRuleGroups((prev) => prev.map((group) => (group.name === activeEditorGroupName
        ? { ...group, data: rules }
        : group)));
      setIsDirty(false);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to save rules:', error);
      setError(error.message || 'Failed to save rules');
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
    const electronWin = window as unknown as ElectronWindowRules;
    if (!electronWin.electron?.setRulesEnabled) {
      return;
    }

    try {
      const newState = !isEnabled;
      await electronWin.electron.setRulesEnabled(newState);
      setIsEnabled(newState);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to toggle rules:', error);
      setError(error.message || 'Failed to toggle rules');
    }
  }, [isEnabled]);

  const setRuleGroupSelection = useCallback(async (name: string, options: { selected?: boolean } = {}) => {
    const electronWin = window as unknown as ElectronWindowRules;
    if (!name || !electronWin.electron?.setRuleSelection) {
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
      await electronWin.electron.setRuleSelection(name, nextSelected);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to update rules group selection:', error);
      setError(error.message || 'Failed to update rules group selection');
    }
  }, [ruleGroups]);

  const setActiveEditorGroup = useCallback((name: string) => {
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

  const createGroup = useCallback(async (name: string, content = ''): Promise<GroupOperationResult> => {
    const electronWin = window as unknown as ElectronWindowRules;
    if (!name || !electronWin.electron?.createRulesGroup) {
      return { success: false, message: 'Invalid name' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Name cannot be empty' };
    }
    if (ruleGroups.some((g) => g.name === trimmedName)) {
      return { success: false, message: 'Group already exists' };
    }

    try {
      setError(null);
      await electronWin.electron.createRulesGroup(trimmedName, content);
      return { success: true };
    } catch (err) {
      const error = err as Error;
      console.error('Failed to create rules group:', error);
      setError(error.message || 'Failed to create rules group');
      return { success: false, message: error.message || 'Failed to create rules group' };
    }
  }, [ruleGroups]);

  const deleteGroup = useCallback(async (name: string): Promise<GroupOperationResult> => {
    const electronWin = window as unknown as ElectronWindowRules;
    if (!name || !electronWin.electron?.deleteRulesGroup) {
      return { success: false, message: 'Invalid name' };
    }
    const trimmedName = name.trim();

    try {
      setError(null);
      await electronWin.electron.deleteRulesGroup(trimmedName);
      // If deleted group was being edited, switch to first available group
      if (activeEditorGroupName === trimmedName) {
        const remainingGroup = ruleGroups.find((g) => g.name !== trimmedName);
        if (remainingGroup) {
          setActiveEditorGroupName(remainingGroup.name);
          setOriginalRules(remainingGroup.data || '');
          setRulesState(remainingGroup.data || '');
        }
      }
      setIsDirty(false);
      return { success: true };
    } catch (err) {
      const error = err as Error;
      console.error('Failed to delete rules group:', error);
      setError(error.message || 'Failed to delete rules group');
      return { success: false, message: error.message || 'Failed to delete rules group' };
    }
  }, [activeEditorGroupName, ruleGroups]);

  const renameGroup = useCallback(async (name: string, newName: string): Promise<GroupOperationResult> => {
    const electronWin = window as unknown as ElectronWindowRules;
    if (!name || !newName || !electronWin.electron?.renameRulesGroup) {
      return { success: false, message: 'Invalid names' };
    }
    const trimmedName = name.trim();
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      return { success: false, message: 'New name cannot be empty' };
    }
    if (trimmedName === trimmedNewName) {
      return { success: true };
    }
    if (ruleGroups.some((g) => g.name === trimmedNewName)) {
      return { success: false, message: 'A group with this name already exists' };
    }

    try {
      setError(null);
      await electronWin.electron.renameRulesGroup(trimmedName, trimmedNewName);
      // Update editor group name if renamed group was being edited
      if (activeEditorGroupName === trimmedName) {
        setActiveEditorGroupName(trimmedNewName);
      }
      return { success: true };
    } catch (err) {
      const error = err as Error;
      console.error('Failed to rename rules group:', error);
      setError(error.message || 'Failed to rename rules group');
      return { success: false, message: error.message || 'Failed to rename rules group' };
    }
  }, [activeEditorGroupName, ruleGroups]);

  const reorderGroups = useCallback(async (newOrder: RuleGroup[]): Promise<GroupOperationResult> => {
    const electronWin = window as unknown as ElectronWindowRules;
    if (!Array.isArray(newOrder) || !electronWin.electron?.reorderRulesGroups) {
      return { success: false, message: 'Reordering not supported' };
    }

    const previousOrder = ruleGroups;
    const previousRuleOrder = ruleOrderRef.current;
    const isSameOrder = previousOrder.length === newOrder.length
      && previousOrder.every((group, index) => group.name === newOrder[index]?.name);
    if (isSameOrder) {
      return { success: true };
    }

    try {
      setError(null);
      // Optimistically update list so DnD doesn't snap back while persisting.
      setRuleGroups(newOrder);
      const orderedNames = newOrder.map((g) => g.name);
      ruleOrderRef.current = orderedNames;
      if (electronWin.electron?.setRulesOrder) {
        try {
          await electronWin.electron.setRulesOrder(orderedNames);
        } catch (err) {
          if (!isMissingIpcHandler(err, 'set-rules-order')) {
            throw err;
          }
        }
      }
      await electronWin.electron.reorderRulesGroups(orderedNames);
      return { success: true };
    } catch (err) {
      const error = err as Error;
      console.error('Failed to reorder groups:', error);
      setRuleGroups(previousOrder);
      ruleOrderRef.current = previousRuleOrder;
      setError(error.message || 'Failed to reorder groups');
      return { success: false, message: error.message || 'Failed to reorder groups' };
    }
  }, [ruleGroups]);

  const value = useMemo<RulesContextValue>(() => ({
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
    reorderGroups,
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
    reorderGroups,
    loadRules,
  ]);

  return (
    <RulesContext.Provider value={value}>
      {children}
    </RulesContext.Provider>
  );
}

function getEditorGroupName(ruleGroups: RuleGroup[], preferredName: string): string {
  if (preferredName && ruleGroups.some((group) => group.name === preferredName)) {
    return preferredName;
  }
  return ruleGroups[0]?.name || '';
}

function getEditorGroupText(ruleGroups: RuleGroup[], groupName: string): string {
  const target = ruleGroups.find((group) => group.name === groupName);
  return target?.data || '';
}

function normalizeRuleOrder(order: string[], ruleGroups: RuleGroup[]): string[] {
  const groupNames = ruleGroups.map((item) => item.name);
  const baseOrder = Array.isArray(order) ? order : [];
  const unique = new Set<string>();
  const normalized: string[] = [];

  baseOrder.forEach((name) => {
    if (typeof name !== 'string' || !groupNames.includes(name) || unique.has(name)) {
      return;
    }
    unique.add(name);
    normalized.push(name);
  });

  groupNames.forEach((name) => {
    if (!unique.has(name)) {
      unique.add(name);
      normalized.push(name);
    }
  });

  return normalized;
}

function applyRuleOrder(ruleGroups: RuleGroup[], order: string[]): RuleGroup[] {
  if (!ruleGroups.length) {
    return ruleGroups;
  }
  const normalizedOrder = normalizeRuleOrder(order, ruleGroups);
  const indexMap = new Map(normalizedOrder.map((name, index) => [name, index]));
  return [...ruleGroups].sort((a, b) => {
    const aIndex = indexMap.has(a.name) ? indexMap.get(a.name)! : Number.MAX_SAFE_INTEGER;
    const bIndex = indexMap.has(b.name) ? indexMap.get(b.name)! : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function isMissingIpcHandler(error: unknown, channel: string): boolean {
  const message = (error as Error)?.message || '';
  return message.includes(`No handler registered for '${channel}'`);
}

/**
 * Normalize Whistle rules data structure
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
function normalizeRulesData(rulesData: string | RulesDataResponse): RulesResult {
  const fallback: RulesResult = {
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
      priority: index + 1,
    }));

  const activeGroupNames = ruleGroups.filter((item) => item.selected).map((item) => item.name);
  const editorGroup = ruleGroups[0];
  const text = editorGroup && typeof editorGroup.data === 'string'
    ? editorGroup.data
    : '';

  return {
    text: typeof text === 'string' ? text : '',
    isEnabled,
    ruleGroups,
    activeGroupNames,
  };
}

export function useRules(): RulesContextValue {
  return useContext(RulesContext);
}

RulesContext.displayName = 'RulesContext';
