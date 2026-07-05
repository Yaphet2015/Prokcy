import {
  Suspense, useCallback, useEffect, useRef, useState,
} from 'react';
import type * as Monaco from 'monaco-editor';
import { useTheme } from '../../../shared/context/ThemeContext';
import MonacoEditor from '../../../shared/ui/LazyMonacoEditor';
import { useMonacoSave } from '../../../shared/ui/useMonacoSave';
import { getThemeId } from '../monaco-themes';
import { getRulesNavigationTarget } from '../utils/navigationTarget';
import { registerValueReferenceCompletionProvider } from '../utils/valueReferenceCompletions';

interface RulesEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDirty: boolean;
  onSave: () => void;
  isLoading: boolean;
  valueKeys: string[];
  onNavigateToValueKey?: (key: string) => void;
  onFileNavigationResult?: (result: ServiceOperationResult) => void;
}

export function RulesEditor({
  value,
  onChange,
  isDirty,
  onSave,
  isLoading,
  valueKeys,
  onNavigateToValueKey,
  onFileNavigationResult,
}: RulesEditorProps): React.JSX.Element {
  const { isDark } = useTheme();
  const safeValue = typeof value === 'string' ? value : '';
  const valueKeysRef = useRef(valueKeys);
  const [editorInstance, setEditorInstance] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<typeof Monaco | null>(null);

  useEffect(() => {
    valueKeysRef.current = valueKeys;
  }, [valueKeys]);

  useMonacoSave(useCallback(() => {
    if (isDirty) {
      onSave();
    }
  }, [isDirty, onSave]));

  useEffect(() => {
    if (!editorInstance) {
      return undefined;
    }

    const disposable = editorInstance.onMouseDown((event) => {
      const position = event.target.position;
      const browserEvent = event.event.browserEvent;
      if (!position || !(browserEvent.metaKey || browserEvent.ctrlKey)) {
        return;
      }

      const model = editorInstance.getModel();
      if (!model) {
        return;
      }

      const target = getRulesNavigationTarget(
        model.getLineContent(position.lineNumber),
        position.column,
      );
      if (!target) {
        return;
      }

      browserEvent.preventDefault();
      browserEvent.stopPropagation();

      if (target.type === 'value-ref') {
        onFileNavigationResult?.({ success: true, code: 'success' });
        onNavigateToValueKey?.(target.key);
        return;
      }

      void window.electron?.openFileProtocolTarget?.(target.target).then((result) => {
        onFileNavigationResult?.(result ?? { success: false, code: 'open_failed', message: `Failed to open ${target.target}` });
      }).catch((error) => {
        onFileNavigationResult?.({
          success: false,
          code: 'open_failed',
          message: error instanceof Error ? error.message : 'Failed to open file protocol target.',
        });
      });
    });

    return () => {
      disposable.dispose();
    };
  }, [editorInstance, onFileNavigationResult, onNavigateToValueKey]);

  useEffect(() => {
    if (!monacoInstance) {
      return undefined;
    }

    const disposable = registerValueReferenceCompletionProvider(
      monacoInstance,
      () => valueKeysRef.current,
    );

    return () => {
      disposable.dispose();
    };
  }, [monacoInstance]);

  const handleEditorMount = useCallback((
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco,
  ) => {
    setEditorInstance(editor);
    setMonacoInstance(monaco);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading rules...</span>
        </div>
      </div>
    );
  }

  return (
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
        value={safeValue}
        onChange={onChange}
        language="whistle"
        theme={getThemeId(isDark)}
        onEditorMount={handleEditorMount}
        options={{
          readOnly: false,
        }}
      />
    </Suspense>
  );
}

RulesEditor.displayName = 'RulesEditor';
