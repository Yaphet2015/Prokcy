# Prokcy Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the React + Vite + TailwindCSS frontend foundation with Tahoe theme and basic app shell.

**Architecture:** Create a new React frontend alongside existing Electron app. The main process will load the React app (dev server or built files). State management uses React Context. Styling uses TailwindCSS with custom Tahoe theme configuration.

**Tech Stack:** Vite 5.x, React 18.x, TailwindCSS 3.x, Electron 39.x

---

## Task 1: Initialize Vite + React Project

**Files:**
- Create: `src/main.jsx`, `src/App.jsx`, `index.html`
- Create: `vite.config.js`
- Modify: `package.json`

**Step 1: Install Vite and React dependencies**

Run:
```bash
npm install --save-dev vite@5 @vitejs/plugin-react@4
npm install react@18 react-dom@18
```

Expected: Packages added to `package.json` and `node_modules/`

**Step 2: Create Vite config file**

Create `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
  },
});
```

**Step 3: Create HTML entry point**

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Prokcy</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Step 4: Create React entry point**

Create `src/main.jsx`:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 5: Create root App component**

Create `src/App.jsx`:
```javascript
function App() {
  return (
    <div className="h-screen w-screen bg-gray-900 text-white">
      <h1 className="p-8 text-2xl">Prokcy</h1>
    </div>
  );
}

export default App;
```

**Step 6: Add dev script to package.json**

Add to `package.json` scripts section:
```json
"dev:vite": "vite",
"build:react": "vite build"
```

**Step 7: Verify Vite dev server works**

Run:
```bash
npm run dev:vite
```

Expected: Server starts at http://localhost:5173, shows "Prokcy" heading

**Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/
git commit -m "feat: initialize Vite + React project

- Install Vite 5 and React 18
- Create vite.config.js with path aliases
- Add HTML entry point and React root
- Create basic App component"
```

---

## Task 2: Set Up TailwindCSS with Tahoe Theme

**Files:**
- Create: `src/index.css`, `tailwind.config.js`, `postcss.config.js`
- Modify: `src/main.jsx`

**Step 1: Install TailwindCSS dependencies**

Run:
```bash
npm install --save-dev tailwindcss@3 autoprefixer@10 postcss@8
npx tailwindcss init -p
```

Expected: Creates `tailwind.config.js` and `postcss.config.js`

**Step 2: Configure Tailwind with Tahoe theme**

Replace `tailwind.config.js` content:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tahoe: {
          bg: 'var(--color-tahoe-bg)',
          fg: 'var(--color-tahoe-fg)',
          accent: 'var(--color-tahoe-accent)',
          border: 'var(--color-tahoe-border)',
          surface: 'var(--color-tahoe-surface)',
          hover: 'var(--color-tahoe-hover)',
          subtle: 'var(--color-tahoe-subtle)',
        }
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'tahoe': '12px',
        'pill': '9999px',
      },
      backdropBlur: {
        'tahoe': '20px',
      },
      boxShadow: {
        'tahoe-sm': '0 1px 3px rgba(0,0,0,0.05)',
        'tahoe-md': '0 4px 12px rgba(0,0,0,0.08)',
        'tahoe-lg': '0 8px 24px rgba(0,0,0,0.12)',
        'tahoe-glow': '0 0 20px rgba(10,132,255,0.3)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

**Step 3: Create PostCSS config**

Ensure `postcss.config.js` contains:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 4: Create CSS with Tahoe variables**

Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Light mode (default) */
  --color-tahoe-bg: #ffffff;
  --color-tahoe-fg: #1d1d1f;
  --color-tahoe-accent: #007aff;
  --color-tahoe-border: rgba(0,0,0,0.08);
  --color-tahoe-surface: rgba(255,255,255,0.8);
  --color-tahoe-hover: rgba(0,0,0,0.03);
  --color-tahoe-subtle: #86868b;
}

.dark {
  /* Dark mode */
  --color-tahoe-bg: #1e1e1e;
  --color-tahoe-fg: #ffffff;
  --color-tahoe-accent: #0a84ff;
  --color-tahoe-border: rgba(255,255,255,0.1);
  --color-tahoe-surface: rgba(30,30,30,0.8);
  --color-tahoe-hover: rgba(255,255,255,0.05);
  --color-tahoe-subtle: #86868b;
}

body {
  @apply bg-tahoe-bg text-tahoe-fg;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  @apply bg-tahoe-border rounded-tahoe;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-tahoe-subtle;
}

/* Glass effect utility */
.glass-tahoe {
  @apply bg-white/10 backdrop-blur-tahoe border border-white/20;
}

.dark .glass-tahoe {
  @apply bg-black/40 border border-white/10;
}
```

