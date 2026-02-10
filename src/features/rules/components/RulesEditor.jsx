import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../../shared/context/ThemeContext';
import { useMonacoSave } from '../../../shared/ui/MonacoEditor';
import { registerTahoeThemes, getThemeId } from '../monaco-themes';
import { initWhistleLanguage } from '../whistle-language';

// Lazy load Monaco to avoid large bundle
const MonacoEditor = lazy(() => import('../../../shared/ui/MonacoEditor').then(module => ({ default: module.default })));

export function RulesEditor({
  value,
  onChange,
  isDirty,
  onSave,
  isLoading,
}) {
  const { isDark } = useTheme();
  const [monacoTheme, setMonacoTheme] = useState(getThemeId(isDark));

  // Handle save from Monaco's keyboard shortcut (Cmd+S when editor is focused)
  useMonacoSave(useCallback(() => {
    if (isDirty) {
      onSave();
    }
  }, [isDirty, onSave]));

  // Update Monaco theme when system theme changes
  useEffect(() => {
    setMonacoTheme(getThemeId(isDark));
  }, [isDark]);

  // Register Monaco language and themes before editor mounts
  const handleBeforeMount = useCallback((monaco) => {
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
        theme={monacoTheme}
        beforeMount={handleBeforeMount}
        options={{
          readOnly: false,
        }}
      />
    </Suspense>
  );
}
