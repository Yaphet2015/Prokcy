# macOS Menu Bar Redesign

## Overview

Redesign the macOS menu bar to follow native conventions while preserving all existing functionality.

## Changes Required

### 1. Set App Name

Add `app.setName('Prokcy')` in `lib/index.js` to ensure the menu displays "Prokcy" instead of "Electron".

### 2. Menu Structure

#### Prokcy Menu
- About Prokcy
- Check for Updates...
- ---
- Preferences... (Cmd+,)
- ---
- Install Root CA
- Set As System Proxy (checkmark when enabled)
- ---
- Start At Login (checkmark when enabled)
- Hide From Dock (checkmark when enabled)
- ---
- Restart (Cmd+Shift+R)
- Quit Prokcy (Cmd+Q)

#### Edit Menu
- Undo (Cmd+Z)
- Redo (Shift+Cmd+Z)
- ---
- Cut (Cmd+X)
- Copy (Cmd+C)
- Paste (Cmd+V)
- Select All (Cmd+A)
- ---
- Find... (Cmd+F)

#### View Menu
- Reload (Cmd+R)
- Toggle Developer Tools (Cmd+Opt+I)
- ---
- Network (Cmd+1)
- Rules (Cmd+2)
- Values (Cmd+3)

#### Window Menu
- Minimize (Cmd+M)
- Zoom
- ---
- Bring All to Front

#### Help Menu
- Prokcy Documentation
- View on GitHub
- ---
- Report an Issue

## Implementation Notes

- Menu icons should be preserved for tray menu but removed from app menu (native macOS menus don't use icons)
- `Hide Others` and `Show All` can use Electron's built-in `role: 'hideOthers'` and `role: 'unhide'`
- `Minimize` and `Zoom` use built-in roles
- About dialog can use a simple message box or custom window
