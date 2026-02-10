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
            <div className="mt-1 flex items-center gap-1.5">
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

RuleGroupItem.displayName = 'RuleGroupItem';

// Draggable wrapper component
export function DraggableRuleGroupItem({ children, dragControls }) {
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

DraggableRuleGroupItem.displayName = 'DraggableRuleGroupItem';