**Step 5: Import CSS in main.jsx**

Modify `src/main.jsx` - add CSS import at top:
```javascript
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// ... rest of file
```

**Step 6: Verify TailwindCSS works**

Update `src/App.jsx` to test Tailwind:
```javascript
function App() {
  return (
    <div className="h-screen w-screen bg-tahoe-bg text-tahoe-fg">
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Prokcy</h1>
        <button className="h-9 px-5 rounded-lg bg-tahoe-accent text-white font-medium text-sm hover:opacity-90 transition-opacity">
          Test Button
        </button>
      </div>
    </div>
  );
}

export default App;
```

Run:
```bash
npm run dev:vite
```

Expected: Styled page with Tahoe colors, button shows hover effect

**Step 7: Commit**

```bash
git add src/index.css tailwind.config.js postcss.config.js src/main.jsx src/App.jsx package.json package-lock.json
git commit -m "feat: add TailwindCSS with Tahoe theme

- Install TailwindCSS 3 with Autoprefixer
- Configure Tahoe color system (light/dark)
- Add custom border radius, shadows, blur values
- Create glass-tahoe utility class
- Add custom scrollbar styling"
```

---

## Task 3: Create Directory Structure

**Files:**
- Create: `src/features/`, `src/shared/`, `src/styles/` directories with placeholder files

**Step 1: Create features directory structure**

Run:
```bash
mkdir -p src/features/network
mkdir -p src/features/rules
mkdir -p src/features/values
```

**Step 2: Create shared directory structure**

Run:
```bash
mkdir -p src/shared/api
mkdir -p src/shared/context
mkdir -p src/shared/ui
```

**Step 3: Create styles directory**

Run:
```bash
mkdir -p src/styles
```

**Step 4: Create placeholder index files**

Create `src/features/network/index.js`:
```javascript
// Network feature: Waterfall timeline + Request inspector
export { default as Network } from './Network';
```

Create `src/features/rules/index.js`:
```javascript
// Rules feature: Monaco editor for Whistle rules
export { default as Rules } from './Rules';
```

Create `src/features/values/index.js`:
```javascript
// Values feature: Key-value store management
export { default as Values } from './Values';
```

Create `src/shared/api/index.js`:
```javascript
// API client for Whistle backend
export { default as whistleApi } from './whistle';
```

Create `src/shared/context/index.js`:
```javascript
// React Context providers
export { NetworkProvider, useNetwork } from './NetworkContext';
export { RulesProvider, useRules } from './RulesContext';
export { ValuesProvider, useValues } from './ValuesContext';
```

Create `src/shared/ui/index.js`:
```javascript
// Reusable UI components
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Sidebar } from './Sidebar';
```

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: create frontend directory structure

