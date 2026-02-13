# Rules Feature Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `src/features/rules/index.jsx` (500 lines) into modular, dependency-injected components with single responsibility and testability.

**Architecture:** Extract the monolithic Rules component into focused modules:
- Rule group sidebar with drag-and-drop
- Monaco editor wrapper with theme/language setup
- Toolbar with actions
- Custom hooks for drag-and-drop logic and group management
- Shared components for rule group items

**Tech Stack:** React, Framer Motion (Reorder), Monaco Editor, TypeScript, existing patterns from `src/shared/`

## Update (2026-02-13)

- New rule-group creation should use inline creation UI inside the sidebar list.
- Do not open a modal dialog for "Create New Group".
- The list should show a border-dashed create item that expands to input + `Add`/`Cancel`.

## Update (2026-02-13, Default Toggle Behavior)

- Double-click on `Default` must toggle active/inactive exactly like other rule groups.
- `Default` is special in Whistle internals and must map to default-enable/default-disable APIs instead of regular group select/unselect APIs.

---

## Task 1: Create directory structure for modular components

**Files:**
- Create: `src/features/rules/components/`
- Create: `src/features/rules/hooks/`

**Step 1: Create component directory**

Run: `mkdir -p src/features/rules/components`

Expected: Directory created, no output

**Step 2: Create hooks directory**

Run: `mkdir -p src/features/rules/hooks`

Expected: Directory created, no output

**Step 3: Verify structure**

Run: `ls -la src/features/rules/`

Expected: Output showing `components/` and `hooks/` directories

**Step 4: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): create modular directory structure"
```

---

## Task 2: Extract RuleGroupItem component with context menu

**Files:**
- Create: `src/features/rules/components/RuleGroupItem.jsx`
- Modify: `src/features/rules/index.jsx` (remove RuleGroupItem, import new component)

**Step 1: Write the RuleGroupItem component**

Create `src/features/rules/components/RuleGroupItem.jsx`:

```jsx
import { motion } from 'framer-motion';
import { ContextMenu } from '@pikoloo/darwin-ui';
import { FilePlus, Pencil, Trash2, GripVertical } from 'lucide-react';

