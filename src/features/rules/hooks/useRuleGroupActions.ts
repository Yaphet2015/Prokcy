import { useCallback, useMemo } from 'react';
import { useRules } from '../../../shared/context/RulesContext';

interface PromptResult {
  title: string;
  message: string;
  defaultValue: string;
}

interface ConfirmResult {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive';
}

interface ShowPromptFunction {
  (options: PromptResult): Promise<string | null>;
}

interface ShowConfirmFunction {
  (options: ConfirmResult): Promise<boolean>;
}

interface UseRuleGroupActionsParams {
  prompt: ShowPromptFunction;
  confirm: ShowConfirmFunction;
}

interface RuleGroup {
  name: string;
}

interface GroupOperationResult {
  success: boolean;
  message?: string;
}

export function useRuleGroupActions({ prompt, confirm }: UseRuleGroupActionsParams) {
  const {
    createGroup,
    deleteGroup,
    renameGroup,
    setActiveEditorGroup,
    setRuleGroupSelection,
  } = useRules();

  // Handle create group
  const handleCreateGroup = useCallback(async (name: string): Promise<GroupOperationResult> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, message: 'Group name is required' };
    }
    return createGroup(trimmedName);
  }, [createGroup]);

  // Handle rename from context menu
  const handleRenameGroup = useCallback(async (group: RuleGroup) => {
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
        message: result.message ?? 'Failed to rename group',
        defaultValue: '',
      });
    }
  }, [prompt, renameGroup]);

  // Handle delete from context menu
  const handleDeleteGroup = useCallback(async (group: RuleGroup) => {
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
        message: result.message ?? 'Failed to delete group',
        defaultValue: '',
      });
    }
  }, [confirm, prompt, deleteGroup]);

  // Handle double-click to toggle selection
  const handleGroupDoubleClick = useCallback((group: RuleGroup) => {
    if (group?.name) {
      setRuleGroupSelection(group.name);
    }
  }, [setRuleGroupSelection]);

  return useMemo(() => ({
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleGroupDoubleClick,
    setActiveEditorGroup,
  }), [
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleGroupDoubleClick,
    setActiveEditorGroup,
  ]);
}
