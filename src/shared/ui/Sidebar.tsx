import { Button } from '@pikoloo/darwin-ui';
import {
  ChevronLeft, ChevronRight, Activity, FileText, Key, Settings, LucideIcon, Minus, Maximize2, X,
} from 'lucide-react';
import ServiceToggle from './ServiceToggle';
import type { ViewType } from '../../types/ui';

// Navigation items configuration
interface NavigationItem {
  id: ViewType;
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { id: 'network', label: 'Network', icon: Activity },
  { id: 'rules', label: 'Rules', icon: FileText },
  { id: 'values', label: 'Values', icon: Key },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Props
interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  isResizing: boolean;
  onResizeStart: (event: React.PointerEvent) => void;
  widthTransitionClass: string;
}

export default function Sidebar({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  width,
  isResizing,
  onResizeStart,
  widthTransitionClass,
}: SidebarProps): React.JSX.Element {
  return (
    <aside
      className={`
        relative h-full flex flex-col
        ${!isCollapsed ? 'border-r border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl' : 'bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-md'}
        ${isResizing ? 'transition-none' : 'transition-[width] duration-200'}
        justify-between
        overflow-x-visible z-9999
      `}
      style={{ width: `${width}px` }}
    >
      {/* Window controls */}
      <div className={`app-drag h-12 flex items-center px-4 shrink-0 transition-[bakckground-color] duration-200 ${
        isCollapsed ? 'bg-white/85 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/70 dark:border-zinc-800/70' : 'bg-white dark:bg-zinc-900'
      }`}
      >
        <div className="app-no-drag flex items-center gap-2 ">
          <button
            type="button"
            aria-label="Close window"
            onClick={() => window.electron?.closeWindow?.()}
            className="group relative h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-95"
          >
            <X className="absolute inset-0 m-auto h-2 w-2 text-black/65 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
          <button
            type="button"
            aria-label="Minimize window"
            onClick={() => window.electron?.minimizeWindow?.()}
            className="group relative h-3 w-3 rounded-full bg-[#ffbd2e] hover:brightness-95"
          >
            <Minus className="absolute inset-0 m-auto h-2 w-2 text-black/65 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
          <button
            type="button"
            aria-label="Toggle maximize window"
            onClick={() => window.electron?.toggleMaximizeWindow?.()}
            className="group relative h-3 w-3 rounded-full bg-[#28c840] hover:brightness-95"
          >
            <Maximize2 className="absolute inset-0 m-auto h-2 w-2 text-black/65 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 px-2 space-y-1 overflow-x-hidden overflow-y-auto transition-[translate] duration-200
          ${isCollapsed ? 'translate-y-3' : 'translate-y-0'}
        `}
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? 'primary' : 'ghost'}
              className={`
                w-full justify-start
                ${isCollapsed ? 'px-3' : 'px-3'}
                ${isActive ? '' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}
              `}
              onClick={() => onViewChange(item.id)}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <span className="ml-3 text-sm font-medium">{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer - Service Toggle & Collapse */}
      <div className="p-2 border-t border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        {isCollapsed ? (
          <div className="flex flex-col gap-3 items-center">
            <Button.Icon
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Button.Icon>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button.Icon
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="rounded-lg py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button.Icon>

            <div className="h-4 ml-[-6px] w-px bg-zinc-200 dark:bg-zinc-700" />

            <div className="flex items-center justify-between flex-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 text-nowrap">
                  Proxy Service
                </span>
              </div>
              <ServiceToggle />
            </div>
          </div>
        )}
      </div>

      {/* Resize handler for sidebar */}
      <button
        type="button"
        aria-label="Resize sidebar"
        onPointerDown={onResizeStart}
        className={`
          absolute top-0 -right-1 h-full w-2 cursor-col-resize p-0 overflow-hidden
          flex items-center justify-center
        `}
      >
        <div className={`h-full border-none transition-[translate] ${widthTransitionClass}
          hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:outline-none dark:bg-zinc-800 bg-zinc-200 w-px ${
          isCollapsed ? 'translate-y-12' : 'translate-y-0'
        }`}
        />
      </button>
    </aside>
  );
}
