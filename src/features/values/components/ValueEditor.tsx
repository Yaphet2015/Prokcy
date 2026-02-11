import {
  useEffect, useRef, type KeyboardEvent, ChangeEvent,
} from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { Trash2 } from 'lucide-react';

interface ValueEditorProps {
  selectedKey: string | null;
  value: string;
  onChange: (value: string) => void;
  onDelete: () => void;
  isSaving: boolean;
  error: string | null;
}

// Editor events
const VALUE_EDITOR_RENAME_EVENT = 'values-rename' as const;

export default function ValueEditor({
  selectedKey,
  value,
  onChange,
  onDelete,
  isSaving,
  error,
}: ValueEditorProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selectedKey && value === '' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedKey, value]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);

    // Notify parent to handle rename when user types new value
    if (selectedKey && e.target.value !== value) {
      const event = new CustomEvent(VALUE_EDITOR_RENAME_EVENT, {
        detail: {
          oldKey: selectedKey,
          newKey: e.target.value,
        },
      });
      window.dispatchEvent(event);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl+Enter: Save value
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Just trigger blur, parent will handle save
      (e.target as HTMLTextAreaElement).blur();
    }

    // Escape: Revert changes
    if (e.key === 'Escape') {
      e.preventDefault();
      onChange(selectedKey || '');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedKey || 'No Value Selected'}
          </h2>

          {selectedKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              leftIcon={<Trash2 className="w-4 h-4" />}
              title="Delete value"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        {selectedKey ? (
          <>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="w-full h-full resize-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none font-mono text-sm"
              placeholder="Type JSON value here..."
              spellCheck={false}
            />
            {error && (
              <div className="mt-2 text-xs text-red-500">
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Select a value or create a new one to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

ValueEditor.displayName = 'ValueEditor';
