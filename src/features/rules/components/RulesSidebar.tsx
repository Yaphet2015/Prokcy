import { useEffect, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Button, Input } from '@pikoloo/darwin-ui';
import { Plus } from 'lucide-react';
import { RuleGroupItem, ReorderableGroupItem } from './RuleGroupItem';

interface RuleGroup {
  name: string;
  selected?: boolean;
}

interface RulesSidebarProps {
  localRuleGroups: RuleGroup[];
  activeGroupNames: string[];
  activeEditorGroupName: string;
  activePriorityIndex: Record<string, number>;
  onCreateGroup: (name: string) => Promise<{ success: boolean; message?: string }>;
  onGroupDoubleClick: (group: RuleGroup) => void;
  onContextRename: (group: RuleGroup) => void;
  onContextDelete: (group: RuleGroup) => void;
  onSetActiveEditorGroup: (name: string) => void;
  onReorder: (groups: RuleGroup[]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
}

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
}: RulesSidebarProps): React.JSX.Element {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) {
      const input = inputRef.current?.querySelector?.('input');
      if (input) {
        input.focus();
      }
    }
  }, [isCreating]);

  const handleStartCreate = () => {
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewGroupName('');
  };

  const handleConfirmCreate = async () => {
    const name = newGroupName.trim();
    if (!name) {
      handleCancelCreate();
      return;
    }

    const result = await onCreateGroup(name);
    if (result.success) {
      handleCancelCreate();
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmCreate();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCreate();
    }
  };

  return (
    <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-md flex flex-col">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Groups
          </h2>
          <Button
            className="hover:dark:text-zinc-950"
            variant="ghost"
            size="sm"
            onClick={handleStartCreate}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            title="Create new group"
          >
            New
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isCreating ? (
          <div className="px-3 py-2 rounded-lg border border-dashed border-zinc-500 bg-blue-500/10 dark:bg-blue-500/20">
            <Input
              ref={inputRef}
              placeholder="New group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              size="sm"
              autoComplete="off"
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="primary" onClick={() => { handleConfirmCreate(); }}>
                Add
              </Button>
              <Button
                className="hover:dark:text-zinc-950"
                size="sm"
                variant="ghost"
                onClick={handleCancelCreate}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        <Reorder.Group
          axis="y"
          values={localRuleGroups}
          onReorder={onReorder}
          className="space-y-1"
        >
          {localRuleGroups.map((group) => {
            const isActive = activeGroupNames.includes(group.name);
            const isEditorGroup = group.name === activeEditorGroupName;
            const rank = activePriorityIndex[group.name];
            return (
              <ReorderableGroupItem
                key={group.name}
                value={group}
                dragListener={false}
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
                <RuleGroupItem
                  group={group}
                  isActive={isActive}
                  isEditorGroup={isEditorGroup}
                  rank={rank}
                  onSelect={() => onSetActiveEditorGroup(group.name)}
                  onDoubleClick={() => onGroupDoubleClick(group)}
                  onCreate={handleStartCreate}
                  onRename={() => onContextRename(group)}
                  onDelete={() => onContextDelete(group)}
                />
              </ReorderableGroupItem>
            );
          })}
        </Reorder.Group>
      </div>
    </aside>
  );
}

RulesSidebar.displayName = 'RulesSidebar';