export function RuleGroupItem({
  group,
  isActive,
  isEditorGroup,
  rank,
  onSelect,
  onDoubleClick,
  onCreate,
  onRename,
  onDelete,
  dragControls,
  onDragStart,
  onDragEnd,
  onDragCancel,
}) {
  return (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <motion.button
          type="button"
          onClick={onSelect}
          onDoubleClick={onDoubleClick}
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
            <span className={`text-sm font-medium truncate text-zinc-900 dark:text-zinc-100 select-none ${!rank ? 'opacity-50' : ''}`}>
              {group.name}
            </span>
            {rank ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white select-none">
                #{rank}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 select-none">
                Off
              </span>
            )}
          </div>
          {isActive && (
            <div className="mt-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-600/85 text-white select-none">
                Active
              </span>
            </div>
          )}
        </motion.button>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={onCreate}>
          <FilePlus className="w-4 h-4 mr-2" />
          Create New Group
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={onRename}>
          <Pencil className="w-4 h-4 mr-2" />
          Rename
        </ContextMenu.Item>
        <ContextMenu.Item destructive onSelect={onDelete}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

// Draggable wrapper component
export function DraggableRuleGroupItem({ children, dragControls, onDragStart, onDragEnd, onDragCancel }) {
  return (
    <div className="relative group">
      {children}
      <motion.div
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-opacity z-10 opacity-60 hover:opacity-100"
        onPointerDown={(e) => dragControls.start(e)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <GripVertical className="w-4 h-4 text-zinc-400" />
      </motion.div>
    </div>
  );
}
```

**Step 2: Update index.jsx to use the new component**

In `src/features/rules/index.jsx`, remove the `RuleGroupItem` function (lines 29-124) and add the import at the top:

```jsx
import { RuleGroupItem, DraggableRuleGroupItem } from './components/RuleGroupItem';
```

**Step 3: Update the mapping in index.jsx**

Replace the Reorder.Item usage with:

```jsx
{localRuleGroups.map((group) => {
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
```

**Step 4: Remove the old dragControls reference**

Remove `const dragControls = useDragControls();` from the old RuleGroupItem component.

**Step 5: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): extract RuleGroupItem component"
```

---

## Task 3: Extract useRuleGroupActions hook for CRUD operations

**Files:**
- Create: `src/features/rules/hooks/useRuleGroupActions.js`
- Modify: `src/features/rules/index.jsx`

**Step 1: Write the useRuleGroupActions hook**

Create `src/features/rules/hooks/useRuleGroupActions.js`:

```jsx
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
```

**Step 2: Update index.jsx to use the new hook**

In `src/features/rules/index.jsx`, add the import and use the hook:

```jsx
import { useRuleGroupActions } from './hooks/useRuleGroupActions';

// In Rules component, replace the local handlers with:
const actions = useRuleGroupActions({ prompt, confirm });
```

Then remove the following functions from index.jsx:
- `generateNewGroupName` (lines 269-280)
- `handleCreateGroup` (lines 283-303)
- `handleContextRename` (lines 306-332)
- `handleContextDelete` (lines 335-358)
- `handleGroupDoubleClick` (lines 262-266)

Update the component to use `actions.handleCreateGroup`, `actions.handleRenameGroup`, etc.

**Step 3: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): extract useRuleGroupActions hook"
```

---

## Task 4: Extract useRuleGroupsDragDrop hook for drag-and-drop logic

**Files:**
- Create: `src/features/rules/hooks/useRuleGroupsDragDrop.js`
- Modify: `src/features/rules/index.jsx`

**Step 1: Write the useRuleGroupsDragDrop hook**

Create `src/features/rules/hooks/useRuleGroupsDragDrop.js`:

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';

export function useRuleGroupsDragDrop({ ruleGroups, reorderGroups, prompt }) {
  const [localRuleGroups, setLocalRuleGroups] = useState(ruleGroups);
  const [isReordering, setIsReordering] = useState(false);
  const latestOrderRef = useRef(ruleGroups);
  const dragSettledRef = useRef(false);

  // Sync local state when not reordering
  useEffect(() => {
    if (!isReordering) {
      setLocalRuleGroups(ruleGroups);
      latestOrderRef.current = ruleGroups;
    }
  }, [ruleGroups, isReordering]);

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

  return {
    localRuleGroups,
    isReordering,
    handleReorder,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
```

**Step 2: Update index.jsx to use the new hook**

In `src/features/rules/index.jsx`, add the import and use the hook:

```jsx
import { useRuleGroupsDragDrop } from './hooks/useRuleGroupsDragDrop';

// In Rules component, replace the local drag-drop state and handlers with:
const dragDrop = useRuleGroupsDragDrop({
  ruleGroups,
  reorderGroups,
  prompt,
});
```

Then remove the following from index.jsx:
- `const [localRuleGroups, setLocalRuleGroups] = useState(ruleGroups);`
- `const [isReordering, setIsReordering] = useState(false);`
- `const latestOrderRef = useRef(ruleGroups);`
- `const dragSettledRef = useRef(false);`
- The `useEffect` that syncs local state (lines 160-165)
- `handleReorder` (lines 193-196)
- `handleDragStart` (lines 198-201)
- `handleDragEnd` (lines 203-219)
- `handleDragCancel` (lines 221-224)
- The fallback cleanup `useEffect` (lines 227-260)

Update references to use `dragDrop.localRuleGroups`, `dragDrop.handleReorder`, etc.

**Step 3: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): extract useRuleGroupsDragDrop hook"
```

---

## Task 5: Extract RulesToolbar component

**Files:**
- Create: `src/features/rules/components/RulesToolbar.jsx`
- Modify: `src/features/rules/index.jsx`

**Step 1: Write the RulesToolbar component**

Create `src/features/rules/components/RulesToolbar.jsx`:

```jsx
import { Button } from '@pikoloo/darwin-ui';
import { Save, Power } from 'lucide-react';

export function RulesToolbar({
  isEnabled,
  isDirty,
  isSaving,
  error,
  onToggleEnabled,
  onSave,
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
      <div className="flex flex-col">
        <div className="flex gap-2 items-center line">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Rules</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleEnabled}
          leftIcon={<Power color={isEnabled ? 'green' : 'red'} className="w-4 h-4" />}
          title={isEnabled ? 'Disable all rules' : 'Enable all rules'}
        >
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          leftIcon={<Save className="w-4 h-4" />}
          title="Save rules (Cmd+S)"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Update index.jsx to use the new component**

In `src/features/rules/index.jsx`, add the import:

```jsx
import { RulesToolbar } from './components/RulesToolbar';
```

Replace the entire toolbar section (lines 367-407) with:

```jsx
<RulesToolbar
  isEnabled={isEnabled}
  isDirty={isDirty}
  isSaving={isSaving}
  error={error}
  onToggleEnabled={toggleEnabled}
  onSave={saveRules}
/>
```

**Step 3: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): extract RulesToolbar component"
```

---

## Task 6: Extract RulesSidebar component

**Files:**
- Create: `src/features/rules/components/RulesSidebar.jsx`
- Modify: `src/features/rules/index.jsx`

**Step 1: Write the RulesSidebar component**

Create `src/features/rules/components/RulesSidebar.jsx`:

```jsx
import { Reorder, useDragControls } from 'framer-motion';
import { Button } from '@pikoloo/darwin-ui';
import { Plus } from 'lucide-react';
import { RuleGroupItem, DraggableRuleGroupItem } from './RuleGroupItem';

export function RulesSidebar({
  localRuleGroups,
  activeGroupNames,
  activeEditorGroupName,
  activePriorityIndex,
  onCreateGroup,
  onGroupDoubleClick,
  onContextRename,
  onContextDelete,
  onSetActiveEditorGroup,
  onReorder,
  onDragStart,
  onDragEnd,
  onDragCancel,
}) {
  const dragControls = useDragControls();

  return (
    <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-md flex flex-col">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Groups
          </h2>
          <Button
            variant="ghost"
            size="xs"
            onClick={onCreateGroup}
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
        onReorder={onReorder}
        className="flex-1 overflow-y-auto p-2 space-y-1"
      >
        {localRuleGroups.map((group) => {
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
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <DraggableRuleGroupItem dragControls={dragControls}>
                <RuleGroupItem
                  group={group}
                  isActive={isActive}
                  isEditorGroup={isEditorGroup}
                  rank={rank}
                  onSelect={() => onSetActiveEditorGroup(group.name)}
                  onDoubleClick={() => onGroupDoubleClick(group)}
                  onCreate={onCreateGroup}
                  onRename={() => onContextRename(group)}
                  onDelete={() => onContextDelete(group)}
                />
              </DraggableRuleGroupItem>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </aside>
  );
}
```

**Step 2: Update index.jsx to use the new component**

In `src/features/rules/index.jsx`, add the import:

```jsx
import { RulesSidebar } from './components/RulesSidebar';
```

Replace the entire sidebar section (lines 411-459) with:

```jsx
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
```

**Step 3: Remove unused imports**

Remove `useDragControls` from the framer-motion import since it's now used in the sidebar component.

**Step 4: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): extract RulesSidebar component"
```

---

## Task 7: Extract RulesEditor wrapper component

**Files:**
- Create: `src/features/rules/components/RulesEditor.jsx`
- Modify: `src/features/rules/index.jsx`

**Step 1: Write the RulesEditor component**

Create `src/features/rules/components/RulesEditor.jsx`:

```jsx
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../shared/context/ThemeContext';
import { useMonacoSave } from '../../shared/ui/MonacoEditor';
import { registerTahoeThemes, getThemeId } from '../monaco-themes';
import { initWhistleLanguage } from '../whistle-language';

// Lazy load Monaco to avoid large bundle
const MonacoEditor = lazy(() => import('../../shared/ui/MonacoEditor').then(module => ({ default: module.default })));

export function RulesEditor({
  value,
  onChange,
  isDirty,
  onSave,
  isLoading,
}) {
  const { isDark } = useTheme();
  const [monacoTheme, setMonacoTheme] = useState(getThemeId(isDark));

  // Handle save from Monaco's keyboard shortcut (Cmd+S when editor is focused)
  useMonacoSave(useCallback(() => {
    if (isDirty) {
      onSave();
    }
  }, [isDirty, onSave]));

  // Update Monaco theme when system theme changes
  useEffect(() => {
    setMonacoTheme(getThemeId(isDark));
  }, [isDark]);

  // Register Monaco language and themes before editor mounts
  const handleBeforeMount = useCallback((monaco) => {
    registerTahoeThemes(monaco);
    initWhistleLanguage(monaco);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading rules...</span>
        </div>
      </div>
    );
  }

  return (
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
        value={value}
        onChange={onChange}
        language="whistle"
        theme={monacoTheme}
        beforeMount={handleBeforeMount}
        options={{
          readOnly: false,
        }}
      />
    </Suspense>
  );
}
```

**Step 2: Update index.jsx to use the new component**

In `src/features/rules/index.jsx`, add the import and remove the lazy import:

```jsx
import { RulesEditor } from './components/RulesEditor';
```

Remove the old lazy import:
```jsx
// Remove this line:
const MonacoEditor = lazy(() => import('../../shared/ui/MonacoEditor').then(module => ({ default: module.default })));
```

Also remove these imports since they're now in RulesEditor:
- `registerTahoeThemes, getThemeId` from `./monaco-themes`
- `initWhistleLanguage` from `./whistle-language`
- `useMonacoSave` from `../../shared/ui/MonacoEditor`
- `lazy, Suspense` from React (keeping others)
- `useTheme` import

Remove these hooks/effects from index.jsx:
- `const { isDark } = useTheme();`
- `const [monacoTheme, setMonacoTheme] = useState(getThemeId(isDark));`
- The `useMonacoSave` call (lines 168-172)
- The `useEffect` for theme changes (lines 175-177)
- `handleBeforeMount` callback (lines 180-183)

Replace the editor section (lines 461-492) with:

```jsx
<div className="flex-1 overflow-hidden relative">
  <RulesEditor
    value={rules}
    onChange={setRules}
    isDirty={isDirty}
    onSave={saveRules}
    isLoading={isLoading}
  />
</div>
```

**Step 3: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): extract RulesEditor component"
```

---

## Task 8: Simplify main Rules component

**Files:**
- Modify: `src/features/rules/index.jsx`

**Step 1: Clean up and simplify the Rules component**

The main `src/features/rules/index.jsx` should now be much simpler. Update it to:

```jsx
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

export default Rules;
```

Wait, we need to keep the `useMemo` import and also need to import `toggleEnabled` and `reorderGroups` from useRules. Let me fix:

```jsx
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

export default Rules;
```

**Step 2: Verify the file is under 200 lines**

Run: `wc -l src/features/rules/index.jsx`

Expected: Output showing significantly fewer lines (should be ~100-150 lines)

**Step 3: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): simplify main Rules component to ~100 lines"
```

---

## Task 9: Add barrel exports for clean imports

**Files:**
- Create: `src/features/rules/components/index.js`
- Create: `src/features/rules/hooks/index.js`

**Step 1: Create components barrel export**

Create `src/features/rules/components/index.js`:

```javascript
export { RuleGroupItem, DraggableRuleGroupItem } from './RuleGroupItem';
export { RulesToolbar } from './RulesToolbar';
export { RulesSidebar } from './RulesSidebar';
export { RulesEditor } from './RulesEditor';
```

**Step 2: Create hooks barrel export**

Create `src/features/rules/hooks/index.js`:

```javascript
export { useRuleGroupActions } from './useRuleGroupActions';
export { useRuleGroupsDragDrop } from './useRuleGroupsDragDrop';
```

**Step 3: Update index.jsx to use barrel imports**

In `src/features/rules/index.jsx`, update imports:

```jsx
import { RulesToolbar, RulesSidebar, RulesEditor } from './components';
import { useRuleGroupActions, useRuleGroupsDragDrop } from './hooks';
```

**Step 4: Commit**

```bash
git add src/features/rules/
git commit -m "refactor(rules): add barrel exports for clean imports"
```

---

## Task 10: Verify the refactoring works correctly

**Files:**
- Test: Manual verification

**Step 1: Start development server**

Run: `npm run dev`

Expected: Vite and Electron start without errors

**Step 2: Check for TypeScript/ESLint errors**

Run: `npm run lint`

Expected: No new errors introduced

**Step 3: Manual testing checklist**

Test each feature:
- [ ] Rules page loads correctly
- [ ] Sidebar groups display with correct priority numbers
- [ ] Click on a group opens it in editor
- [ ] Double-click toggles active state
- [ ] Drag and drop reordering works
- [ ] Create new group inline row works (border-dashed list item with Add/Cancel)
- [ ] Rename group dialog works
- [ ] Delete group with confirmation works
- [ ] Monaco editor loads with correct theme
- [ ] Cmd+S saves rules
- [ ] Enable/Disable toggle button works
- [ ] Save button shows correct state (disabled when clean, "Saving..." when saving)

**Step 4: Check bundle size**

Run: `npm run build:react`

Expected: Build completes successfully, check if bundle size is reasonable

**Step 5: Final commit**

```bash
git add .
git commit -m "refactor(rules): complete modular refactoring - verify all features work"
```

---

## Summary

After completing this plan, the Rules feature will be refactored into:

```
src/features/rules/
├── components/
│   ├── index.js                    (barrel export)
│   ├── RuleGroupItem.jsx           (~150 lines) - Individual group item with context menu
│   ├── RulesToolbar.jsx            (~60 lines)  - Top toolbar with enable/disable and save
│   ├── RulesSidebar.jsx            (~90 lines)  - Sidebar with groups list
│   └── RulesEditor.jsx             (~90 lines)  - Monaco editor wrapper
├── hooks/
│   ├── index.js                    (barrel export)
│   ├── useRuleGroupActions.js      (~110 lines) - CRUD operations for groups
│   └── useRuleGroupsDragDrop.js    (~110 lines) - Drag-and-drop logic
├── index.jsx                       (~130 lines) - Main orchestration component
├── monaco-themes.ts                (unchanged)
└── whistle-language.ts             (unchanged)
```

**Benefits:**
- Each file is under 200 lines (maintainability)
- Clear separation of concerns
- Hooks are testable in isolation
- Components are reusable
- Dependency injection via props enables easy testing
- Follows existing project patterns from `src/shared/`
