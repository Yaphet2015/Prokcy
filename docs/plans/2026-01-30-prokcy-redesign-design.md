# Prokcy Redesign Design Document

**Date:** 2026-01-30
**Project:** Prokcy (fork of Whistle Client)
**Goal:** Complete UI rebuild with modern macOS Tahoe aesthetic

## Overview

Prokxy is a fork of the Whistle Client desktop application. This redesign replaces the entire Whistle web UI with a custom-built interface using React, TailwindCSS, and Monaco Editor. The new UI emphasizes three core features: Network capture, Rules editing, and Values management—all styled with an authentic macOS Tahoe aesthetic.

**Core Features:**
- **Network:** Waterfall timeline with full request/response inspection
- **Rules:** Monaco Editor with Whistle syntax highlighting
- **Values:** Key-value store with inline editing

**Tech Stack:**
- Frontend: Vite + React + TailwindCSS
- State: React Context + hooks
- Editor: Monaco Editor
- Communication: HTTP API + Server-Sent Events (SSE)

## Architecture

### Process Structure

The application preserves Electron's multi-process architecture. The main process loads the React frontend; a utility process continues running the Whistle proxy server. Processes communicate via HTTP to the Whistle API and SSE for real-time updates.

### Frontend Structure

```
src/
├── App.jsx                 # Root: Sidebar + layout
├── main.jsx                # Vite entry
├── features/
│   ├── network/            # Waterfall + inspector
│   ├── rules/              # Monaco editor
│   └── values/             # Key-value management
├── shared/
│   ├── api/                # Whistle HTTP client
│   ├── context/            # React Context providers
│   └── ui/                 # Reusable components
└── styles/
    └── tailwind.config.js  # Tahoe theme
```

### Data Flow

1. Components fetch data via the shared API layer to Whistle's HTTP endpoints
2. SSE streams real-time network requests to the Network context
3. React Context manages state; components re-render on changes
4. Monaco Editor manages its own state, syncing to API on save

## UI Layout

### App Shell

A collapsible sidebar (left) provides navigation. The main content area displays the selected feature. The sidebar uses glass effects (`backdrop-filter: blur(20px)`) with semi-transparent backgrounds.

**Navigation Items:**
- Network (waterfall icon)
- Rules (code icon)
- Values (key-value icon)

Each item uses `rounded-xl` hover states with subtle `hover:bg-white/10` effects.

### Network Section

Split layout: WaterfallTimeline (top 60%) and RequestInspector (bottom 40%).

**Waterfall Timeline:**
- Requests display as horizontal bars
- Timing color-coded: DNS (blue), TCP (teal), TLS (green), TTFB (purple), Download (orange)
- Click to populate inspector
- Searchable and filterable

**Request Inspector:**
- Tabs: Headers, Body, Response, Timeline
- Syntax-highlighted JSON for bodies
- Full request/response details

### Rules Section

Full-height Monaco Editor with toolbar (Save, Revert, Enable/Disable All). Status indicator shows "Saved" or "Unsaved changes."

**Monaco Features:**
- Custom Whistle language definition
- Tahoe-themed syntax highlighting
- Cmd/Ctrl+S to save
- Cmd/Ctrl+/ to toggle comments
- Error squiggles for invalid syntax

### Rules Grouping Panel (Left of Editor)

Add a fixed-width group list panel to the left side of the Rules editor to manage rule-group activation without leaving the editing view.

**Interaction model:**
- **Single click:** Toggle the clicked group on/off (standard activation behavior)
- **Double click:** Force multi-activation for that group (keep existing active groups, then activate target)
- **Editor target:** Monaco continues editing `Default` rules content for this phase

**Runtime requirement:**
- Start Whistle with `enableMultipleRules` mode so selecting one group does not implicitly clear other active groups.

**Priority model:**
- Group priority is displayed and interpreted as **top-to-bottom**
- Active groups show rank badges (`#1`, `#2`, ...)
- Drag-and-drop reorder must update the renderer list optimistically, then persist via IPC. If persistence fails, rollback to the previous order.

**State/data:**
- Extend `RulesContext` with:
  - `ruleGroups[]` (name, selected, priority, isDefault)
  - `activeGroupNames[]`
- Parse these from Whistle rules payload (`list`)
- Maintain a persisted UI order (`rulesOrder`, includes `Default`) and always apply it when rendering incoming `list`.

**IPC contract additions:**
- `set-rule-selection` → select/unselect a named group
- `reorder-rules-groups` → persist reordered group names
- `get-rules-order` / `set-rules-order` → persist renderer order (including `Default`) in preferences

**Whistle worker message handling additions:**
- `reorderRulesGroups`: persist custom group order by applying `moveToTop` in reverse order; `Default` stays fixed at top.

### Values Section

Two-column layout: KeysList (left 30%) and ValueEditor (right 70%). Values support strings, numbers, and JSON objects with inline editing.

## Visual Design: macOS Tahoe

### Color System

Electron sets CSS variables based on system appearance:

```javascript
// Dark mode
'--color-tahoe-bg': '#1e1e1e'
'--color-tahoe-fg': '#ffffff'
'--color-tahoe-accent': '#0a84ff'
'--color-tahoe-border': 'rgba(255,255,255,0.1)'

// Light mode
'--color-tahoe-bg': '#ffffff'
'--color-tahoe-fg': '#1d1d1f'
'--color-tahoe-accent': '#007aff'
'--color-tahoe-border': 'rgba(0,0,0,0.08)'
```

### Shapes & Effects

- **Border Radius:** `6px` (small), `8px` (cards), `12px` (panels/buttons), `16px` (containers), `pill` (9999px)
- **Shadows:** Subtle layered shadows for depth
- **Glass:** `bg-white/10 backdrop-blur-tahoe border border-white/20`

