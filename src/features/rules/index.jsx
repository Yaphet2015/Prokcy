import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { motion } from 'framer-motion';
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
import { RulesToolbar } from './components/RulesToolbar';
import { RulesSidebar } from './components/RulesSidebar';
import { useRuleGroupActions } from './hooks/useRuleGroupActions';
import { useRuleGroupsDragDrop } from './hooks/useRuleGroupsDragDrop';

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

  // Prompt and confirm hooks
  const prompt = usePrompt();
  const confirm = useConfirm();

  // Rule group actions
  const actions = useRuleGroupActions({ prompt, confirm });

  // Drag-and-drop hook
  const dragDrop = useRuleGroupsDragDrop({ ruleGroups, reorderGroups, prompt });

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
    const selectedGroups = dragDrop.localRuleGroups.filter((group) => group.selected);
    return Object.fromEntries(
      selectedGroups.map((group, idx) => [group.name, idx + 1])
    );
  }, [dragDrop.localRuleGroups]);

  return (
    <>
      {prompt}
      {confirm}

      <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

        {/* Main Toolbar - Global status */}
        <RulesToolbar
          isEnabled={isEnabled}
          isDirty={isDirty}
          isSaving={isSaving}
          error={error}
          onToggleEnabled={toggleEnabled}
          onSave={saveRules}
        />

        {/* Editor */}
        <div className="flex-1 overflow-hidden flex">
          <RulesSidebar
            localRuleGroups={dragDrop.localRuleGroups}
            activeGroupNames={activeGroupNames}
            activeEditorGroupName={activeEditorGroupName}
            activePriorityIndex={activePriorityIndex}
            onCreateGroup={actions.handleCreateGroup}
            onGroupDoubleClick={actions.handleGroupDoubleClick}
            onContextRename={actions.handleRenameGroup}
            onContextDelete={actions.handleDeleteGroup}
            onSetActiveEditorGroup={actions.setActiveEditorGroup}
            onReorder={dragDrop.handleReorder}
            onDragStart={dragDrop.handleDragStart}
            onDragEnd={dragDrop.handleDragEnd}
            onDragCancel={dragDrop.handleDragCancel}
          />

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
