import { useMemo, useState } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { Power, Save } from 'lucide-react';
import { usePrompt } from '../../shared/ui/Modal';
import { useConfirm } from '../../shared/ui/ConfirmDialog';
import ContentHeader from '../../shared/ui/ContentHeader';
import { useRules } from '../../shared/context/RulesContext';
import { RulesSidebar, RulesEditor } from './components';
import { useRuleGroupActions, useRuleGroupsDragDrop } from './hooks';
import { getFileNavigationFeedbackMessage } from './utils/fileNavigationFeedback';

interface RulesProps {
  isSidebarCollapsed: boolean;
  onNavigateToValueKey?: (key: string) => void;
}

function Rules({ isSidebarCollapsed, onNavigateToValueKey }: RulesProps): React.JSX.Element {
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
  const [showPrompt, promptElement] = usePrompt();
  const [showConfirm, confirmElement] = useConfirm();
  const [fileNavigationMessage, setFileNavigationMessage] = useState<string | null>(null);

  // Custom hooks for complex logic
  const actions = useRuleGroupActions({ prompt: showPrompt, confirm: showConfirm });
  const dragDrop = useRuleGroupsDragDrop({ ruleGroups, reorderGroups, prompt: showPrompt });

  // Compute priority ranks for active groups
  const activePriorityIndex = useMemo(() => {
    const selectedGroups = dragDrop.localRuleGroups.filter((group) => group.selected);
    return Object.fromEntries(
      selectedGroups.map((group, idx) => [group.name, idx + 1] as [string, number]),
    );
  }, [dragDrop.localRuleGroups]);

  const statusMessage = (
    <>
      {fileNavigationMessage && <span className="text-xs text-amber-500">{fileNavigationMessage}</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </>
  );

  return (
    <>
      {promptElement}
      {confirmElement}
      <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <ContentHeader
          viewName="rules"
          isSidebarCollapsed={isSidebarCollapsed}
          // leftActions={(
          //   <Button
          //     className="hover:dark:text-zinc-950"
          //     variant="ghost"
          //     size="sm"
          //     onClick={toggleEnabled}
          //     leftIcon={<Power color={isEnabled ? 'green' : 'red'} className="w-4 h-4" />}
          //     title={isEnabled ? 'Disable all rules' : 'Enable all rules'}
          //   >
          //     {isEnabled ? 'Enabled' : 'Disabled'}
          //   </Button>
          // )}
          statusMessage={(fileNavigationMessage || error) ? statusMessage : null}
          rightActions={(
            <Button
              variant={isDirty ? "primary" : "ghost"}
              size="sm"
              loading={isSaving}
              onClick={saveRules}
              disabled={!isDirty || isSaving}
              leftIcon={<Save className="w-4 h-4" />}
              title="Save rules (Cmd+S)"
            >
              Save
            </Button>
          )}
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
              onNavigateToValueKey={onNavigateToValueKey}
              onFileNavigationResult={(result) => {
                setFileNavigationMessage(getFileNavigationFeedbackMessage(result));
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

Rules.displayName = 'Rules';

export default Rules;
