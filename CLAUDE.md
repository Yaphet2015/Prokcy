# CLAUDE.md

## Project Overview

Prokcy is a cross-platform desktop network debugging proxy tool. Built with Electron, it provides a modern GUI for the powerful Whistle proxy server.

**Core Features:**
- **Network:** Waterfall timeline with full request/response inspection
- **Rules:** Monaco Editor with Whistle syntax highlighting and rule group management
- **Values:** Key-value store with inline JSON5 editing

## TypeScript Configuration

The Electron main process (`lib/`) uses TypeScript with a separate configuration:

- **`tsconfig.lib.json`** - TypeScript config for Electron main process
  - Compiles to CommonJS for Electron compatibility
  - Output directory: `dist-lib/`
  - Strict type checking enabled

- **`lib/types/`** - Type declarations for:
  - Electron API extensions
  - Whistle proxy server (untyped dependency)
  - Shared application types

- **`dist-lib/`** - Compiled JavaScript output (gitignored)

The React frontend (`src/`) uses the root `tsconfig.json` with ESM output.

## Architecture

### Multi-Process Electron Architecture

The application uses Electron's multi-process architecture with three distinct processes:

**Main Process** (`lib/index.ts`):
- Application lifecycle management
- Single instance enforcement
- IPC (Inter-Process Communication) coordination
- macOS dock menu integration with window tracking
- Window control IPC handlers (`window:minimize`, `window:toggle-maximize`, `window:close`)

**Renderer Process**:
- React frontend with Vite + TailwindCSS
- Handles user interactions
- Theme synchronization with system appearance

**Utility Process** (`lib/whistle.ts`):
- Forked child process that runs the Whistle proxy server
- Handles proxy operations and rule management
- Communicates with main process via `process.parentPort.postMessage()`

### Key Modules (Electron/Node.js)

- **`lib/index.ts`**: Main entry point, app lifecycle
- **`lib/window.ts`**: BrowserWindow creation (frameless, transparent), lifecycle, and cleanup
- **`lib/menu.ts`**: Application menus, tray icon, and system proxy management
- **`lib/proxy.ts`**: System proxy configuration (macOS/Windows/Linux)
- **`lib/settings.ts`**: User preferences and proxy settings UI
- **`lib/fork.ts`**: Manages the forked Whistle utility process
- **`lib/ipc.ts`**: IPC handlers for theme sync and window controls
- **`lib/storage.ts`**: Persistent settings storage using `~/.whistle_client/proxy_settings`
- **`lib/util.ts`**: Shared utilities including platform detection, paths, and helper functions

### IPC Communication Pattern

Messages flow between main and utility process via a simple type-based protocol:

```javascript
// From main to worker
child.postMessage({ type: 'selectRules', name: 'MyRules' });

// From worker to main
process.parentPort.postMessage({ type: 'options', options: {...} });
```

Message types are defined in `lib/whistle.ts` (worker receiving) and `lib/fork.ts` (main receiving).

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
- Entry point: `lib/index.ts`
- Module imports use CommonJS (`require`/`module.exports`)
- Compiled to `dist-lib/` (gitignored)
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

**Endpoints (`src/shared/api/whistle.ts`):**
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

Remember to review and update the existing design doc in docs/plans when you make any changes about the features of this app.
