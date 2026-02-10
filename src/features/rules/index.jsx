import {
  useCallback,
  useMemo,
} from 'react';
import { useRules } from '../../shared/context/RulesContext';
import { usePrompt } from '../../shared/ui/Modal';
import { useConfirm } from '../../shared/ui/ConfirmDialog';
import { RuleGroupItem, DraggableRuleGroupItem } from './components/RuleGroupItem';
import { RulesToolbar } from './components/RulesToolbar';
import { RulesSidebar } from './components/RulesSidebar';
import { RulesEditor } from './components/RulesEditor';
import { useRuleGroupActions } from './hooks/useRuleGroupActions';
import { useRuleGroupsDragDrop } from './hooks/useRuleGroupsDragDrop';

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

  // Prompt and confirm hooks
  const prompt = usePrompt();
  const confirm = useConfirm();

  // Rule group actions
  const actions = useRuleGroupActions({ prompt, confirm });

  // Drag-and-drop hook
  const dragDrop = useRuleGroupsDragDrop({ ruleGroups, reorderGroups, prompt });

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
            <RulesEditor
              value={rules}
              onChange={setRules}
              isDirty={isDirty}
              onSave={saveRules}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Rules;
