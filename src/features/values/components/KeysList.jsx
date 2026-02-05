import {
  useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle,
} from 'react';
import { Button, Input } from '@pikoloo/darwin-ui';

const KeysList = forwardRef(({
  values, selectedKey, onSelectKey, onCreateValue,
}, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const inputRef = useRef(null);

  const filteredKeys = useMemo(() => {
    const keys = Object.keys(values).sort();
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
    if (isCreating) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsCreating(false);
          setNewKeyName('');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isCreating]);

  const handleNewKeyConfirm = () => {
    const name = newKeyName.trim();
    if (name) {
      onCreateValue(name);
      onSelectKey(name);
    }
    setIsCreating(false);
    setNewKeyName('');
  };

  const handleNewKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNewKeyConfirm();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewKeyName('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <Input
          placeholder="Search values..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
      </div>

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
              <Button size="xs" variant="primary" onClick={handleNewKeyConfirm}>
                Add
              </Button>
              <Button
                size="xs"
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
          filteredKeys.map(key => (
            <button
              key={key}
              onClick={() => onSelectKey(key)}
              className={`w-full px-3 py-2 rounded-lg border transition-all text-left ${
                selectedKey === key
                  ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                  : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="text-sm font-medium truncate block text-zinc-900 dark:text-zinc-100">{key}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
});

KeysList.displayName = 'KeysList';

export default KeysList;