- Create features/ directory for network, rules, values
- Create shared/ directory for api, context, ui
- Add placeholder index files for each module"
```

---

## Task 4: Create Basic UI Components

**Files:**
- Create: `src/shared/ui/Button.jsx`, `src/shared/ui/Input.jsx`

**Step 1: Create Button component**

Create `src/shared/ui/Button.jsx`:
```javascript
import { forwardRef } from 'react';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'font-medium transition-all inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-tahoe-accent text-white hover:opacity-90',
    secondary: 'bg-tahoe-border text-tahoe-fg hover:bg-tahoe-hover',
    ghost: 'text-tahoe-fg hover:bg-tahoe-hover',
  };

  const sizes = {
    sm: 'h-7 px-3 text-xs rounded-md',
    md: 'h-9 px-5 text-sm rounded-lg',
    lg: 'h-11 px-6 text-base rounded-lg',
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
```

**Step 2: Create Input component**

Create `src/shared/ui/Input.jsx`:
```javascript
import { forwardRef } from 'react';

const Input = forwardRef(({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        h-9 px-3 rounded-lg
        bg-tahoe-bg/50 border border-tahoe-border
        text-tahoe-fg placeholder:text-tahoe-subtle
        focus:border-tahoe-accent focus:ring-2 focus:ring-tahoe-accent/20
        outline-none transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
```

**Step 3: Test components in App**

Update `src/App.jsx`:
```javascript
import Button from './shared/ui/Button';
import Input from './shared/ui/Input';

function App() {
  return (
    <div className="h-screen w-screen bg-tahoe-bg text-tahoe-fg p-8">
      <h1 className="text-2xl font-semibold mb-6">Prokcy</h1>
      <div className="flex gap-4 items-center">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Input placeholder="Test input..." />
      </div>
    </div>
  );
}

export default App;
```

Run:
```bash
npm run dev:vite
```

Expected: Three buttons and input render with Tahoe styling

**Step 4: Commit**

```bash
git add src/shared/ui/
git commit -m "feat: add Button and Input components

- Create Button with primary/secondary/ghost variants
- Create Input with Tahoe styling and focus states
- Both support size variants and disabled state"
```

---

## Task 5: Create Sidebar Component

**Files:**
- Create: `src/shared/ui/Sidebar.jsx`, `src/shared/ui/Sidebar.jsx`

**Step 1: Create Sidebar component**

Create `src/shared/ui/Sidebar.jsx`:
```javascript
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
```

**Step 2: Update App to use Sidebar**

Update `src/App.jsx`:
```javascript
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
```

Run:
```bash
npm run dev:vite
```

Expected: Sidebar on left with navigation, clicking items updates main content

**Step 3: Commit**

```bash
git add src/shared/ui/Sidebar.jsx src/App.jsx
git commit -m "feat: add Sidebar component with navigation

- Create collapsible sidebar with glass effect
- Add navigation items for Network, Rules, Values
- Connect sidebar to App state for view switching"
```

---

## Task 6: Set Up Electron Integration

**Files:**
- Modify: `lib/window.js`, `package.json`
- Create: `lib/ipc.js` (new IPC handler for theme)

**Step 1: Update package.json with dev script**

Add to `package.json` devDependencies (install if needed):
```bash
npm install --save-dev concurrently wait-on
```

Add scripts:
```json
"dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
"dev:electron": "wait-on http://localhost:5173 && electron ./lib"
```

**Step 2: Update Electron window to load React**

Modify `lib/window.js` - replace `win.loadURL` section:
```javascript
const createWindow = () => {
  const win = new BrowserWindow({
    title: getTitle(),
    fullscreen: false,
    fullscreenable: true,
    icon: ICON,
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false,
      webviewTag: true,
    },
  });
  // ... existing onBeforeFindInPage handler ...
  ctx.setWin(win);
  win.setMenu(null);
  win.maximize();
  win.on('ready-to-show', () => showWin(win));
  win.on('close', (e) => {
    if (beforeQuit) {
      return;
    }
    beforeQuit = false;
    e.preventDefault();
    win.hide();
  });

  // Load React app
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  win.webContents.once('page-title-updated', () => {
    win.setTitle(getTitle());
  });
};
```

**Step 3: Create IPC handler for theme sync**

Create `lib/ipc.js`:
```javascript
const { ipcMain, nativeTheme } = require('electron');

let mainWindow = null;

function initIpc(win) {
  mainWindow = win;

  // Send current theme on request
  ipcMain.handle('get-theme', () => {
    return {
      isDark: nativeTheme.shouldUseDarkColors,
    };
  });

  // Notify renderer when theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', {
        isDark: nativeTheme.shouldUseDarkColors,
      });
    }
  });
}

