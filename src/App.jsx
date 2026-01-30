import { useState } from 'react';
import Sidebar from './shared/ui/Sidebar';
import Network from './features/network/Network';
import Rules from './features/rules/Rules';
import Values from './features/values/Values';

const views = {
  network: Network,
  rules: Rules,
  values: Values,
};

function App() {
  const [activeView, setActiveView] = useState('network');
  const ActiveComponent = views[activeView];

  return (
    <div className="h-screen w-screen bg-tahoe-bg text-tahoe-fg flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 overflow-hidden">
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;
