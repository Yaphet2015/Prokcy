# Glassmorphism Frameless Window Design

**Date:** 2025-02-10
**Status:** Design Approved

## Overview

Remove Electron's native window frame and implement a bold glassmorphism UI with custom window controls. This creates an immersive, modern interface that maximizes content space while establishing distinctive visual identity.

## Motivation

- **Modern aesthetics:** Sleek, contemporary look integrated with OS design language
- **Unique identity:** Distinctive appearance that stands apart from other proxy tools
- **Maximum content:** Remove chrome to dedicate more space to proxy interface
- **Bold presence:** In-your-face glassmorphism with colored tints and depth

## Visual Style

**Glass Aesthetic:** Bold glassmorphism with heavy blur, strong translucency, colored tints (blue/purple), highlights, and layered shadows.

**Scope:** Full window glass effect with depth layers between sidebar and content.

**Shape:** Subtly rounded corners (~12-16px radius) for refined macOS-style appearance.

**Window Controls:** Integrated into sidebar header (not floating, not top-left traffic lights), with control glyphs revealed on hover/focus for each traffic-light button.

---

## Section 1: Electron Window Configuration

### Core Changes to `lib/window.js`

```javascript
const createWindow = () => {
  const win = new BrowserWindow({
    title: getTitle(),
    frame: false,              // Remove native frame
    transparent: true,         // Enable translucency
    titleBarStyle: 'hidden',   // Hide title bar (macOS)
    backgroundColor: '#00000000', // Full transparency
    roundedCorners: true,      // Native corner rounding (macOS)
    fullscreen: false,
    fullscreenable: true,
    icon: ICON,
    width: 1200,
    height: 800,
    resizable: true,           // Edge resizing still works
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false,
      webviewTag: true,
      preload: path.join(__dirname, '../electron-preload.js'),
    },
  });

  win.setHasShadow(true);      // Custom window shadow

  // macOS: Position traffic lights if using native buttons
  if (process.platform === 'darwin') {
    win.setWindowButtonPosition({ x: 15, y: 20 });
  }

  // ... rest of window setup
};
```

### IPC Handlers for Window Control (`lib/ipc.js`)

```javascript
const { ipcMain } = require('electron');
const ctx = require('./context');

// Window control handlers
ipcMain.handle('window:minimize', () => {
  const win = ctx.getWin();
  win?.minimize();
});

ipcMain.handle('window:maximize', () => {
  const win = ctx.getWin();
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.handle('window:close', () => {
  const win = ctx.getWin();
  win?.close();
});

ipcMain.handle('window:isMaximized', () => {
  const win = ctx.getWin();
  return win?.isMaximized() || false;
});
```

### Draggable Regions via CSS

```css
/* Sidebar header becomes draggable title bar */
.sidebar-header {
  -webkit-app-region: drag;
}

/* Window controls must not be draggable */
.window-controls {
  -webkit-app-region: no-drag;
}

/* Interactive elements need no-drag */
button, input, a {
  -webkit-app-region: no-drag;
}
```

---

## Section 2: Glassmorphism Visual System

### CSS Foundation

Create `src/styles/glass.css`:

```css
/* Core glass utilities */
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Layered depth system */
.glass-layer-1 { z-index: 10; opacity: 0.95; }
.glass-layer-2 { z-index: 20; opacity: 0.9; }
.glass-layer-3 { z-index: 30; opacity: 0.85; }

/* Bold colored tints */
.glass-tint-blue {
  background: rgba(59, 130, 246, 0.15);
}

.glass-tint-purple {
  background: rgba(139, 92, 246, 0.15);
}

.glass-tint-gradient {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(139, 92, 246, 0.15) 100%
  );
}

/* Highlights and shadows for depth */
.glass-highlight {
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}

.glass-elevated {
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Hover state for interactive glass */
.glass-hover:hover {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px) saturate(200%);
  -webkit-backdrop-filter: blur(30px) saturate(200%);
}

/* Performance hint for animated elements */
.glass-animated {
  will-change: transform, backdrop-filter;
}
```

