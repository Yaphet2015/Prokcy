import { useState } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import {
  ChevronLeft, ChevronRight, Activity, FileText, Key,
} from 'lucide-react';
import ServiceToggle from './ServiceToggle';

const navigationItems = [
  { id: 'network', label: 'Network', icon: Activity },
  { id: 'rules', label: 'Rules', icon: FileText },
  { id: 'values', label: 'Values', icon: Key },
];

export default function Sidebar({ activeView, onViewChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`
        h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
        transition-all duration-200
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        {!isCollapsed && (
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Prokcy
          </span>
        )}
        <Button.Icon
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button.Icon>
      </div>

      {/* Service Control Section */}
      <div className="p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
        <div className={`
          flex items-center gap-3
          transition-all duration-200
          ${isCollapsed ? 'justify-center' : 'justify-between'}
        `}
        >
          {!isCollapsed && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Service
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Whistle Proxy
              </span>
            </div>
          )}
          <ServiceToggle />
        </div>
      </div>

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
    </aside>
  );
}
