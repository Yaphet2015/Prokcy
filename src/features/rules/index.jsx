import { useMemo } from 'react';
import { usePrompt } from '../../shared/ui/Modal';
import { useConfirm } from '../../shared/ui/ConfirmDialog';
import { useRules } from '../../shared/context/RulesContext';
import { RulesToolbar } from './components/RulesToolbar';
import { RulesSidebar } from './components/RulesSidebar';
import { RulesEditor } from './components/RulesEditor';
import { useRuleGroupActions } from './hooks/useRuleGroupActions';
import { useRuleGroupsDragDrop } from './hooks/useRuleGroupsDragDrop';

function Rules() {
  // Get rules state and operations from context
  const {
    rules,
    setRules,
    saveRules,
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

  // Dialog hooks
  const prompt = usePrompt();
  const confirm = useConfirm();

  // Custom hooks for complex logic
  const actions = useRuleGroupActions({ prompt, confirm });
  const dragDrop = useRuleGroupsDragDrop({ ruleGroups, reorderGroups, prompt });

  // Compute priority ranks for active groups
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
        <RulesToolbar
          isEnabled={isEnabled}
          isDirty={isDirty}
          isSaving={isSaving}
          error={error}
          onToggleEnabled={toggleEnabled}
          onSave={saveRules}
        />

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

Rules.displayName = 'Rules';

export default Rules;