### Tailwind Config Extension (`tailwind.config.js`)

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.3)',
          border: 'rgba(255, 255, 255, 0.2)',
        },
      },
      backdropBlur: {
        glass: '20px',
        glassHeavy: '30px',
      },
    },
  },
};
```

### Theme-Aware Glass Variables

Extend `src/shared/context/ThemeContext.jsx`:

```javascript
// Add CSS custom properties for theme-aware glass
const setGlassVariables = (theme) => {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.style.setProperty('--glass-bg', 'rgba(0, 0, 0, 0.3)');
    root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    root.style.setProperty('--glass-tint', 'rgba(59, 130, 246, 0.15)');
    root.style.setProperty('--glass-shadow', 'rgba(0, 0, 0, 0.4)');
  } else {
    root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.1)');
    root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.2)');
    root.style.setProperty('--glass-tint', 'rgba(59, 130, 246, 0.1)');
    root.style.setProperty('--glass-shadow', 'rgba(0, 0, 0, 0.3)');
  }
};
```

---

## Section 3: Component Architecture

### New Components Structure

```
src/shared/ui/
  ├── TitleBar/
  │   ├── TitleBar.jsx          # Main draggable header with window controls
  │   ├── WindowControls.jsx    # Close/minimize/maximize buttons
  │   └── index.js
  ├── Glass/
  │   ├── GlassPanel.jsx        # Wrapper for glass effect
  │   ├── GlassCard.jsx         # Elevated glass content cards
  │   └── index.js
  └── WindowChrome/
      ├── ResizeHandle.jsx      # Edge resize handles
      └── index.js
```

### GlassPanel Component

---

## 2026-02-10 Implementation Update

### Final scope shipped

- Native frame is hidden for the main app window via `frame: false` in `lib/window.js`.
- A renderer-driven custom window chrome is used across platforms for consistency.
- Window controls are implemented in `src/shared/ui/Sidebar.jsx`, and the content header is implemented in `src/shared/ui/ContentHeader.jsx`.
- Window control actions are bridged over IPC (`window:minimize`, `window:toggle-maximize`, `window:close`, `window:is-maximized`).

### Event synchronization

- Main process sends maximize state updates to renderer using `window-maximize-changed`.
- Renderer subscribes via preload API to keep maximize/restore icon state correct.

### Dragging model

- Titlebar container uses `-webkit-app-region: drag`.
- Interactive controls use `-webkit-app-region: no-drag`.
- CSS utilities are provided in `src/index.css` as `.app-drag` and `.app-no-drag`.

### Notes

- This implementation keeps existing close-to-tray behavior unchanged (`win.close()` still maps to hide by default in current lifecycle).
- Existing settings modal behavior remains unchanged.

## 2026-02-10 Layout Revision (Sidebar/Content Split)

### Requested adjustment applied

- Removed full-width global titlebar composition.
- Final shell layout is now two-pane:
  - Left: full-height sidebar (navigation + custom window controls)
  - Right: content region with its own header

### Window controls placement and style

- Custom controls were moved to the top-left of the sidebar.
- Control style now mimics native traffic lights:
  - close: red
  - minimize: yellow
  - maximize/restore: green
- On macOS, native window buttons are explicitly hidden via `setWindowButtonVisibility(false)` to avoid duplicate controls.

### Header scope

- Header now belongs only to the right content pane and no longer spans across the sidebar.
- Header still provides window drag behavior and double-click maximize/restore.

```jsx
// src/shared/ui/Glass/GlassPanel.jsx
import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './glass.css';

export const GlassPanel = ({ children, className = '', variant = 'default' }) => {
  const { theme } = useTheme();

  const baseClasses = 'glass glass-highlight';
  const variantClasses = {
    default: '',
    blue: 'glass-tint-blue',
    purple: 'glass-tint-purple',
    gradient: 'glass-tint-gradient',
  };
  const themeClasses = theme === 'dark' ? 'glass-dark' : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${themeClasses} ${className}`}
      style={{
        background: `var(--glass-bg, ${theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)'})`,
        border: `1px solid var(--glass-border, ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'})`,
      }}
    >
      {children}
    </div>
  );
};
```

### WindowControls Component

```jsx
// src/shared/ui/TitleBar/WindowControls.jsx
import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import './WindowControls.css';

