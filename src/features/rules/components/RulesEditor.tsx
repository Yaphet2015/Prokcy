import {
  lazy, Suspense, useCallback,
} from 'react';
import type * as Monaco from 'monaco-editor';
import { useTheme } from '../../../shared/context/ThemeContext';
import { useMonacoSave } from '../../../shared/ui/MonacoEditor';
import { registerTahoeThemes, getThemeId } from '../monaco-themes';
import { initWhistleLanguage } from '../whistle-language';

const MonacoEditor = lazy(() => import('../../../shared/ui/MonacoEditor').then((module) => ({ default: module.default })));

interface RulesEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDirty: boolean;
  onSave: () => void;
  isLoading: boolean;
}

export function RulesEditor({
  value,
  onChange,
  isDirty,
  onSave,
  isLoading,
}: RulesEditorProps): React.JSX.Element {
  const { isDark } = useTheme();

  useMonacoSave(useCallback(() => {
    if (isDirty) {
      onSave();
    }
  }, [isDirty, onSave]));

  const handleBeforeMount = useCallback((monaco: typeof Monaco) => {
    registerTahoeThemes(monaco);
    initWhistleLanguage(monaco);
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
        value={value}
        onChange={onChange}
        language="whistle"
        theme={getThemeId(isDark)}
        beforeMount={handleBeforeMount}
        options={{
          readOnly: false,
        }}
      />
    </Suspense>
  );
}

RulesEditor.displayName = 'RulesEditor';
