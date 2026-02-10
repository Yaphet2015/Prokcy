import { useEffect, useMemo, useState } from 'react';
import {
  Maximize2, Minimize, Minimize2, X,
} from 'lucide-react';

const viewNames = {
  network: 'Network',
  rules: 'Rules',
  values: 'Values',
  settings: 'Settings',
};

export default function WindowTitlebar({ activeView }) {
  const [isMaximized, setIsMaximized] = useState(false);

  const title = useMemo(() => viewNames[activeView] || 'Prokcy', [activeView]);

  useEffect(() => {
    let unbind;
    let mounted = true;

    const sync = async () => {
      try {
        const value = await window.electron?.isWindowMaximized?.();
        if (mounted) {
          setIsMaximized(!!value);
        }
      } catch (err) {}
    };

    sync();
    unbind = window.electron?.onWindowMaximizeChanged?.((value) => {
      setIsMaximized(!!value);
    });

    return () => {
      mounted = false;
      if (typeof unbind === 'function') {
        unbind();
      }
    };
  }, []);

  return (
    <header
      className="
        app-drag h-12 shrink-0 flex items-center justify-between
        px-3 border-b border-zinc-200/70 dark:border-zinc-800/70
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
      "
      onDoubleClick={() => window.electron?.toggleMaximizeWindow?.()}
    >
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Prokcy
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {title}
        </span>
      </div>

      <div className="app-no-drag flex items-center gap-1">
        <button
          type="button"
          aria-label="Minimize window"
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
          onClick={() => window.electron?.minimizeWindow?.()}
        >
          <Minimize className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
          onClick={() => window.electron?.toggleMaximizeWindow?.()}
        >
          {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label="Close window"
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-red-500 hover:text-white"
          onClick={() => window.electron?.closeWindow?.()}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
