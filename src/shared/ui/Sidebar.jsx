import { useState } from 'react';

const navigationItems = [
  { id: 'network', label: 'Network', icon: '🌊' },
  { id: 'rules', label: 'Rules', icon: '📝' },
  { id: 'values', label: 'Values', icon: '🔑' },
];

export default function Sidebar({ activeView, onViewChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`
        glass-tahoe border-r border-tahoe-border
        flex flex-col transition-all duration-200
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-tahoe-border/50">
        {!isCollapsed && (
          <span className="font-semibold text-tahoe-fg">Prokcy</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-tahoe-hover transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl
              transition-all duration-150
              ${activeView === item.id
                ? 'bg-tahoe-accent text-white'
                : 'text-tahoe-fg hover:bg-tahoe-hover'
              }
            `}
          >
            <span className="text-lg">{item.icon}</span>
            {!isCollapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