export const WindowControls = () => {
  const { theme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check maximize state on mount and window changes
    const checkMaximized = async () => {
      const maximized = await window.electron?.invoke('window:isMaximized');
      setIsMaximized(maximized ?? false);
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    window.electron?.send('window:minimize');
  };

  const handleMaximize = () => {
    window.electron?.send('window:maximize');
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.electron?.send('window:close');
  };

  const ControlButton = ({ onClick, icon, label, hoverColor }) => (
    <button
      onClick={onClick}
      className={`window-control-btn ${hoverColor}`}
      aria-label={label}
      style={{ '-webkit-app-region': 'no-drag' }}
    >
      {icon}
    </button>
  );

  return (
    <div className="window-controls">
      <ControlButton
        onClick={handleMinimize}
        icon={<MinimizeIcon />}
        label="Minimize"
        hoverColor="hover-yellow"
      />
      <ControlButton
        onClick={handleMaximize}
        icon={isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        label={isMaximized ? 'Restore' : 'Maximize'}
        hoverColor="hover-green"
      />
      <ControlButton
        onClick={handleClose}
        icon={<CloseIcon />}
        label="Close"
        hoverColor="hover-red"
      />
    </div>
  );
};
```

### TitleBar Integration with Sidebar

```jsx
// src/shared/ui/Sidebar.jsx - Modified header
import React from 'react';
import { WindowControls } from './TitleBar/WindowControls';
import { GlassPanel } from './Glass/GlassPanel';

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      {/* Draggable title bar header */}
      <header className="sidebar-header glass glass-layer-3">
        <div className="sidebar-title">
          <Logo />
          <h1>Prokcy</h1>
        </div>
        <WindowControls />
      </header>

      {/* Rest of sidebar content */}
      <nav className="sidebar-nav glass glass-layer-2">
        {/* Navigation items */}
      </nav>
    </aside>
  );
};
```

---

## Section 4: Platform-Specific Considerations

### macOS

- Use `win.setWindowButtonPosition()` for native traffic light positioning
- Consider `titleBarStyle: 'hiddenInset'` for inset system buttons
- Native shadow with `win.setHasShadow(true)` works with frameless windows
- Handle Mission Control/Spaces: Window hiding/showing behaves normally

### Windows

- No native window buttons: fully custom controls required
- Keep `skipTaskbar: false` to maintain taskbar presence
- Win+Arrow shortcuts may need manual implementation or accepted limitation
- Aero Snap works with custom resize handles

### Linux

- Behavior varies by window manager
- Some WMs don't support transparent windows well
- Fallback: Detect platform and conditionally apply glass effects

---

## Section 5: Implementation Phases

### Phase 1: Core Frameless Window (Electron)

1. Modify `lib/window.js`: Add `frame: false`, `transparent: true`
2. Add IPC handlers in `lib/ipc.js`
3. Test basic functionality: drag, resize, close

### Phase 2: Glass UI Foundation (React)

1. Create Glass components (GlassPanel, GlassCard)
2. Add Tailwind config + custom CSS
3. Integrate with ThemeContext
4. Apply to Sidebar first

### Phase 3: Chrome & Controls

1. Build TitleBar with WindowControls
2. Integrate into Sidebar header
3. Add ResizeHandle components
4. Platform-specific adjustments

---

## Success Criteria

- ✅ Window controls work reliably across platforms
- ✅ Glass effect is visually striking but readable
- ✅ Performance impact is minimal (< 5% CPU overhead)
- ✅ Window behaves correctly (drag, resize, minimize, maximize)
- ✅ Theme switching updates glass colors appropriately

---

## Migration Strategy

1. Feature flag the frameless mode (settings toggle)
2. Allow users to revert to native frame if issues arise
3. Gradual rollout: Start with frameless, add glass progressively
4. Performance toggle: "Disable blur effects" option

---

## Files to Modify

```
lib/window.js                    # Frameless config
lib/ipc.js                       # Window control handlers
src/App.jsx                      # Wrap with GlassPanel
src/shared/ui/Sidebar.jsx        # Integrate TitleBar
src/shared/context/ThemeContext.jsx  # Glass CSS variables
tailwind.config.js               # Glass utilities
src/styles/glass.css             # New file
src/shared/ui/TitleBar/          # New directory
src/shared/ui/Glass/             # New directory
```
