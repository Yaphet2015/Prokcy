import { useEffect, useState } from 'react';
import Sidebar from './shared/ui/Sidebar';
import Network from './features/network/Network';
import Rules from './features/rules/Rules';
import Values from './features/values/Values';
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
  const ActiveComponent = views[activeView] || views.network;

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        setActiveView('settings');
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
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 overflow-hidden">
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;