module.exports = { initIpc };
```

**Step 4: Initialize IPC in window**

Modify `lib/window.js` - add IPC initialization:
```javascript
const { initIpc } = require('./ipc');

const createWindow = () => {
  // ... existing window setup ...

  // Load React app
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  // Initialize IPC handlers
  initIpc(win);

  // ... rest of existing code ...
};
```

**Step 5: Add theme hook in React**

Create `src/shared/context/ThemeContext.jsx`:
```javascript
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  isDark: false,
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Get initial theme
    if (window.electron?.getTheme) {
      window.electron.getTheme().then(setIsDark);
    }

    // Listen for theme changes (Electron will provide this)
    const handleThemeChange = (event) => {
      setIsDark(event.detail.isDark);
    };

    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

**Step 6: Update App to use ThemeProvider**

Modify `src/main.jsx`:
```javascript
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './shared/context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

**Step 7: Add Electron preload for IPC**

Create `electron-preload.js`:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getTheme: () => ipcRenderer.invoke('get-theme'),
});
```

**Step 8: Update Electron window with preload**

Modify `lib/window.js` - add preload to webPreferences:
```javascript
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
  spellcheck: false,
  webviewTag: true,
  preload: path.join(__dirname, '../electron-preload.js'),
},
```

**Step 9: Verify Electron integration**

Run:
```bash
npm run dev
```

Expected:
1. Vite dev server starts on port 5173
2. Electron window opens with React app
3. Sidebar navigation works
4. Theme matches system preference

**Step 10: Commit**

```bash
git add lib/window.js lib/ipc.js electron-preload.js src/shared/context/ThemeContext.jsx src/main.jsx package.json
git commit -m "feat: integrate React app with Electron

- Update window.js to load React dev server
- Add IPC handlers for theme synchronization
- Create ThemeProvider for React
- Add electron-preload.js for context bridge
- Update package.json with dev script"
```

---

## Task 7: Create Whistle API Client Structure

**Files:**
- Create: `src/shared/api/whistle.js`, `src/shared/api/config.js`

**Step 1: Create API config**

Create `src/shared/api/config.js`:
```javascript
// Default Whistle proxy configuration
export const DEFAULT_CONFIG = {
  host: 'localhost',
  port: 8888,
};

let currentConfig = { ...DEFAULT_CONFIG };

export function setConfig(config) {
  currentConfig = { ...currentConfig, ...config };
}

export function getConfig() {
  return currentConfig;
}

export function getBaseUrl() {
  const { host, port } = currentConfig;
  return `http://${host}:${port}`;
}

// Get auth headers if configured
export function getAuthHeaders() {
  const { username, password } = currentConfig;
  if (username && password) {
    const credentials = btoa(`${username}:${password}`);
  return { Authorization: `Basic ${credentials}` };
  }
  return {};
}
```

**Step 2: Create base API client**

Create `src/shared/api/whistle.js`:
```javascript
import { getBaseUrl, getAuthHeaders } from './config';

