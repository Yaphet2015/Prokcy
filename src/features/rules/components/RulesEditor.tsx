import {
  Suspense, useCallback, useEffect, useState,
} from 'react';
import type * as Monaco from 'monaco-editor';
import { useTheme } from '../../../shared/context/ThemeContext';
import MonacoEditor from '../../../shared/ui/LazyMonacoEditor';
import { useMonacoSave } from '../../../shared/ui/useMonacoSave';
import { registerTahoeThemes, getThemeId } from '../monaco-themes';
import { initWhistleLanguage } from '../whistle-language';
import { getRulesNavigationTarget } from '../utils/navigationTarget';

interface RulesEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDirty: boolean;
  onSave: () => void;
  isLoading: boolean;
  onNavigateToValueKey?: (key: string) => void;
  onFileNavigationResult?: (result: ServiceOperationResult) => void;
}

export function RulesEditor({
  value,
  onChange,
  isDirty,
  onSave,
  isLoading,
  onNavigateToValueKey,
  onFileNavigationResult,
}: RulesEditorProps): React.JSX.Element {
  const { isDark } = useTheme();
  const safeValue = typeof value === 'string' ? value : '';
  const [editorInstance, setEditorInstance] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);

  useMonacoSave(useCallback(() => {
    if (isDirty) {
      onSave();
    }
  }, [isDirty, onSave]));

  const handleBeforeMount = useCallback((monaco: typeof Monaco) => {
    registerTahoeThemes(monaco);
    initWhistleLanguage(monaco);
  }, []);

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
        beforeMount={handleBeforeMount}
        onEditorMount={setEditorInstance}
        options={{
          readOnly: false,
        }}
      />
    </Suspense>
  );
}

RulesEditor.displayName = 'RulesEditor';
