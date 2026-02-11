import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import Sidebar from './shared/ui/Sidebar';
import ContentHeader from './shared/ui/ContentHeader';
import Network from './features/network';
import Rules from './features/rules';
import Values from './features/values';
import Settings from './features/settings';
import {
  getSidebarDragMetrics,
  getSidebarCollapseTransition,
} from './shared/utils/sidebarResizeState';
import type { ViewType } from './types/ui';

// View components mapping
type ViewComponent = React.ComponentType;

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
const SIDEBAR_COLLAPSE_HOLD_MS = 0;

function App(): React.JSX.Element {
  const [activeView, setActiveView] = useState<ViewType>('network');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: SIDEBAR_DEFAULT_WIDTH });
  const collapseHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ActiveComponent = VIEWS[activeView] || VIEWS.network;

  const handleSidebarResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const initialWidth = isSidebarCollapsed ? SIDEBAR_MIN_WIDTH : sidebarWidth;

    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setSidebarWidth(SIDEBAR_MIN_WIDTH);
    }

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

    const clearCollapseTimer = () => {
      if (collapseHoldTimeoutRef.current) {
        clearTimeout(collapseHoldTimeoutRef.current);
        collapseHoldTimeoutRef.current = null;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const { rawNextWidth, clampedNextWidth } = getSidebarDragMetrics({
        startX: resizeStartRef.current.x,
        startWidth: resizeStartRef.current.width,
        currentX: event.clientX,
        minWidth: SIDEBAR_MIN_WIDTH,
        maxWidth: SIDEBAR_MAX_WIDTH,
      });
      const { shouldCollapse, shouldExpand } = getSidebarCollapseTransition({
        rawNextWidth,
        minWidth: SIDEBAR_MIN_WIDTH,
        isCollapsed: isSidebarCollapsed,
      });

      if (shouldCollapse && !collapseHoldTimeoutRef.current) {
        collapseHoldTimeoutRef.current = setTimeout(() => {
          setIsSidebarCollapsed(true);
          collapseHoldTimeoutRef.current = null;
        }, SIDEBAR_COLLAPSE_HOLD_MS);
      }

      if (rawNextWidth >= SIDEBAR_MIN_WIDTH) {
        clearCollapseTimer();
      }

      if (shouldExpand) {
        setIsSidebarCollapsed(false);
      }

      setSidebarWidth(clampedNextWidth);
    };

    const stopResizing = () => {
      clearCollapseTimer();
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      clearCollapseTimer();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizingSidebar, isSidebarCollapsed]);

  return (
    <div className="h-screen w-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        width={isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth}
        onResizeStart={handleSidebarResizeStart}
      />

      <div className="min-w-0 min-h-0 flex-1 flex flex-col">
        <ContentHeader activeView={activeView} />
        <main className="min-h-0 flex-1 overflow-hidden w-full">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}

export default App;
