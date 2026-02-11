import {
  lazy, Suspense, useEffect, useState, useCallback,
} from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { Trash2 } from 'lucide-react';
import type * as Monaco from 'monaco-editor';
import { useTheme } from '../../../shared/context/ThemeContext';
import { initJson5Language, JSON5_LANGUAGE_ID } from '../constants';
import { useMonacoSave } from '../../../shared/ui/MonacoEditor';
import Modal from '../../../shared/ui/Modal';
import { getThemeId } from '../../rules/monaco-themes';

const MonacoEditor = lazy(() => import('../../../shared/ui/MonacoEditor').then((m) => ({ default: m.default })));

interface ValueEditorProps {
  selectedKey: string | null;
  value: string;
  onChange: (value: string) => void;
  onDelete: () => void;
  isSaving: boolean;
  error: string | null;
}

export default function ValueEditor({
  selectedKey,
  value,
  onChange,
  onDelete,
  isSaving,
  error,
}: ValueEditorProps): React.JSX.Element {
  const { isDark } = useTheme();
  const [editorValue, setEditorValue] = useState(value || '{}');
  const [isValid, setIsValid] = useState(true);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [monacoTheme, setMonacoTheme] = useState(getThemeId(isDark));

  // Sync editor value with prop value
  useEffect(() => {
    setEditorValue(value || '{}');
  }, [selectedKey, value]);

  // Update Monaco theme when system theme changes
  useEffect(() => {
    setMonacoTheme(getThemeId(isDark));
  }, [isDark]);

  // Handle save from Monaco's keyboard shortcut (Cmd+S when editor is focused)
  useMonacoSave(useCallback(() => {
    if (isValid && editorValue !== value) {
      onChange(editorValue);
    }
  }, [isValid, editorValue, value, onChange]));

  const handleBeforeMount = useCallback((monaco: typeof Monaco) => {
    initJson5Language(monaco);
  }, []);

  const handleChange = useCallback((newValue: string | undefined) => {
    const newValueStr = newValue ?? '{}';
    setEditorValue(newValueStr);

    try {
      JSON.parse(newValueStr);
      setIsValid(true);
      onChange(newValueStr);
    } catch {
      setIsValid(false);
    }
  }, [onChange]);

  const handleDelete = useCallback(() => {
    if (selectedKey && onDelete) {
      onDelete();
    }
  }, [selectedKey, onDelete]);

  const handleRename = useCallback(() => {
    setIsRenameModalOpen(true);
  }, []);

  const handleRenameConfirm = useCallback((newName: string) => {
    if (newName && newName.trim() && newName.trim() !== selectedKey) {
      window.dispatchEvent(new CustomEvent('values-rename', {
        detail: { oldKey: selectedKey, newKey: newName.trim() },
      }));
    }
    setIsRenameModalOpen(false);
  }, [selectedKey]);

  const handleRenameCancel = useCallback(() => {
    setIsRenameModalOpen(false);
  }, []);

  if (!selectedKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400">Select a value or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {/* eslint-disable-next-line max-len -- className for styling can't be easily split */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedKey}
          </h2>
          <button
            onClick={handleRename}
            // eslint-disable-next-line max-len -- className for styling can't be easily split
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Rename
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && <span className="text-xs text-blue-500">Saving...</span>}
          {!isSaving && !isValid && <span className="text-xs text-red-500">Invalid JSON</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={(
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading editor...</span>
              </div>
            </div>
          )}
        >
          <MonacoEditor
            value={editorValue}
            onChange={handleChange}
            language={JSON5_LANGUAGE_ID}
            theme={monacoTheme}
            beforeMount={handleBeforeMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: 'SF Mono, Monaco, monospace',
              padding: { top: 16, bottom: 16 },
              readOnly: false,
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

ValueEditor.displayName = 'ValueEditor';
