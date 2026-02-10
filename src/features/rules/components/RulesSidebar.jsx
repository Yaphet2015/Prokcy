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

RulesSidebar.displayName = 'RulesSidebar';