// Helper for making API requests
async function request(endpoint, options = {}) {
  const url = `${getBaseUrl()}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Whistle API request failed:', error);
    throw error;
  }
}

// Network API
export async function getNetworkRequests(options = {}) {
  const params = new URLSearchParams(options);
  return request(`/api/requests?${params}`);
}

export async function getRequestDetails(id) {
  return request(`/api/requests/${id}`);
}

// Rules API
export async function getRules() {
  return request('/api/rules');
}

export async function setRules(rules) {
  return request('/api/rules', {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });
}

// Values API
export async function getValues() {
  return request('/api/values');
}

export async function setValue(key, value) {
  return request('/api/values', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

export async function deleteValue(key) {
  return request(`/api/values/${key}`, {
    method: 'DELETE',
  });
}

// Plugin API (for future use)
export async function installPlugin(name, options = {}) {
  return request('/api/plugins/install', {
    method: 'POST',
    body: JSON.stringify({ name, ...options }),
  });
}

// Health check
export async function checkHealth() {
  try {
    await request('/api/health');
    return true;
  } catch {
    return false;
  }
}

export default {
  getNetworkRequests,
  getRequestDetails,
  getRules,
  setRules,
  getValues,
  setValue,
  deleteValue,
  installPlugin,
  checkHealth,
};
```

**Step 3: Export from shared/api**

Update `src/shared/api/index.js`:
```javascript
export { default as whistleApi } from './whistle';
export { setConfig, getConfig } from './config';
```

**Step 4: Create placeholder feature components**

Create `src/features/network/Network.jsx`:
```javascript
export default function Network() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-tahoe-subtle">Network capture coming soon...</p>
    </div>
  );
}
```

Create `src/features/rules/Rules.jsx`:
```javascript
export default function Rules() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-tahoe-subtle">Rules editor coming soon...</p>
    </div>
  );
}
```

Create `src/features/values/Values.jsx`:
```javascript
export default function Values() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-tahoe-subtle">Values management coming soon...</p>
    </div>
  );
}
```

**Step 5: Update App to render feature components**

Update `src/App.jsx`:
```javascript
import { useState } from 'react';
import Sidebar from './shared/ui/Sidebar';
import Network from './features/network';
import Rules from './features/rules';
import Values from './features/values';

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
```

**Step 6: Test in Electron**

Run:
```bash
npm run dev
```

Expected: Electron window opens, sidebar navigation switches between placeholder views

**Step 7: Commit**

```bash
git add src/shared/api/ src/features/ src/App.jsx
git commit -m "feat: create Whistle API client structure

- Add API config with host/port/auth support
- Create request helper with error handling
- Add API methods for network, rules, values
- Create placeholder feature components
- Wire up views to App router"
```

---

## Task 8: Add React Context for State Management

**Files:**
- Create: `src/shared/context/NetworkContext.jsx`
- Create: `src/shared/context/RulesContext.jsx`
- Create: `src/shared/context/ValuesContext.jsx`

**Step 1: Create Network Context**

Create `src/shared/context/NetworkContext.jsx`:
```javascript
import { createContext, useContext, useState, useCallback } from 'react';

const NetworkContext = createContext({
  requests: [],
  selectedRequest: null,
  filters: {},
  searchQuery: '',
  selectRequest: () => {},
  setFilters: () => {},
  setSearchQuery: () => {},
});

export function NetworkProvider({ children }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFiltersState] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const selectRequest = useCallback((request) => {
    setSelectedRequest(request);
  }, []);

  const setFilters = useCallback((newFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        requests,
        selectedRequest,
        filters,
        searchQuery,
        selectRequest,
        setFilters,
        setSearchQuery,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
```

**Step 2: Create Rules Context**

Create `src/shared/context/RulesContext.jsx`:
```javascript
import { createContext, useContext, useState, useCallback } from 'react';

const RulesContext = createContext({
  rules: '',
  isDirty: false,
  isEnabled: true,
  setRules: () => {},
  saveRules: async () => {},
  revertRules: () => {},
  toggleEnabled: () => {},
});

export function RulesProvider({ children }) {
  const [rules, setRulesState] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  const setRules = useCallback((newRules) => {
    setRulesState(newRules);
    setIsDirty(newRules !== rules);
  }, [rules]);

  const saveRules = useCallback(async () => {
    // Will be implemented with API
    setIsDirty(false);
  }, []);

  const revertRules = useCallback(() => {
    // Will be implemented with API
    setIsDirty(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  return (
    <RulesContext.Provider
      value={{
        rules,
        isDirty,
        isEnabled,
        setRules,
        saveRules,
        revertRules,
        toggleEnabled,
      }}
    >
      {children}
    </RulesContext.Provider>
  );
}

export function useRules() {
  return useContext(RulesContext);
}
```

**Step 3: Create Values Context**

Create `src/shared/context/ValuesContext.jsx`:
```javascript
import { createContext, useContext, useState, useCallback } from 'react';

const ValuesContext = createContext({
  values: {},
  selectedKey: null,
  selectKey: () => {},
  setValue: async () => {},
  deleteValue: async () => {},
});

export function ValuesProvider({ children }) {
  const [values, setValuesState] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);

  const selectKey = useCallback((key) => {
    setSelectedKey(key);
  }, []);

  const setValue = useCallback(async (key, value) => {
    setValuesState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const deleteValue = useCallback(async (key) => {
    setValuesState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedKey === key) {
      setSelectedKey(null);
    }
  }, [selectedKey]);

  return (
    <ValuesContext.Provider
      value={{
        values,
        selectedKey,
        selectKey,
        setValue,
        deleteValue,
      }}
    >
      {children}
    </ValuesContext.Provider>
  );
}

export function useValues() {
  return useContext(ValuesContext);
}
```

**Step 4: Update main.jsx with all providers**

Update `src/main.jsx`:
```javascript
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './shared/context/ThemeContext';
import { NetworkProvider } from './shared/context/NetworkContext';
import { RulesProvider } from './shared/context/RulesContext';
import { ValuesProvider } from './shared/context/ValuesContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <NetworkProvider>
        <RulesProvider>
          <ValuesProvider>
            <App />
          </ValuesProvider>
        </RulesProvider>
      </NetworkProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

**Step 5: Test context in a component**

Update `src/features/network/Network.jsx` to test context:
```javascript
import { useNetwork } from '../../shared/context';

export default function Network() {
  const { requests, selectRequest } = useNetwork();

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <p className="text-tahoe-subtle mb-2">Network capture coming soon...</p>
        <p className="text-xs text-tahoe-border">
          Requests: {requests.length}
        </p>
      </div>
    </div>
  );
}
```

**Step 6: Verify in Electron**

Run:
```bash
npm run dev
```

Expected: Network view shows "Requests: 0", context working

**Step 7: Commit**

```bash
git add src/shared/context/ src/features/network/Network.jsx src/main.jsx
git commit -m "feat: add React Context for state management

