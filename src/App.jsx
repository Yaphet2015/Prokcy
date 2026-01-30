import { useState } from 'react';
import Sidebar from './shared/ui/Sidebar';

function App() {
  const [activeView, setActiveView] = useState('network');

  return (
    <div className="h-screen w-screen bg-tahoe-bg text-tahoe-fg flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 overflow-hidden">
        <div className="h-full p-8">
          <h1 className="text-2xl font-semibold mb-4 capitalize">{activeView}</h1>
          <p className="text-tahoe-subtle">
            {activeView === 'network' && 'Network capture view coming soon'}
            {activeView === 'rules' && 'Rules editor coming soon'}
            {activeView === 'values' && 'Values management coming soon'}
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
