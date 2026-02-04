import { useState } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import {
  ChevronLeft, ChevronRight, Activity, FileText, Key, Settings,
} from 'lucide-react';
import ServiceToggle from './ServiceToggle';

const navigationItems = [
  { id: 'network', label: 'Network', icon: Activity },
  { id: 'rules', label: 'Rules', icon: FileText },
  { id: 'values', label: 'Values', icon: Key },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeView, onViewChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`
        h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
        transition-all duration-200 justify-between
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      {/* <div className="h-12 flex items-center px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        {!isCollapsed && (
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Prokcy
          </span>
        )}
      </div> */}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
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
      <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        {isCollapsed ? (
          <div className="flex flex-col gap-3 items-center">
            <ServiceToggle />
            <Button.Icon
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Button.Icon>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button.Icon
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label="Collapse sidebar"
              className="rounded-lg py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button.Icon>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center justify-between flex-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Service
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Whistle Proxy
                </span>
              </div>
              <ServiceToggle />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
