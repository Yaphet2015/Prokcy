import {
  useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle,
} from 'react';
import { Button, Input, ContextMenu } from '@pikoloo/darwin-ui';
import { Pencil, Trash2 } from 'lucide-react';

export interface KeysListHandle {
  startCreating: () => void;
}

interface KeysListProps {
  values: Record<string, string>;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onCreateValue: (name: string) => void;
  onContextRename?: (key: string) => void;
  onContextDelete?: (key: string) => void;
}

const KeysList = forwardRef<KeysListHandle, KeysListProps>(({
  values,
  selectedKey,
  onSelectKey,
  onCreateValue,
  onContextRename,
  onContextDelete,
}, ref) => {
  const [searchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredKeys = useMemo(() => {
    const keys = Object.keys(values).filter(key => key !== '').sort();
    if (!searchQuery) return keys;
    const query = searchQuery.toLowerCase();
    return keys.filter(key => key.toLowerCase().includes(query));
  }, [values, searchQuery]);

  // Focus input when creating mode is enabled
  useEffect(() => {
    if (isCreating && inputRef.current) {
      const input = inputRef.current?.querySelector?.('input');
      if (input) {
        input.focus();
      }
    }
  }, [isCreating]);

  // Expose startCreating method for parent components (e.g., keyboard shortcut)
  useImperativeHandle(ref, () => ({
    startCreating: () => {
      setIsCreating(true);
    },
  }));

  // Listen for custom event from parent (keyboard shortcut)
  useEffect(() => {
    const handleStartCreate = () => {
      setIsCreating(true);
    };
    window.addEventListener('values-start-create', handleStartCreate);
    return () => window.removeEventListener('values-start-create', handleStartCreate);
  }, []);

  useEffect(() => {
    if (!isCreating) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreating(false);
        setNewKeyName('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreating]);

  const handleNewKeyConfirm = () => {
    const name = newKeyName.trim();
    if (!name) {
      setIsCreating(false);
      setNewKeyName('');
      return;
    }
    onCreateValue(name);
    onSelectKey(name);
    setIsCreating(false);
    setNewKeyName('');
  };

  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNewKeyConfirm();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewKeyName('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <Input
          placeholder="Search values..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
      </div> */}

      {/* Keys list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Inline input for creating new value */}
        {isCreating && (
          <div className="px-3 py-2 rounded-lg border border-blue-500 bg-blue-500/10 dark:bg-blue-500/20">
            <Input
              ref={inputRef}
              placeholder="New value name..."
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={handleNewKeyDown}
              size="sm"
              autoComplete="off"
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="primary" onClick={handleNewKeyConfirm}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewKeyName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {filteredKeys.length === 0 && !isCreating ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 text-sm py-8">
            {searchQuery ? 'No matching values' : 'No values yet'}
          </div>
        ) : (
          filteredKeys.map(key => {
            const handleRenameSelect = () => {
              onContextRename?.(key);
            };
            const handleDeleteSelect = () => {
              onContextDelete?.(key);
            };
            return (
              <ContextMenu key={key}>
                <ContextMenu.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectKey(key)}
                    className={`w-full px-3 py-2 rounded-lg border transition-all text-left ${
                      selectedKey === key
                        ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                        : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                    title={`Click to edit ${key}. Right-click for more options.`}
                  >
                    <span className="text-sm font-medium truncate block text-zinc-900 dark:text-zinc-100">{key}</span>
                  </button>
                </ContextMenu.Trigger>
                <ContextMenu.Content>
                  {onContextRename && (
                    <ContextMenu.Item onSelect={handleRenameSelect}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Rename
                    </ContextMenu.Item>
                  )}
                  {onContextDelete && (
                    <ContextMenu.Item destructive onSelect={handleDeleteSelect}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </ContextMenu.Item>
                  )}
                </ContextMenu.Content>
              </ContextMenu>
            );
          })
        )}
      </div>
    </div>
  );
});

KeysList.displayName = 'KeysList';

export default KeysList;
