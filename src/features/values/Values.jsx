import { useEffect } from 'react';
import { useValues } from '../../shared/context/ValuesContext';
import KeysList from './components/KeysList';
import ValueEditor from './components/ValueEditor';

export default function Values() {
  const {
    values,
    selectedKey,
    selectKey,
    setValue,
    deleteValue,
    createValue,
    renameKey,
    isLoading,
    isSaving,
    error,
  } = useValues();

  const handleValueChange = (newValue) => {
    if (selectedKey) {
      setValue(selectedKey, newValue);
    }
  };

  // Handle rename event from ValueEditor
  useEffect(() => {
    const handler = (e) => {
      const { oldKey, newKey } = e.detail;
      renameKey(oldKey, newKey);
    };
    window.addEventListener('values-rename', handler);
    return () => window.removeEventListener('values-rename', handler);
  }, [renameKey]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+N: Create new value
      if (isMod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        const name = prompt('Enter new value name:');
        if (name && name.trim()) {
          createValue(name.trim());
        }
      }

      // Cmd/Ctrl+Shift+R: Rename selected
      if (isMod && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (selectedKey) {
          const newName = prompt('Enter new name:', selectedKey);
          if (newName && newName.trim() && newName.trim() !== selectedKey) {
            renameKey(selectedKey, newName.trim());
          }
        }
      }

      // Cmd/Ctrl+D: Delete selected
      if (isMod && e.key === 'd' && !e.shiftKey) {
        e.preventDefault();
        if (selectedKey) {
          deleteValue(selectedKey);
        }
      }

      // Cmd/Ctrl+F: Focus search
      if (isMod && e.key === 'f' && !e.shiftKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKey, createValue, renameKey, deleteValue]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-tahoe-subtle">Loading values...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-tahoe-bg text-tahoe-fg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tahoe-border glass-tahoe">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-tahoe-fg">Values</h1>
          <span className="text-xs text-tahoe-subtle">
            ({Object.keys(values).length})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && <span className="text-xs text-tahoe-accent">Saving...</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex">
        <aside className="w-72 border-r border-tahoe-border bg-tahoe-surface backdrop-blur-md">
          <KeysList
            values={values}
            selectedKey={selectedKey}
            onSelectKey={selectKey}
            onCreateValue={createValue}
          />
        </aside>

        <main className="flex-1 overflow-hidden">
          <ValueEditor
            selectedKey={selectedKey}
            value={selectedKey ? values[selectedKey] : ''}
            onChange={handleValueChange}
            onDelete={deleteValue}
            isSaving={isSaving}
            error={error}
          />
        </main>
      </div>

      {/* Help text */}
      <div className="px-4 py-2 border-t border-tahoe-border text-xs text-tahoe-subtle">
        <span className="font-medium">Format:</span> JSON5 (comments allowed, trailing commas allowed)
        <span className="mx-2">-</span>
        <span className="font-medium">Shortcuts:</span> Cmd+N New - Cmd+Shift+R Rename - Cmd+D Delete - Cmd+F Search
      </div>
    </div>
  );
}
