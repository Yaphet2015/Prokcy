import { useCallback, useMemo } from 'react';
import { useRules } from '../../shared/context/RulesContext';

export function useRuleGroupActions({ prompt, confirm }) {
  const {
    ruleGroups,
    activeEditorGroupName,
    createGroup,
    deleteGroup,
    renameGroup,
    setActiveEditorGroup,
    setRuleGroupSelection,
  } = useRules();

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

  // Handle create group
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
  const handleRenameGroup = useCallback(async (group) => {
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
  const handleDeleteGroup = useCallback(async (group) => {
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

  // Handle double-click to toggle selection
  const handleGroupDoubleClick = useCallback((group) => {
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
