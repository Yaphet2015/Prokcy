import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { RotateCcw, Save, Power } from 'lucide-react';
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
    setActiveEditorGroup,
    setRuleGroupSelection,
    ruleGroups,
    activeGroupNames,
    activeEditorGroupName,
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

  const activePriority = useMemo(
    () => ruleGroups.filter((group) => group.selected).map((group) => group.name),
    [ruleGroups],
  );
  const activePriorityIndex = useMemo(
    () => Object.fromEntries(activePriority.map((name, idx) => [name, idx + 1])),
    [activePriority],
  );

  const handleGroupDoubleClick = useCallback((group) => {
    if (!group?.name) {
      return;
    }
    setRuleGroupSelection(group.name);
  }, [setRuleGroupSelection]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        <div className="flex flex-col">
          <div className="flex gap-2 items-center line">
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Rules</h1>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              (
              {isEnabled ? 'Enabled' : 'Disabled'}
              )
            </span>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Active order:
            {activePriority.length ? activePriority.join(' → ') : 'None'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          {isSaving && (
            <span className="text-xs text-blue-500">Saving...</span>
          )}
          {!isSaving && isDirty && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Unsaved changes</span>
          )}
          {!isSaving && !isDirty && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Saved</span>
          )}

          {/* Error message */}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}

          {/* Action buttons */}
          <Button
            variant="secondary"
            size="sm"
            onClick={revertRules}
            disabled={!isDirty || isSaving}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            title="Revert changes (Esc)"
          >
            Revert
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={saveRules}
            disabled={!isDirty || isSaving}
            leftIcon={<Save className="w-4 h-4" />}
            title="Save rules (Cmd+S)"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <Button
            variant={isEnabled ? 'destructive' : 'secondary'}
            size="sm"
            onClick={toggleEnabled}
            leftIcon={<Power className="w-4 h-4" />}
            title={isEnabled ? 'Disable all rules' : 'Enable all rules'}
          >
            {isEnabled ? 'Disable All' : 'Enable All'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex">
        <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-md flex flex-col">
          {/* <div className="px-3 py-2 border-b border-zinc-200/70 dark:border-zinc-800/70">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Rule Groups
              </h2>
            </div>
          </div> */}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {ruleGroups.map((group) => {
              const isActive = activeGroupNames.includes(group.name);
              const isEditorGroup = group.name === activeEditorGroupName;
              const rank = activePriorityIndex[group.name];
              return (
                <button
                  key={group.name}
                  onClick={() => setActiveEditorGroup(group.name)}
                  onDoubleClick={() => handleGroupDoubleClick(group)}
                  className={`w-full px-3 py-2 rounded-lg border transition-all text-left ${
                    isEditorGroup
                      ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                      : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                  }`}
                  title="Click to open in editor. Double-click to toggle active state."
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium truncate text-zinc-900 dark:text-zinc-100 ${!rank ? 'opacity-50' : ''}`}>{group.name}</span>
                    {rank ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                        #
                        {rank}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                        Off
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-600/85 text-white">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading rules...</span>
              </div>
            </div>
          ) : (
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
      </div>
    </div>
  );
}
