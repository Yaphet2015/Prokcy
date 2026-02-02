import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useRules } from '../../shared/context/RulesContext';
import { useTheme } from '../../shared/context/ThemeContext';
import { registerTahoeThemes, getThemeId } from './monaco-themes';
import { initWhistleLanguage } from './whistle-language';

// Lazy load Monaco to avoid large bundle
const MonacoEditor = lazy(() => import('../../shared/ui/MonacoEditor').then(module => ({ default: module.default })));

export default function Rules() {
  const {
    rules,
    setRules,
    saveRules,
    revertRules,
    toggleEnabled,
    isDirty,
    isLoading,
    isSaving,
    isEnabled,
    error,
  } = useRules();

  const { isDark } = useTheme();
  const [monacoTheme, setMonacoTheme] = useState(getThemeId(isDark));

  // Update Monaco theme when system theme changes
  useEffect(() => {
    setMonacoTheme(getThemeId(isDark));
  }, [isDark]);

  // Keyboard shortcut for save (Cmd/Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          saveRules();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, saveRules]);

  // Register Monaco language and themes before editor mounts
  const handleBeforeMount = useCallback((monaco) => {
    registerTahoeThemes(monaco);
    initWhistleLanguage(monaco);
  }, []);

  const handleSave = () => {
    saveRules();
  };

  const handleRevert = () => {
    revertRules();
  };

  const handleToggleEnabled = () => {
    toggleEnabled();
  };

  return (
    <div className="h-full flex flex-col bg-tahoe-bg text-tahoe-fg">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tahoe-border glass-tahoe">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-tahoe-fg">Rules</h1>
          <span className="text-xs text-tahoe-subtle">
            ({isEnabled ? 'Enabled' : 'Disabled'})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          {isSaving && (
            <span className="text-xs text-tahoe-accent">Saving...</span>
          )}
          {!isSaving && isDirty && (
            <span className="text-xs text-tahoe-subtle">Unsaved changes</span>
          )}
          {!isSaving && !isDirty && (
            <span className="text-xs text-tahoe-subtle">Saved</span>
          )}

          {/* Error message */}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}

          {/* Action buttons */}
          <button
            onClick={handleRevert}
            disabled={!isDirty || isSaving}
            className="h-7 px-3 text-xs rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-tahoe-border text-tahoe-fg hover:bg-tahoe-hover"
            title="Revert changes (Esc)"
          >
            Revert
          </button>

          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="h-7 px-3 text-xs rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-tahoe-accent text-white hover:opacity-90"
            title="Save rules (Cmd+S)"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={handleToggleEnabled}
            className={`h-7 px-3 text-xs rounded-md font-medium transition-all ${
              isEnabled
                ? 'bg-green-600 text-white hover:opacity-90'
                : 'bg-tahoe-border text-tahoe-fg hover:bg-tahoe-hover'
            }`}
            title={isEnabled ? 'Disable all rules' : 'Enable all rules'}
          >
            {isEnabled ? 'Disable All' : 'Enable All'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-tahoe-subtle">Loading rules...</span>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-tahoe-subtle">Loading editor...</span>
                </div>
              </div>
            }
          >
            <MonacoEditor
              value={rules}
              onChange={setRules}
              language="whistle"
              theme={monacoTheme}
              beforeMount={handleBeforeMount}
              options={{
                readOnly: false,
              }}
            />
          </Suspense>
        )}
      </div>

      {/* Help text */}
      <div className="px-4 py-2 border-t border-tahoe-border text-xs text-tahoe-subtle">
        <span className="font-medium">Syntax:</span> pattern operator value{' '}
        <span className="mx-2">•</span>
        <span className="font-medium">Examples:</span> www.example.com reqHeaders://custom{' '}
        <span className="mx-2">•</span>
        *.google.com protocol://https{' '}
        <span className="mx-2">•</span>
        Press Cmd+S to save
      </div>
    </div>
  );
}
