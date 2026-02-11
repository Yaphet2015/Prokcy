import type { ReactNode } from 'react';

// View name mapping
const viewNames: Record<string, string> = {
  network: 'Network Requests',
  rules: 'Rules',
  values: 'Values',
  settings: 'Settings',
};

// Props
export interface ContentHeaderProps {
  /** The active view name (network, rules, values, settings) */
  viewName?: string;
  /** Custom title to override the default view name */
  title?: string;
  /** Icon to display before the title */
  icon?: ReactNode;
  /** Actions to display on the left side (between title and center) */
  leftActions?: ReactNode;
  /** Actions to display on the right side */
  rightActions?: ReactNode;
  /** Search/filter input component */
  searchInput?: ReactNode;
  /** Status message (error, success, saving, etc.) */
  statusMessage?: ReactNode;
  /** Extra left padding when sidebar is collapsed */
  isSidebarCollapsed?: boolean;
}

/**
 * Unified header component for all feature views.
 * Provides consistent layout and styling across Network, Rules, Values, and Settings pages.
 */
export default function ContentHeader({
  viewName = '',
  title,
  icon,
  leftActions,
  rightActions,
  searchInput,
  statusMessage,
  isSidebarCollapsed = false,
}: ContentHeaderProps): React.JSX.Element {
  const displayTitle = title || viewNames[viewName] || viewName || 'Overview';

  return (
    <div className={`
      h-12 shrink-0 flex items-center justify-between
      px-4 border-b border-zinc-200/70 dark:border-zinc-800/70
      bg-white/85 dark:bg-zinc-950/80 backdrop-blur-xl
      ${isSidebarCollapsed ? 'pl-8' : ''}
      transition-[pl] duration-200
    `}
    >
      {/* Left section: Icon + Title */}
      <div className="min-w-0 flex items-center gap-3">
        {icon && <span className="text-zinc-500 dark:text-zinc-400">{icon}</span>}
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 pointer-none select-none">
          {displayTitle}
        </span>
        {leftActions}
      </div>

      {/* Center section: Status messages */}
      {statusMessage && (
        <div className="flex items-center gap-2">
          {statusMessage}
        </div>
      )}

      {/* Right section: Actions + Search */}
      <div className="flex items-center gap-2">
        {rightActions}
        {searchInput}
      </div>
    </div>
  );
}