- Create NetworkContext for requests state
- Create RulesContext for editor state
- Create ValuesContext for key-value store
- Add all providers to main.jsx
- Export useNetwork, useRules, useValues hooks"
```

---

## Task 9: Add Concurrently for Development

**Files:**
- Modify: `package.json`

**Step 1: Install development dependencies**

Run:
```bash
npm install --save-dev concurrently@8 wait-on@7
```

Expected: Packages added to devDependencies

**Step 2: Update package.json scripts**

Ensure `package.json` has these scripts:
```json
{
  "scripts": {
    "start": "electron ./lib",
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron ./lib",
    "build:react": "vite build",
    "build:mac": "npm run build:react && electron-builder --mac",
    "build:win": "npm run build:react && electron-builder --win",
    "build:linux": "npm run build:react && electron-builder --linux",
    "lint": "eslint --fix lib"
  }
}
```

**Step 3: Test dev workflow**

Run:
```bash
npm run dev
```

Expected:
1. Vite starts on port 5173
2. wait-on confirms Vite is ready
3. Electron window opens with React app

**Step 4: Build test**

Run:
```bash
npm run build:react
```

Expected: `dist-react/` directory created with built files

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add dev workflow with concurrently

- Install concurrently and wait-on
- Add dev script for parallel Vite + Electron
- Add build:react script for production builds"
```

---

## Task 10: Final Verification and Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Run full dev workflow**

Run:
```bash
npm run dev
```

Verify:
- [ ] Vite dev server starts at http://localhost:5173
- [ ] Electron window opens with React app
- [ ] Sidebar navigation works (Network, Rules, Values)
- [ ] Tahoe theme applied (check colors, fonts)
- [ ] Dark/light mode matches system preference
- [ ] No console errors

**Step 2: Test production build**

Run:
```bash
npm run build:react
```

Verify:
- [ ] `dist-react/index.html` created
- [ ] Assets are built and hashed
- [ ] No build errors

**Step 3: Update CLAUDE.md**

