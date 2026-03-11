import {
  Suspense, useEffect, useState, useCallback,
} from 'react';
import type * as Monaco from 'monaco-editor';
import { useTheme } from '../../../shared/context/ThemeContext';
import { initJson5Language, JSON5_LANGUAGE_ID } from '../constants';
import MonacoEditor from '../../../shared/ui/LazyMonacoEditor';
import { useMonacoSave } from '../../../shared/ui/useMonacoSave';
import Modal from '../../../shared/ui/Modal';
import { getThemeId } from '../../rules/monaco-themes';

interface ValueEditorProps {
  selectedKey: string | null;
  value: string;
  onChange: (value: string) => void;
  isDirty: boolean;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavableDirtyValues: boolean;
  onValidationChange?: (key: string, isValid: boolean) => void;
}

export default function ValueEditor({
  selectedKey,
  value,
  onChange,
  isDirty,
  onSave,
  isSaving,
  hasUnsavableDirtyValues,
  onValidationChange,
}: ValueEditorProps): React.JSX.Element {
  const { isDark } = useTheme();
  const initialValue = typeof value === 'string' && value.length > 0 ? value : '{}';
  const [editorValue, setEditorValue] = useState(initialValue);
  const [isValid, setIsValid] = useState(true);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const validateValue = useCallback((input: string): boolean => {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Sync editor value with prop value
  useEffect(() => {
    const nextValue = typeof value === 'string' && value.length > 0 ? value : '{}';
    setEditorValue(nextValue);
    const nextValid = validateValue(nextValue);
    setIsValid(nextValid);
    if (selectedKey) {
      onValidationChange?.(selectedKey, nextValid);
    }
  }, [selectedKey, value, onValidationChange, validateValue]);

  // Handle save from Monaco's keyboard shortcut (Cmd+S when editor is focused)
  useMonacoSave(useCallback(() => {
    if (isDirty && !isSaving && !hasUnsavableDirtyValues && isValid) {
      onSave();
    }
  }, [isDirty, isSaving, hasUnsavableDirtyValues, isValid, onSave]));

  const handleBeforeMount = useCallback((monaco: typeof Monaco) => {
    initJson5Language(monaco);
  }, []);

  const handleChange = useCallback((newValue: string | undefined) => {
    const newValueStr = newValue ?? '{}';
    setEditorValue(newValueStr);
    onChange(newValueStr);
    const nextValid = validateValue(newValueStr);
    setIsValid(nextValid);
    if (selectedKey) {
      onValidationChange?.(selectedKey, nextValid);
    }
  }, [onChange, onValidationChange, selectedKey, validateValue]);

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
            theme={getThemeId(isDark)}
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
