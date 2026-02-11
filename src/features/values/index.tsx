import { useEffect, useState, useRef } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { Plus } from 'lucide-react';
import { useValues } from '../../shared/context/ValuesContext';
import ContentHeader from '../../shared/ui/ContentHeader';
import KeysList, { type KeysListHandle } from './components/KeysList';
import ValueEditor from './components/ValueEditor';
import Modal, { usePrompt } from '../../shared/ui/Modal';
import { useConfirm } from '../../shared/ui/ConfirmDialog';

// Types for event handling
interface ValuesRenameEventDetail {
  oldKey: string;
  newKey: string;
}

export default function Values({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }): React.JSX.Element {
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
  const keysListRef = useRef<KeysListHandle>(null);

  // Dialog hooks
  const [showPrompt, promptElement] = usePrompt();
  const [showConfirm, confirmElement] = useConfirm();

  const handleValueChange = (newValue: string) => {
    if (selectedKey) {
      setValue(selectedKey, newValue);
    }
  };

  // Handle rename event from ValueEditor
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ValuesRenameEventDetail>;
      const { oldKey, newKey } = customEvent.detail;
      renameKey(oldKey, newKey);
    };
    window.addEventListener('values-rename', handler);
    return () => window.removeEventListener('values-rename', handler);
  }, [renameKey]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+N: Create new value (trigger inline input in KeysList)
      if (isMod && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        // Dispatch custom event to KeysList to start creating
        window.dispatchEvent(new CustomEvent('values-start-create'));
      }

      // // Cmd/Ctrl+Shift+R: Rename selected
      // if (isMod && e.shiftKey && e.key === 'R') {
      //   e.preventDefault();
      //   if (selectedKey) {
      //     setIsRenameModalOpen(true);
      //   }
      // }

      // // Cmd/Ctrl+D: Delete selected
      // if (isMod && !e.shiftKey && e.key === 'd' && !e.shiftKey) {
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
          (searchInput as HTMLInputElement).focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKey, deleteValue]);

  const handleRenameConfirm = (newName: string) => {
    if (selectedKey && newName && newName.trim() && newName.trim() !== selectedKey) {
      renameKey(selectedKey, newName.trim());
    }
    setIsRenameModalOpen(false);
  };

  const handleRenameCancel = () => {
    setIsRenameModalOpen(false);
  };

  const handleDeleteValue = () => {
    if (selectedKey) {
      deleteValue(selectedKey);
    }
  };

  // Handle rename from context menu
  const handleContextRename = async (key: string) => {
    if (!key) return;

    const name = await showPrompt({
      title: 'Rename Value',
      message: `Enter a new name for "${key}":`,
      defaultValue: key,
    });

    if (!name?.trim()) {
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.toLowerCase() === key.toLowerCase()) {
      return;
    }

    await renameKey(key, trimmedName);
  };

  // Handle delete from context menu
  const handleContextDelete = async (key: string) => {
    if (!key) return;

    const confirmed = await showConfirm({
      title: 'Delete Value',
      message: `Are you sure you want to delete "${key}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    await deleteValue(key);
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
    <>
      {promptElement}
      {confirmElement}
      <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <ContentHeader
          viewName="values"
          isSidebarCollapsed={isSidebarCollapsed}
          statusMessage={(
            <>
              {isSaving && <span className="text-xs text-blue-500">Saving...</span>}
              {error && <span className="text-xs text-red-500">{error}</span>}
            </>
          )}
        />

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
                  size="sm"
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
              onContextRename={handleContextRename}
              onContextDelete={handleContextDelete}
            />
          </aside>

          <main className="flex-1 overflow-hidden">
            <ValueEditor
              selectedKey={selectedKey}
              value={selectedKey ? (values[selectedKey] ?? '') : ''}
              onChange={handleValueChange}
              onDelete={handleDeleteValue}
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
          defaultValue={selectedKey ?? ''}
          onConfirm={handleRenameConfirm}
          onCancel={handleRenameCancel}
        />
      </div>
    </>
  );
}