Append to `CLAUDE.md`:
```markdown
## Frontend Development

The React frontend is built with Vite + React + TailwindCSS.

**Development:**
```bash
npm run dev          # Start Vite + Electron in parallel
npm run dev:vite     # Vite dev server only (port 5173)
npm run dev:electron # Electron only (requires Vite running)
```

**Building:**
```bash
npm run build:react  # Build React app to dist-react/
```

**Frontend Structure:**
- `src/App.jsx` - Root component with Sidebar + routing
- `src/features/` - Feature modules (network, rules, values)
- `src/shared/` - Shared utilities (api, context, ui)
- `src/styles/` - Global styles and Tailwind config

**State Management:**
- React Context for app state (useNetwork, useRules, useValues)
- ThemeProvider for dark/light mode sync with macOS

**API Integration:**
- `src/shared/api/whistle.js` - HTTP client for Whistle backend
- Default: `http://localhost:8888`
- Supports Basic Auth via Proxy Settings
```

**Step 4: Create README for frontend**

Create `README-FRONTEND.md`:
```markdown
# Prokcy Frontend

Modern React + Vite + TailwindCSS frontend for the Prokcy desktop application.

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build:react
```

## Project Structure

```
src/
├── App.jsx              # Root component
├── main.jsx             # Entry point
├── index.css            # Global styles + Tailwind
├── features/            # Feature modules
│   ├── network/         # Network capture
│   ├── rules/           # Rules editor (Monaco)
│   └── values/          # Values management
└── shared/              # Shared utilities
    ├── api/             # Whistle API client
    ├── context/         # React Context providers
    └── ui/              # Reusable components
```

## Tahoe Theme

The app uses a custom macOS Tahoe-inspired theme:
- Glass effects with backdrop-blur
- Rounded corners (6px - 16px)
- System font stack
- Dark/light mode sync with macOS

## API Client

Located in `src/shared/api/whistle.js`:
- `getNetworkRequests()` - Fetch captured requests
- `getRules()` / `setRules()` - Rule configuration
- `getValues()` / `setValue()` - Key-value store
- `checkHealth()` - Proxy health check

## State Management

React Context providers:
- `useNetwork()` - Network requests state
- `useRules()` - Rules editor state
- `useValues()` - Values store state
- `useTheme()` - Theme state
```

**Step 5: Final commit**

```bash
git add CLAUDE.md README-FRONTEND.md
git commit -m "docs: add frontend development documentation

- Update CLAUDE.md with frontend dev commands
- Add README-FRONTEND.md with getting started guide
- Document Tahoe theme and API client usage"
```

---

## Verification Checklist

After completing all tasks, verify:

**Setup:**
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts Vite + Electron
- [ ] `npm run build:react` creates `dist-react/`

**Functionality:**
- [ ] Sidebar navigation works
- [ ] Tahoe theme applied correctly
- [ ] Dark/light mode syncs with system
- [ ] All contexts provide hooks
- [ ] No console errors

**Code Quality:**
- [ ] All tasks committed
- [ ] Commit messages follow convention
- [ ] File structure matches design doc

---

## Follow-up Plan: Rules Grouping UX

Add a Rules Group list to the left of Monaco in the Rules view.

**Scope:**
- Render ordered group list from Whistle rules payload (`list`)
- Support **single-click toggle** and **double-click multi-activation**
- Keep rule priority as **top-to-bottom** and display active rank clearly

**Implementation tasks:**
1. Extend renderer preload + IPC handlers for group select/unselect
2. Extend `RulesContext` to expose groups, active names, and priority mode
3. Build left-side Rules Group panel in `src/features/rules/Rules.jsx`
4. Add UX hint text for double-click multi-activation and active order preview

**Acceptance criteria:**
- User can activate one group with single click
- User can activate additional groups with double-click (without clearing existing active groups)
- Active group order shown in UI always follows top-to-bottom priority

---

## Next Phase

After completing Phase 1: Foundation, proceed to **Phase 2: Network Section** implementation.
