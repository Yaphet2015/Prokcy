import type { ViewType } from '../../types/ui';

// View name mapping
const viewNames: Record<ViewType, string> = {
  network: 'Network',
  rules: 'Rules',
  values: 'Values',
  settings: 'Settings',
};

// Props
interface ContentHeaderProps {
  activeView: ViewType;
}

// Electron window API for maximize toggle
interface ElectronWindowMaximize {
  electron?: {
    toggleMaximizeWindow?: () => void;
  };
}

export default function ContentHeader({ activeView }: ContentHeaderProps): React.JSX.Element {
  return (
    <header
      className="
        app-drag h-12 shrink-0 flex items-center
        px-4 border-b border-zinc-200/70 dark:border-zinc-800/70
        bg-white/85 dark:bg-zinc-950/80 backdrop-blur-xl
      "
      onDoubleClick={() => (window as unknown as ElectronWindowMaximize).electron?.toggleMaximizeWindow?.()}
    >
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Prokcy
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {viewNames[activeView] || 'Overview'}
        </span>
      </div>
    </header>
  );
}
