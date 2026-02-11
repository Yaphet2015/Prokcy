import { Button } from '@pikoloo/darwin-ui';
import {
  ChevronLeft, ChevronRight, Activity, FileText, Key, Settings, LucideIcon,
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
  onResizeStart: (event: React.MouseEvent) => void;
}

// Electron window API for window controls
interface ElectronWindowControls {
  electron?: {
    closeWindow?: () => void;
    minimizeWindow?: () => void;
    toggleMaximizeWindow?: () => void;
  };
}

export default function Sidebar({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  width,
  onResizeStart,
}: SidebarProps): React.JSX.Element {
  return (
    <aside
      className={`
        relative h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
        transition-[width] duration-200 justify-between
        overflow-x-hidden
      `}
      style={{ width: `${width}px` }}
    >
      {/* Window controls */}
      <div className="app-drag h-12 flex items-center px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        <div className="app-no-drag flex items-center gap-2">
          <button
            type="button"
            aria-label="Close window"
            onClick={() => (window as unknown as ElectronWindowControls).electron?.closeWindow?.()}
            className="h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-95"
          />
          <button
            type="button"
            aria-label="Minimize window"
            onClick={() => (window as unknown as ElectronWindowControls).electron?.minimizeWindow?.()}
            className="h-3 w-3 rounded-full bg-[#ffbd2e] hover:brightness-95"
          />
          <button
            type="button"
            aria-label="Toggle maximize window"
            onClick={() => (window as unknown as ElectronWindowControls).electron?.toggleMaximizeWindow?.()}
            className="h-3 w-3 rounded-full bg-[#28c840] hover:brightness-95"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1 overflow-x-hidden overflow-y-auto">
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

      <button
        type="button"
        aria-label="Resize sidebar"
        onMouseDown={onResizeStart}
        className="
          absolute top-0 -right-1 h-full w-2 cursor-col-resize
          bg-transparent border-none p-0
          hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50
          focus:outline-none
        "
      />
    </aside>
  );
}
