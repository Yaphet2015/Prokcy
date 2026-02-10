import { Button } from '@pikoloo/darwin-ui';
import { Save, Power } from 'lucide-react';

export function RulesToolbar({
  isEnabled,
  isDirty,
  isSaving,
  error,
  onToggleEnabled,
  onSave,
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
      <div className="flex flex-col">
        <div className="flex gap-2 items-center line">
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Rules</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleEnabled}
          leftIcon={<Power color={isEnabled ? 'green' : 'red'} className="w-4 h-4" />}
          title={isEnabled ? 'Disable all rules' : 'Enable all rules'}
        >
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          leftIcon={<Save className="w-4 h-4" />}
          title="Save rules (Cmd+S)"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

RulesToolbar.displayName = 'RulesToolbar';
