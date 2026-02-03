import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../../shared/context/ThemeContext';
import { initJson5Language, JSON5_LANGUAGE_ID } from '../constants';
import Modal from '../../../shared/ui/Modal';

const MonacoEditor = lazy(() => import('../../../shared/ui/MonacoEditor').then(m => ({ default: m.default })));

export default function ValueEditor({
  selectedKey,
  value,
  onChange,
  onDelete,
  isSaving,
  error
}) {
  const { isDark } = useTheme();
  const [editorValue, setEditorValue] = useState(value || '{}');
  const [isValid, setIsValid] = useState(true);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  useEffect(() => {
    setEditorValue(value || '{}');
  }, [selectedKey, value]);

  const handleBeforeMount = useCallback((monaco) => {
    initJson5Language(monaco);
  }, []);

  const handleChange = useCallback((newValue) => {
    setEditorValue(newValue);
    try {
      JSON.parse(newValue);
      setIsValid(true);
      onChange(newValue);
    } catch {
      setIsValid(false);
    }
  }, [onChange]);

  const handleDelete = () => {
    if (selectedKey && onDelete) {
      onDelete(selectedKey);
    }
  };

  const handleRename = () => {
    setIsRenameModalOpen(true);
  };

  const handleRenameConfirm = (newName) => {
    if (newName && newName.trim() && newName.trim() !== selectedKey) {
      window.dispatchEvent(new CustomEvent('values-rename', {
        detail: { oldKey: selectedKey, newKey: newName.trim() }
      }));
    }
    setIsRenameModalOpen(false);
  };

  const handleRenameCancel = () => {
    setIsRenameModalOpen(false);
  };

  if (!selectedKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-tahoe-subtle">Select a value or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tahoe-border glass-tahoe">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-tahoe-fg">{selectedKey}</h2>
          <button
            onClick={handleRename}
            className="text-xs text-tahoe-subtle hover:text-tahoe-fg transition-colors"
          >
            Rename
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && <span className="text-xs text-tahoe-accent">Saving...</span>}
          {!isSaving && !isValid && <span className="text-xs text-red-500">Invalid JSON</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}

          <button
            onClick={handleDelete}
            className="h-7 px-3 text-xs rounded-md font-medium transition-all bg-red-600 text-white hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="h-full flex items-center justify-center">Loading editor...</div>}>
          <MonacoEditor
            value={editorValue}
            onChange={handleChange}
            language={JSON5_LANGUAGE_ID}
            theme={isDark ? 'tahoe-dark' : 'tahoe-light'}
            beforeMount={handleBeforeMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: 'SF Mono, Monaco, monospace',
              padding: { top: 16 },
            }}
          />
        </Suspense>
      </div>

      {/* Rename modal */}
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
