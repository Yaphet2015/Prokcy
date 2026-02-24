import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { Minus, Maximize2, X } from 'lucide-react';
import Sidebar from './shared/ui/Sidebar';
// import ContentHeader from './shared/ui/ContentHeader';
import Network from './features/network';
import Rules from './features/rules';
import Values from './features/values';
import Settings from './features/settings';
import {
  getSidebarResizeState,
  getSidebarWidthTransitionClass,
} from './shared/utils/sidebarResizeState';
import type { ViewType } from './types/ui';

// View components mapping
interface ViewProps {
  isSidebarCollapsed: boolean;
}

type ViewComponent = React.ComponentType<ViewProps>;

const VIEWS: Record<ViewType, ViewComponent> = {
  network: Network,
  rules: Rules,
  values: Values,
  settings: Settings,
};

// View aliases for window.showWhistleWebUI compatibility
const VIEW_ALIASES: Record<string, ViewType> = {
  network: 'network',
  rules: 'rules',
  values: 'values',
  settings: 'settings',
  Network: 'network',
  Rules: 'rules',
  Values: 'values',
  Settings: 'settings',
};

// Sidebar constants
const SIDEBAR_COLLAPSED_WIDTH = 56;
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 300;
const SIDEBAR_COLLAPSE_THRESHOLD = 70;
const SIDEBAR_EXPAND_THRESHOLD = 166;

function App(): React.JSX.Element {
  const [activeView, setActiveView] = useState<ViewType>('network');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: SIDEBAR_DEFAULT_WIDTH });
  const resizingPointerIdRef = useRef<number | null>(null);
  const isSidebarCollapsedRef = useRef(isSidebarCollapsed);
  const previousIsSidebarCollapsedRef = useRef(isSidebarCollapsed);
  const ActiveComponent = VIEWS[activeView] || VIEWS.network;
  const sidebarWidthTransitionClass = getSidebarWidthTransitionClass({
    previousIsCollapsed: previousIsSidebarCollapsedRef.current,
    isCollapsed: isSidebarCollapsed,
  });

  useEffect(() => {
    isSidebarCollapsedRef.current = isSidebarCollapsed;
    previousIsSidebarCollapsedRef.current = isSidebarCollapsed;
  }, [isSidebarCollapsed]);

  const handleSidebarResizeStart = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    const initialWidth = isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

    resizingPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    resizeStartRef.current = {
      x: event.clientX,
      width: initialWidth,
    };
    setIsResizingSidebar(true);
  }, [isSidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      // Cmd+, to open settings
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        setActiveView('settings');
      }
      // Cmd+B to toggle sidebar
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };

    const showWhistleWebUI = (name: string): boolean => {
      const nextView = VIEW_ALIASES[name];
      if (!nextView || !VIEWS[nextView]) {
        return false;
      }
      setActiveView(nextView);
      return true;
    };

    window.showWhistleWebUI = showWhistleWebUI;
    window.addEventListener('keydown', handleShortcut);

    return () => {
      window.removeEventListener('keydown', handleShortcut);
      if (window.showWhistleWebUI === showWhistleWebUI) {
        delete window.showWhistleWebUI;
      }
    };
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (
        resizingPointerIdRef.current !== null
        && event.pointerId !== resizingPointerIdRef.current
      ) {
        return;
      }

      const nextState = getSidebarResizeState({
        startX: resizeStartRef.current.x,
        startWidth: resizeStartRef.current.width,
        currentX: event.clientX,
        minWidth: SIDEBAR_MIN_WIDTH,
        maxWidth: SIDEBAR_MAX_WIDTH,
        collapseThreshold: SIDEBAR_COLLAPSE_THRESHOLD,
        expandThreshold: SIDEBAR_EXPAND_THRESHOLD,
        collapsedWidth: SIDEBAR_COLLAPSED_WIDTH,
        isCollapsed: isSidebarCollapsedRef.current,
      });

      if (nextState.isCollapsed !== isSidebarCollapsedRef.current) {
        setIsSidebarCollapsed(nextState.isCollapsed);
        isSidebarCollapsedRef.current = nextState.isCollapsed;
      }

      if (!nextState.isCollapsed) {
        setSidebarWidth(nextState.width);
      }
    };

    const stopResizing = () => {
      resizingPointerIdRef.current = null;
      setIsResizingSidebar(false);
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing, true);
    window.addEventListener('pointercancel', stopResizing, true);
    window.addEventListener('blur', stopResizing);

    return () => {
      resizingPointerIdRef.current = null;
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing, true);
      window.removeEventListener('pointercancel', stopResizing, true);
      window.removeEventListener('blur', stopResizing);
    };
  }, [isResizingSidebar]);

  const sidebarWidthValue = isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;

  return (
    <div className="h-screen w-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex">

      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        width={sidebarWidthValue}
        isResizing={isResizingSidebar}
        onResizeStart={handleSidebarResizeStart}
        widthTransitionClass={sidebarWidthTransitionClass}
      />

      <div className="min-w-0 min-h-0 flex-1 flex flex-col">
        {/* <ContentHeader activeView={activeView} /> */}
        <main className="min-h-0 flex-1 overflow-hidden w-full">
          <ActiveComponent isSidebarCollapsed={isSidebarCollapsed} />
        </main>
      </div>

      {/* Window controls - fixed at top-left, below the sidebar */}
      <div className={`fixed top-4 left-4 z-9999 flex justify-start items-center gap-2 app-drag`}>
        <button
          type="button"
          aria-label="Close window"
          onClick={() => window.electron?.closeWindow?.()}
          className="app-no-drag group relative h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-95"
        >
          <X className="absolute inset-0 m-auto h-2 w-2 text-black/65 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
        <button
          type="button"
          aria-label="Minimize window"
          onClick={() => window.electron?.minimizeWindow?.()}
          className="app-no-drag group relative h-3 w-3 rounded-full bg-[#ffbd2e] hover:brightness-95"
        >
          <Minus className="absolute inset-0 m-auto h-2 w-2 text-black/65 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
        <button
          type="button"
          aria-label="Toggle maximize window"
          onClick={() => window.electron?.toggleMaximizeWindow?.()}
          className="app-no-drag group relative h-3 w-3 rounded-full bg-[#28c840] hover:brightness-95"
        >
          <Maximize2 className="absolute inset-0 m-auto h-2 w-2 text-black/65 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
      </div>
    </div>
  );
}

export default App;
