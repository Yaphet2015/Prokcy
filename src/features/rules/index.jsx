import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Reorder, useDragControls, motion } from 'framer-motion';
import { Button } from '@pikoloo/darwin-ui';
import {
  RotateCcw, Save, Power, Plus,
} from 'lucide-react';
import { useRules } from '../../shared/context/RulesContext';
import { useTheme } from '../../shared/context/ThemeContext';
import { usePrompt } from '../../shared/ui/Modal';
import { useConfirm } from '../../shared/ui/ConfirmDialog';
import { registerTahoeThemes, getThemeId } from './monaco-themes';
import { initWhistleLanguage } from './whistle-language';
import { RuleGroupItem, DraggableRuleGroupItem } from './components/RuleGroupItem';

// Import hook directly (cannot be lazy-loaded)
import { useMonacoSave } from '../../shared/ui/MonacoEditor';

// Lazy load Monaco to avoid large bundle
const MonacoEditor = lazy(() => import('../../shared/ui/MonacoEditor').then(module => ({ default: module.default })));

function Rules() {
  const {
    rules,
    setRules,
    saveRules,
    // revertRules,
    toggleEnabled,
    setActiveEditorGroup,
    setRuleGroupSelection,
    createGroup,
    deleteGroup,
    renameGroup,
    reorderGroups,
    ruleGroups,
    activeGroupNames,
    activeEditorGroupName,
    isDirty,
    isLoading,
    isSaving,
    isEnabled,
    error,
  } = useRules();

  const { isDark } = useTheme();
  const [monacoTheme, setMonacoTheme] = useState(getThemeId(isDark));
  const [localRuleGroups, setLocalRuleGroups] = useState(ruleGroups);
  const [isReordering, setIsReordering] = useState(false);
  const latestOrderRef = useRef(ruleGroups);
  const dragSettledRef = useRef(false);

  // Prompt and confirm hooks
  const prompt = usePrompt();
  const confirm = useConfirm();

  useEffect(() => {
    if (!isReordering) {
      setLocalRuleGroups(ruleGroups);
      latestOrderRef.current = ruleGroups;
    }
  }, [ruleGroups, isReordering]);

  // Handle save from Monaco's keyboard shortcut (Cmd+S when editor is focused)
  useMonacoSave(useCallback(() => {
    if (isDirty) {
      saveRules();
    }
  }, [isDirty, saveRules]));

  // Update Monaco theme when system theme changes
  useEffect(() => {
    setMonacoTheme(getThemeId(isDark));
  }, [isDark]);

  // Register Monaco language and themes before editor mounts
  const handleBeforeMount = useCallback((monaco) => {
    registerTahoeThemes(monaco);
    initWhistleLanguage(monaco);
  }, []);

  const activePriorityIndex = useMemo(() => {
    const selectedGroups = localRuleGroups.filter((group) => group.selected);
    return Object.fromEntries(
      selectedGroups.map((group, idx) => [group.name, idx + 1])
    );
  }, [localRuleGroups]);

  // Handle drag-and-drop reordering
  const handleReorder = useCallback((newOrder) => {
    setLocalRuleGroups(newOrder);
    latestOrderRef.current = newOrder;
  }, []);

  const handleDragStart = useCallback(() => {
    dragSettledRef.current = false;
    setIsReordering(true);
  }, []);

  const handleDragEnd = useCallback(async () => {
    dragSettledRef.current = true;
    setIsReordering(false);

    const result = await reorderGroups(latestOrderRef.current).catch((err) => ({
      success: false,
      message: err?.message || 'Failed to reorder groups',
    }));

    if (!result.success) {
      await prompt({
        title: 'Error',
        message: result.message || 'Failed to reorder groups',
        defaultValue: '',
      });
    }
  }, [reorderGroups, prompt]);

  const handleDragCancel = useCallback(() => {
    dragSettledRef.current = true;
    setIsReordering(false);
  }, []);

  // Fallback cleanup for drag operations that don't properly end
  useEffect(() => {
    if (!isReordering) {
      return undefined;
    }

    let fallbackTimer = null;

    const stopReordering = () => {
      if (fallbackTimer !== null) {
        return;
      }

      // Defer to avoid racing with Framer's drop/reorder callbacks
      fallbackTimer = window.setTimeout(() => {
        fallbackTimer = null;
        if (!dragSettledRef.current) {
          setIsReordering(false);
        }
      }, 0);
    };

    window.addEventListener('pointerup', stopReordering, true);
    window.addEventListener('pointercancel', stopReordering, true);
    window.addEventListener('blur', stopReordering);

    return () => {
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      window.removeEventListener('pointerup', stopReordering, true);
      window.removeEventListener('pointercancel', stopReordering, true);
      window.removeEventListener('blur', stopReordering);
    };
  }, [isReordering]);

  const handleGroupDoubleClick = useCallback((group) => {
    if (group?.name) {
      setRuleGroupSelection(group.name);
    }
  }, [setRuleGroupSelection]);

  // Generate a unique name for new groups
  const generateNewGroupName = useCallback(() => {
    const existingNames = new Set(ruleGroups.map((g) => g.name.toLowerCase()));
    let counter = 1;
    let newName = 'New Group';

    while (existingNames.has(newName.toLowerCase())) {
      counter += 1;
      newName = `New Group ${counter}`;
    }

    return newName;
  }, [ruleGroups]);

  // Handle create group from sidebar button or context menu
  const handleCreateGroup = useCallback(async () => {
    const defaultName = generateNewGroupName();
    const name = await prompt({
      title: 'Create New Group',
      message: 'Enter a name for the new rules group:',
      defaultValue: defaultName,
    });

    if (!name?.trim()) {
      return;
    }

    const result = await createGroup(name.trim());
    if (!result.success) {
      await prompt({
        title: 'Error',
        message: result.message || 'Failed to create group',
        defaultValue: '',
      });
    }
  }, [generateNewGroupName, prompt, createGroup]);

  // Handle rename from context menu
  const handleContextRename = useCallback(async (group) => {
    if (!group) return;

    const name = await prompt({
      title: 'Rename Group',
      message: `Enter a new name for "${group.name}":`,
      defaultValue: group.name,
    });

    if (!name?.trim()) {
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.toLowerCase() === group.name.toLowerCase()) {
      return;
    }

    const result = await renameGroup(group.name, trimmedName);
    if (!result.success) {
      await prompt({
        title: 'Error',
        message: result.message || 'Failed to rename group',
        defaultValue: '',
      });
    }
  }, [prompt, renameGroup]);

  // Handle delete from context menu
  const handleContextDelete = useCallback(async (group) => {
    if (!group) return;

    const confirmed = await confirm({
      title: 'Delete Group',
      message: `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    const result = await deleteGroup(group.name);
    if (!result.success) {
      await prompt({
        title: 'Error',
        message: result.message || 'Failed to delete group',
        defaultValue: '',
      });
    }
  }, [confirm, prompt, deleteGroup]);

  return (
    <>
      {prompt}
      {confirm}

      <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

        {/* Main Toolbar - Global status */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
          <div className="flex flex-col">
            <div className="flex gap-2 items-center line">
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Rules</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-start">
            {/* Global enable/disable */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleEnabled}
              leftIcon={<Power color={isEnabled ? 'green' : 'red'} className="w-4 h-4" />}
              title={isEnabled ? 'Disable all rules' : 'Enable all rules'}
            >
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {/* Error message */}
            {error && (
              <span className="text-xs text-red-500">{error}</span>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={saveRules}
              disabled={!isDirty || isSaving}
              leftIcon={<Save className="w-4 h-4" />}
              title="Save rules (Cmd+S)"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden flex">
          <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-md flex flex-col">
            {/* Sidebar Header */}
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Groups
                </h2>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCreateGroup}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  title="Create new group"
                >
                  New
                </Button>
              </div>
            </div>

            <Reorder.Group
              axis="y"
              values={localRuleGroups}
              onReorder={handleReorder}
              className="flex-1 overflow-y-auto p-2 space-y-1"
            >
              {localRuleGroups.map((group) => {
                const dragControls = useDragControls();
                const isActive = activeGroupNames.includes(group.name);
                const isEditorGroup = group.name === activeEditorGroupName;
                const rank = activePriorityIndex[group.name];
                
                return (
                  <Reorder.Item
                    key={group.name}
                    value={group}
                    dragListener={false}
                    dragControls={dragControls}
                    className="relative group"
                    whileDrag={{
                      borderRadius: '8px',
                      scale: 1.02,
                      zIndex: 50,
                    }}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <DraggableRuleGroupItem dragControls={dragControls}>
                      <RuleGroupItem
                        group={group}
                        isActive={isActive}
                        isEditorGroup={isEditorGroup}
                        rank={rank}
                        onSelect={() => setActiveEditorGroup(group.name)}
                        onDoubleClick={() => handleGroupDoubleClick(group)}
                        onCreate={handleCreateGroup}
                        onRename={() => handleContextRename(group)}
                        onDelete={() => handleContextDelete(group)}
                      />
                    </DraggableRuleGroupItem>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </aside>

          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading rules...</span>
                </div>
              </div>
            ) : (
              <Suspense
                fallback={(
                  <div className="h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading editor...</span>
                    </div>
                  </div>
                )}
              >
                <MonacoEditor
                  value={rules}
                  onChange={setRules}
                  language="whistle"
                  theme={monacoTheme}
                  beforeMount={handleBeforeMount}
                  options={{
                    readOnly: false,
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Rules;
