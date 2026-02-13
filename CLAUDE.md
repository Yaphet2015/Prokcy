# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prokcy is a cross-platform desktop network debugging proxy tool. Built with Electron, it provides a modern GUI for the powerful Whistle proxy server.

**Core Features:**
- **Network:** Waterfall timeline with full request/response inspection
- **Rules:** Monaco Editor with Whistle syntax highlighting and rule group management
- **Values:** Key-value store with inline JSON5 editing

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (Vite + Electron)
npm run dev

# Individual dev commands
npm run dev:vite     # Vite dev server only (port 5173)
npm run dev:electron # Electron only (requires Vite running)
npm start           # Electron only (production build)

# Lint code
npm run lint

# Build for distribution
npm run build:react  # Build React app to dist-react/
npm run build:mac    # macOS (Intel & Apple Silicon)
npm run build:win    # Windows
npm run build:linux  # Linux

# Create and publish release
npm run release:mac
npm run release:win
npm run release:linux
```

## Architecture

### Multi-Process Electron Architecture

The application uses Electron's multi-process architecture with three distinct processes:

**Main Process** (`lib/index.js`):
- Application lifecycle management
- Single instance enforcement
- IPC (Inter-Process Communication) coordination
- macOS dock menu integration with window tracking
- Window control IPC handlers (`window:minimize`, `window:toggle-maximize`, `window:close`)

**Renderer Process**:
- React frontend with Vite + TailwindCSS
- Handles user interactions
- Theme synchronization with system appearance

**Utility Process** (`lib/whistle.js`):
- Forked child process that runs the Whistle proxy server
- Handles all proxy operations, rule management, and plugin system
- Communicates with main process via `process.parentPort.postMessage()`

### Key Modules (Electron/Node.js)

- **`lib/index.js`**: Main entry point, app lifecycle
- **`lib/window.js`**: BrowserWindow creation (frameless, transparent), lifecycle, and cleanup
- **`lib/menu.js`**: Application menus, tray icon, and system proxy management
- **`lib/proxy.js`**: System proxy configuration (macOS/Windows/Linux)
- **`lib/settings.js`**: User preferences and proxy settings UI
- **`lib/plugins.js`**: Plugin installation via `npminstall`
- **`lib/fork.js`**: Manages the forked Whistle utility process
- **`lib/ipc.js`**: IPC handlers for theme sync and window controls
- **`lib/storage.js`**: Persistent settings storage using `~/.whistle_client/proxy_settings`
- **`lib/util.js`**: Shared utilities including platform detection, paths, and helper functions

### IPC Communication Pattern

Messages flow between main and utility process via a simple type-based protocol:

```javascript
// From main to worker
child.postMessage({ type: 'selectRules', name: 'MyRules' });

// From worker to main
process.parentPort.postMessage({ type: 'options', options: {...} });
```

Message types are defined in `lib/whistle.js` (worker receiving) and `lib/fork.js` (main receiving).

### Important Architectural Notes

1. **Storage Separation**: Client uses `~/.whistle_client/` by default, separate from CLI Whistle's `~/.whistle/`. Can be toggled via "Use whistle's default storage directory" setting.

2. **Process Isolation**: The Whistle server runs in a forked utility process with `ELECTRON_RUN_AS_NODE=1` for proper Node.js execution.

3. **Single Instance**: Uses `app.requestSingleInstanceLock()` to prevent multiple instances. Second instances trigger `open-url` or `second-instance` events.

4. **Frameless Window**: The app uses `frame: false` with `transparent: true` for a custom glassmorphism UI. Window controls are custom-rendered in the sidebar.

5. **Platform-Specific Code**:
   - macOS: Native traffic lights hidden, dock menu, sudo-prompt for root CA installation
   - Windows: Squirrel installer integration, pseudo-protocol handling
   - Linux: AppImage packaging

6. **Pseudo-Protocol**: Custom `whistle://` protocol for opening client with specific data URLs (Windows/macOS only).

## File Structure Conventions

### Electron/Node.js (`lib/`)
- Entry point: `lib/index.js`
- Module imports use CommonJS (`require`/`module.exports`)
- Static assets in `/public/` (icons, themes)

## Feature Details

### Network Section

**Layout:** Split panel - WaterfallTimeline (top 60%) + RequestInspector (bottom 40%)

**WaterfallTimeline:**
- Virtualized request list for performance
- Phase color-coding: DNS (blue), TCP (teal), TLS (green), TTFB (purple), Download (orange)
- Hover expansion with phase labels and timing values
- Debounced hover collapse (500ms delay)
- Timeline scaling tied to visible virtualized range

**RequestInspector:**
- Tabs: Headers, Body, Response, Timeline
- Syntax-highlighted JSON for bodies
- Full request/response details

### Rules Section

**Layout:** Two-pane - RulesSidebar (groups list, w-72) + RulesEditor (Monaco)

**Rule Groups:**
- Single click: Open group in editor
- Double click: Toggle group active state
- Drag-and-drop: Reorder groups (updates priority)
- Right-click context menu: Create, Rename, Delete
- Active groups show priority badges (#1, #2, ...)
- `enableMultipleRules` mode allows multiple active groups

**Monaco Editor:**
- Custom Whistle language with syntax highlighting
- Tahoe themes (`tahoe-dark`, `tahoe-light`)
- Cmd/Ctrl+S to save, Cmd/Ctrl+/ to toggle comments
- Lazy-loaded with Suspense

### Values Section

**Layout:** Two-column - KeysList (left 30%) + ValueEditor (right 70%)

**Features:**
- JSON5 format (comments and trailing commas allowed)
- Auto-save with 300ms debounce
- Create/delete/rename operations
- Search/filter keys
- Invalid JSON shows error, blocks save

**Keyboard Shortcuts:**
- Cmd+N: Create new value
- Cmd+D: Delete selected
- Cmd+Shift+R: Rename selected
- Cmd+F: Focus search

## API Integration

**Base URL:** `http://localhost:8888` (configurable)

**Endpoints (`src/shared/api/whistle.js`):**
- `/cgi-bin/requests/list` - Network requests
- `/cgi-bin/rules/get` / `/cgi-bin/rules/add` - Rules
- `/cgi-bin/values/list2` / `/cgi-bin/values/add` / `/cgi-bin/values/remove` - Values

**SSE Streaming:** Real-time network updates via Server-Sent Events

**Authentication:** Supports Basic Auth via Proxy Settings

## Code Patterns

### Electron/Node.js
- Error handling uses global `uncaughtException` and `unhandledRejection` handlers
- Async operations use try-catch with no-op fallbacks
- Icon management uses caching with theme-aware loading (`dark/` prefix)
- Menus are rebuilt dynamically when checkbox states change

### React Frontend
- Keep files under 500 lines; extract components/hooks when approaching limit
- Use custom hooks for complex logic (drag-and-drop, CRUD operations)
- Barrel exports (`index.js`) for clean imports
- Lazy load Monaco Editor with Suspense fallback
- Context providers for shared state, props for component-specific

## Documentation

Additional design and implementation plans are in `docs/plans/`:
- `2026-01-30-prokcy-redesign-design.md` - Full UI redesign overview
- `2026-01-30-prokcy-phase1-foundation.md` - Foundation implementation plan
- `2026-02-03-values-feature-design.md` - Values feature design
- `2026-02-10-rules-refactoring-plan.md` - Rules modular refactoring
- `2025-02-10-glassmorphism-frameless-window-design.md` - Window chrome design
