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
import { Button, ContextMenu } from '@pikoloo/darwin-ui';
import {
  RotateCcw, Save, Power, Plus, Pencil, Trash2, FilePlus, GripVertical,
} from 'lucide-react';
import { useRules } from '../../shared/context/RulesContext';
import { useTheme } from '../../shared/context/ThemeContext';
import { usePrompt } from '../../shared/ui/Modal';
import { useConfirm } from '../../shared/ui/ConfirmDialog';
import { registerTahoeThemes, getThemeId } from './monaco-themes';
import { initWhistleLanguage } from './whistle-language';

// Import hook directly (cannot be lazy-loaded)
import { useMonacoSave } from '../../shared/ui/MonacoEditor';

// Lazy load Monaco to avoid large bundle
const MonacoEditor = lazy(() => import('../../shared/ui/MonacoEditor').then(module => ({ default: module.default })));

// Draggable rule group item component
function RuleGroupItem({
  group,
  isActive,
  isEditorGroup,
  rank,
  setActiveEditorGroup,
  handleGroupDoubleClick,
  handleContextCreate,
  handleContextRename,
  handleContextDelete,
  onDragStart,
  onDragEnd,
  onDragCancel,
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={group}
      dragListener={false}
      dragControls={dragControls}
      className="relative group"
      whileDrag={{
        borderRadius: '8px',
        scale: 1.02,
        // boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.3)',
        zIndex: 50,
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <ContextMenu>
        <ContextMenu.Trigger asChild>
          <motion.button
            type="button"
            onClick={() => setActiveEditorGroup(group.name)}
            onDoubleClick={() => handleGroupDoubleClick(group)}
            className={`w-full px-3 py-2 rounded-lg border transition-all text-left pr-10 ${
              isEditorGroup
                ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
            }`}
            title="Click to open in editor. Double-click to toggle active state. Right-click for more options."
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-medium truncate text-zinc-900 dark:text-zinc-100 select-none ${!rank ? 'opacity-50' : ''}`}>{group.name}</span>
              {rank ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white select-none">
                  #
                  {rank}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 select-none">
                  Off
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-600/85 text-white select-none">
                  Active
                </span>
              )}
            </div>
          </motion.button>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={handleContextCreate}>
            <FilePlus className="w-4 h-4 mr-2" />
            Create New Group
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => handleContextRename(group)}>
            <Pencil className="w-4 h-4 mr-2" />
            Rename
          </ContextMenu.Item>
          <ContextMenu.Item destructive onSelect={() => handleContextDelete(group)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
      {/* Drag handle - separate so button clicks still work */}
      <motion.div
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-opacity z-10 opacity-60 hover:opacity-100"
        onPointerDown={(e) => dragControls.start(e)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <GripVertical className="w-4 h-4 text-zinc-400" />
      </motion.div>
    </Reorder.Item>
  );
}

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
  const [showPrompt, promptElement] = usePrompt();
  const [showConfirm, confirmElement] = useConfirm();

  useEffect(() => {
    if (!isReordering) {
      setLocalRuleGroups(ruleGroups);
      latestOrderRef.current = ruleGroups;
    }
  }, [ruleGroups, isReordering]);

  // Handle save from Monaco's keyboard shortcut (Cmd+S when editor is focused)
  const handleMonacoSave = useCallback(() => {
    if (isDirty) {
      saveRules();
    }
  }, [isDirty, saveRules]);

  useMonacoSave(handleMonacoSave);

  // Update Monaco theme when system theme changes
  useEffect(() => {
    setMonacoTheme(getThemeId(isDark));
  }, [isDark]);

  // Keyboard shortcut for save (Cmd/Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          saveRules();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, saveRules]);

  // Register Monaco language and themes before editor mounts
  const handleBeforeMount = useCallback((monaco) => {
    registerTahoeThemes(monaco);
    initWhistleLanguage(monaco);
  }, []);

  const activePriority = useMemo(
    () => localRuleGroups.filter((group) => group.selected).map((group) => group.name),
    [localRuleGroups],
  );
  const activePriorityIndex = useMemo(
    () => Object.fromEntries(activePriority.map((name, idx) => [name, idx + 1])),
    [activePriority],
  );

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

    let result;
    try {
      result = await reorderGroups(latestOrderRef.current);
    } catch (err) {
      result = { success: false, message: err?.message || 'Failed to reorder groups' };
    }

    if (!result.success) {
      // Show error via prompt
      await showPrompt({
        title: 'Error',
        message: result.message || 'Failed to reorder groups',
        defaultValue: '',
      });
    }
  }, [reorderGroups, showPrompt]);
  const handleDragCancel = useCallback(() => {
    dragSettledRef.current = true;
    setIsReordering(false);
  }, []);

  useEffect(() => {
    if (!isReordering) {
      return undefined;
    }

    let fallbackTimer = null;
    const stopReordering = () => {
      if (fallbackTimer !== null) {
        return;
      }

      // Defer fallback cleanup to avoid racing Framer's drop/reorder callbacks.
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
    if (!group?.name) {
      return;
    }
    setRuleGroupSelection(group.name);
  }, [setRuleGroupSelection]);

  // Generate a unique name for new groups
  const generateNewGroupName = useCallback(() => {
    const baseName = 'New Group';
    let counter = 1;
    let newName = baseName;

    while (ruleGroups.some((g) => g.name.toLowerCase() === newName.toLowerCase())) {
      counter += 1;
      newName = `${baseName} ${counter}`;
    }

    return newName;
  }, [ruleGroups]);

  // Handle create group from sidebar button
  const handleCreateGroup = useCallback(async () => {
    const defaultName = generateNewGroupName();
    const name = await showPrompt({
      title: 'Create New Group',
      message: 'Enter a name for the new rules group:',
      defaultValue: defaultName,
    });

    if (!name || !name.trim()) {
      return;
    }

    const result = await createGroup(name.trim());
    if (!result.success) {
      // Show error via prompt
      await showPrompt({
        title: 'Error',
        message: result.message || 'Failed to create group',
        defaultValue: '',
      });
    }
  }, [generateNewGroupName, showPrompt, createGroup]);

  // Handle create from context menu
  const handleContextCreate = useCallback(async () => {
    const defaultName = generateNewGroupName();
    const name = await showPrompt({
      title: 'Create New Group',
      message: 'Enter a name for the new rules group:',
      defaultValue: defaultName,
    });

    if (!name || !name.trim()) {
      return;
    }

    const result = await createGroup(name.trim());
    if (!result.success) {
      await showPrompt({
        title: 'Error',
        message: result.message || 'Failed to create group',
        defaultValue: '',
      });
    }
  }, [generateNewGroupName, showPrompt, createGroup]);

  // Handle rename from context menu
  const handleContextRename = useCallback(async (group) => {
    if (!group) return;

    const name = await showPrompt({
      title: 'Rename Group',
      message: `Enter a new name for "${group.name}":`,
      defaultValue: group.name,
    });

    if (!name || !name.trim()) {
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.toLowerCase() === group.name.toLowerCase()) {
      return; // No change
    }

    const result = await renameGroup(group.name, trimmedName);
    if (!result.success) {
      await showPrompt({
        title: 'Error',
        message: result.message || 'Failed to rename group',
        defaultValue: '',
      });
    }
  }, [showPrompt, renameGroup]);

  // Handle delete from context menu
  const handleContextDelete = useCallback(async (group) => {
    if (!group) return;

    const confirmed = await showConfirm({
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
      await showPrompt({
        title: 'Error',
        message: result.message || 'Failed to delete group',
        defaultValue: '',
      });
    }
  }, [showConfirm, showPrompt, deleteGroup]);

  return (
    <>
      {promptElement}
      {confirmElement}

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
                const isActive = activeGroupNames.includes(group.name);
                const isEditorGroup = group.name === activeEditorGroupName;
                const rank = activePriorityIndex[group.name];
                return (
                  <RuleGroupItem
                    key={group.name}
                    group={group}
                    isActive={isActive}
                    isEditorGroup={isEditorGroup}
                    rank={rank}
                    setActiveEditorGroup={setActiveEditorGroup}
                    handleGroupDoubleClick={handleGroupDoubleClick}
                    handleContextCreate={handleContextCreate}
                    handleContextRename={handleContextRename}
                    handleContextDelete={handleContextDelete}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  />
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