### Typography

System font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif` for authentic macOS feel. Monospace uses `'SF Mono, Monaco, monospace'`.

### Components

- **Buttons:** `h-9 px-5 rounded-lg font-medium text-sm` with hover/active states
- **Inputs:** `h-9 px-3 rounded-lg bg-tahoe-bg/50 border` with focus states
- **Scrollbars:** Custom thin (8px) with transparent tracks
- **Sidebar:** `w-60 glass-tahoe border-r`

## API Layer & State

### HTTP Client

`src/shared/api/whistle.js` exports:

```javascript
getNetworkRequests()    // All captured requests
getRules() / setRules() // Rule configuration
getValues() / setValues() // Key-value store
installPlugin(name)      // Plugin management
```

All requests target `http://localhost:8888` (configurable). The client handles Proxy Authentication when required.

### Server-Sent Events

`useNetworkStream()` hook establishes SSE connection to Whistle's network stream endpoint. New requests arrive as events, updating Network context state.

### React Context

- **NetworkContext:** `requests[]`, `selectedRequest`, `filters`, `searchQuery`
- **RulesContext:** `rules` string, `isDirty`, `isEnabled`
- **ValuesContext:** `values: Map`, `selectedKey`

Each provides hooks and actions: `useNetwork()`, `selectRequest()`, `updateRules()`.

### Data Sync

- **Network:** Real-time via SSE
- **Rules:** Fetch on mount, save on explicit action
- **Values:** Fetch on mount, auto-save on edit

## Monaco Editor Integration

### Setup

Using `@monaco-editor/react`:

```javascript
<Editor
  height="100%"
  language="whistle"
  theme="tahoe-dark"
  value={rules}
  onChange={onChange}
  options={{
    fontSize: 13,
    fontFamily: 'SF Mono, Monaco, monospace',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 16 },
  }}
/>
```

### Custom Language

Register `whistle` language with syntax highlighting:
- Pattern: `pattern operator value` (e.g., `www.example.com reqHeaders://custom`)
- Operators: `//`, `://`, `=>`, `@` → keyword color
- Patterns → string color
- Comments (`#`) → gray
- Multi-line rule support
- Autocomplete includes the full protocol set listed in Whistle docs (including aliases like `xhttp-proxy`, `xhttps-proxy`, and filter forms such as `lineProps`, `excludeFilter`, `includeFilter`)

### Custom Themes

Define `tahoe-dark` and `tahoe-light` Monaco themes matching Tailwind colors for seamless integration.

## Error Handling

### Connection Errors

When Whistle proxy unreachable:
- Show "Unable to connect to Whistle proxy" message
- Provide "Restart Proxy" button
- Auto-retry with exponential backoff (1s, 2s, 4s, max 30s)

### Authentication

API includes `Authorization` header for credentials. On 401, show credentials dialog.

### Monaco Loading

Monaco bundle (~3MB) loads asynchronously with skeleton loader:

```javascript
const Monaco = lazy(() => import('@monaco-editor/react'));
<Suspense fallback={<Skeleton />}>
  <Monaco ... />
</Suspense>
```

### SSE Reconnection

Auto-reconnect on drop with backoff. Show subtle "Reconnecting..." indicator.

### Data Conflicts

Poll for external changes every 30s. On conflict, show "External changes detected—Reload?" dialog.

### State Persistence

Persist to `localStorage`: sidebar collapsed state, selected tab, window size.

## Build Configuration

### Vite Config

```javascript
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
  },
});
```

### Package Scripts

```json
{
  "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
  "dev:vite": "vite",
  "dev:electron": "wait-on http://localhost:5173 && electron ./lib",
  "build:react": "vite build",
  "build:mac": "npm run build:react && electron-builder --mac",
  "build:win": "npm run build:react && electron-builder --win",
  "build:linux": "npm run build:react && electron-builder --linux"
}
```

### Electron Integration

Update `lib/window.js`:

```javascript
const isDev = !app.isPackaged;
win.loadURL(
  isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist-react/index.html')}`
);
if (isDev) win.webContents.openDevTools();
```

## Implementation Phases

### Phase 1: Foundation

1. Set up Vite + React + TailwindCSS
2. Create App shell with Sidebar navigation
3. Configure Tahoe theme (colors, glass effects, typography)
4. Update Electron window to load React dev server
5. Build API client structure

### Phase 2: Network Section

1. Implement WaterfallTimeline component
2. Connect to Whistle network API
3. Set up SSE for real-time streaming
4. Build RequestInspector with tabs
5. Add filtering and search

### Phase 3: Rules Section

1. Integrate Monaco Editor
2. Create Whistle language definition
3. Implement save/revert functionality
4. Connect to Whistle rules API
5. Add syntax validation

### Phase 4: Values Section

1. Build two-column Values layout
2. Connect to Whistle values API
3. Implement inline editing
4. Add create/delete operations

### Phase 5: Polish

1. Implement error handling and edge cases
2. Optimize performance
3. Test cross-platform (macOS, Windows, Linux)
4. Write documentation

## Dependencies

### Production

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "@monaco-editor/react": "^4.x"
}
```

### Development

```json
{
  "@vitejs/plugin-react": "^4.x",
  "vite": "^5.x",
  "concurrently": "^8.x",
  "wait-on": "^7.x",
  "tailwindcss": "^3.x",
  "autoprefixer": "^10.x",
  "postcss": "^8.x"
}
```

## Notes

- Repository renamed from **Whistle** to **Prokxy**
- Existing Whistle data storage (`~/.whistle_client/`) remains unchanged
- Whistle utility process continues handling proxy operations
- Pseudo-protocol `whistle://` preserved for compatibility
