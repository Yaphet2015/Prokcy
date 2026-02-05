import { useEffect, useState } from 'react';
import Sidebar from './shared/ui/Sidebar';
import Network from './features/network';
import Rules from './features/rules';
import Values from './features/values';
import Settings from './features/settings/Settings';

const views = {
  network: Network,
  rules: Rules,
  values: Values,
  settings: Settings,
};

const viewAliases = {
  network: 'network',
  rules: 'rules',
  values: 'values',
  settings: 'settings',
  Network: 'network',
  Rules: 'rules',
  Values: 'values',
  Settings: 'settings',
};

function App() {
  const [activeView, setActiveView] = useState('network');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const ActiveComponent = views[activeView] || views.network;

  useEffect(() => {
    const handleShortcut = (event) => {
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

    const showWhistleWebUI = (name) => {
      const nextView = viewAliases[name];
      if (!nextView || !views[nextView]) {
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

  return (
    <div className="h-screen w-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      <main className="flex-1 overflow-hidden w-full">
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;
