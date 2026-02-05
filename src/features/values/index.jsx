import { useEffect, useState, useRef } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { Plus } from 'lucide-react';
import { useValues } from '../../shared/context/ValuesContext';
import KeysList from './components/KeysList';
import ValueEditor from './components/ValueEditor';
import Modal from '../../shared/ui/Modal';

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

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const keysListRef = useRef(null);

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

      // Cmd/Ctrl+N: Create new value (trigger inline input in KeysList)
      if (isMod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        // Dispatch custom event to KeysList to start creating
        window.dispatchEvent(new CustomEvent('values-start-create'));
      }

      // Cmd/Ctrl+Shift+R: Rename selected
      // if (isMod && e.shiftKey && e.key === 'R') {
      //   e.preventDefault();
      //   if (selectedKey) {
      //     setIsRenameModalOpen(true);
      //   }
      // }

      // Cmd/Ctrl+D: Delete selected
      // if (isMod && e.key === 'd' && !e.shiftKey) {
      //   e.preventDefault();
      //   if (selectedKey) {
      //     deleteValue(selectedKey);
      //   }
      // }

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
  }, [selectedKey, deleteValue]);

  const handleRenameConfirm = (newName) => {
    if (selectedKey && newName && newName.trim() && newName.trim() !== selectedKey) {
      renameKey(selectedKey, newName.trim());
    }
    setIsRenameModalOpen(false);
  };

  const handleRenameCancel = () => {
    setIsRenameModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading values...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="blur-xl">
        <div className="flex items-center gap-3 absolute right-4 top-1/2 -translate-y-1/2">
          {isSaving && <span className="text-xs text-blue-500">Saving...</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex">
        <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-md">
          {/* Sidebar Header */}
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Values
              </h2>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => window.dispatchEvent(new CustomEvent('values-start-create'))}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                title="Create new value"
              >
                New
              </Button>
            </div>
          </div>

          <KeysList
            ref={keysListRef}
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

      {/* Modals */}
      <Modal
        isOpen={isRenameModalOpen}
        title="Rename Value"
        message="Enter a new name for this value:"
        defaultValue={selectedKey}
        onConfirm={handleRenameConfirm}
        onCancel={handleRenameCancel}
      />
    </div>
  );
}
