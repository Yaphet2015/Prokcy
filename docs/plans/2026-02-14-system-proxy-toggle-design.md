# System Proxy Toggle in Settings

## Overview

Add a toggleable switch for enabling/disabling system proxy in the Settings UI's Proxy category.

## Current State

- System proxy is controlled via tray/app menu ("Set As System Proxy")
- Backend functions exist in `lib/proxy.js`: `enableProxy()`, `disableProxy()`, `isEnabled()`
- State persisted as `autoSetProxy` in storage
- No UI in Settings page for this functionality

## Design

### Backend Changes

#### IPC Handler (`lib/ipc.js`)

Add two new handlers:

```javascript
// Get system proxy enabled state
ipcMain.handle('get-system-proxy-enabled', () => {
  const { isEnabled } = require('./proxy');
  return isEnabled();
});

// Toggle system proxy
ipcMain.handle('set-system-proxy-enabled', async (event, enabled) => {
  const { enableProxy, disableProxy } = require('./proxy');
  const { getSettings } = require('./settings');

  if (enabled) {
    await enableProxy(getSettings());
  } else {
    await disableProxy();
  }

  // Update storage to persist state
  const storage = require('./storage');
  storage.setProperty('autoSetProxy', enabled);

  return { success: true, enabled };
});
```

#### Preferences (`lib/preferences.js`)

Add `systemProxyEnabled` to `getPreferences()`:

```javascript
const getPreferences = () => ({
  startAtLogin: getStartAtLogin(),
  hideFromDock: getHideFromDock(),
  themeMode: getThemeMode(),
  requestFilters: getRequestFilters(),
  systemProxyEnabled: storage.getProperty('autoSetProxy') ?? false,
});
```

### Frontend Changes

#### Settings Form (`src/features/settings/index.tsx`)

1. Add `systemProxyEnabled: boolean` to `SettingsForm` interface
2. Add to `DEFAULT_SETTINGS` object
3. Add to `normalizeSettings()` function
4. Add toggle UI in Proxy category section
5. Add immediate-action handler (independent of Save button)

Toggle placement: After Bypass List, full width, with description text.

Handler behavior:
- Calls `window.electron.setSystemProxyEnabled(enabled)`
- Updates local state immediately
- Shows success/error message
- Does not require Save button

### Preload & Types

Expose new IPC method to renderer:

```typescript
setSystemProxyEnabled: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
```

## Implementation Checklist

- [ ] Add IPC handlers in `lib/ipc.js`
- [ ] Update `getPreferences()` in `lib/preferences.js`
- [ ] Add preload/type definitions for new IPC method
- [ ] Update `SettingsForm` interface and defaults
- [ ] Add toggle UI in Proxy category
- [ ] Add toggle handler function
- [ ] Test: Toggle from settings reflects in menu
- [ ] Test: Toggle from menu reflects in settings on reload

## Decisions

- **Placement:** Proxy category (alongside port, host, bypass settings)
- **Approach:** Minimal IPC + direct toggle (no real-time sync)
- **Behavior:** Immediate action, independent of Save button
