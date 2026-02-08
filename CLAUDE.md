# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prokcy is a cross-platform desktop network debugging proxy tool. Built with Electron, it provides a modern GUI for the powerful Whistle proxy server.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Lint code
npm run lint

# Build for distribution
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

**Renderer Process**:
- Displays the Whistle web UI
- Handles user interactions
- Runs find-bar functionality for in-page search

**Utility Process** (`lib/whistle.js`):
- Forked child process that runs the Whistle proxy server
- Handles all proxy operations, rule management, and plugin system
- Communicates with main process via `process.parentPort.postMessage()`

### Key Modules

- **`lib/context.js`**: Shared state management between processes (window reference, child process, options, data URL handling)
- **`lib/window.js`**: BrowserWindow creation, lifecycle, and cleanup
- **`lib/menu.js`**: Application menus, tray icon, and system proxy management
- **`lib/proxy.js`**: System proxy configuration (macOS/Windows/Linux)
- **`lib/settings.js`**: User preferences and proxy settings UI
- **`lib/plugins.js`**: Plugin installation via `npminstall`
- **`lib/fork.js`**: Manages the forked Whistle utility process
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

4. **macOS LSUIElement**: The app uses `LSUIElement: true` to hide from dock by default, with a "Hide From Dock" menu option.

5. **Platform-Specific Code**:
   - macOS: Dock menu, sudo-prompt for root CA installation
   - Windows: Squirrel installer integration, pseudo-protocol handling
   - Linux: AppImage packaging

6. **Pseudo-Protocol**: Custom `whistle://` protocol for opening client with specific data URLs (Windows/macOS only).

## File Structure Conventions

- All source files in `/lib/`
- Static assets in `/public/` (icons, themes)
- Entry point: `lib/index.js`
- Module imports use CommonJS (`require`/`module.exports`)

## Code Patterns

- Error handling uses global `uncaughtException` and `unhandledRejection` handlers
- Async operations use try-catch with no-op fallbacks
- Icon management uses caching with theme-aware loading (`dark/` prefix)
- Menus are rebuilt dynamically when checkbox states change

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
