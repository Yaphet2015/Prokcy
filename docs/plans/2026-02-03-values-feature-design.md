# Values Feature Design

**Date:** 2026-02-03
**Project:** Prokcy
**Feature:** Values Management

## Overview

The Values feature provides a key-value store for managing JSON5 objects with inline editing. It uses a two-column split layout with Monaco Editor for JSON5 syntax highlighting and validation.

## Layout

Two-column layout:
- **Left Panel (KeysList):** 30% width - scrollable list of all value keys
- **Right Panel (ValueEditor):** 70% width - Monaco Editor for editing selected value

## Visual Styling

Styling matches the Rules view exactly for consistency.

**Header/Toolbar:**
- `px-4 py-2 border-b border-tahoe-border glass-tahoe`
- Left side: "Values" title + key count in subtle text
- Right side: Status indicator + "Add New" button
- Button styles: `h-7 px-3 text-xs rounded-md font-medium`

**Panel Styling:**
- Left sidebar: `w-72 border-r border-tahoe-border bg-tahoe-surface backdrop-blur-md`
- Hover states: `hover:bg-tahoe-hover`
- Selection: `border-tahoe-accent bg-tahoe-accent/10`

**Status Indicators:**
- "Saving..." / "Unsaved changes"
- Error display: `text-xs text-red-500`
- Loading spinner: `w-8 h-8 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin`

## Data Flow & State

**ValuesContext State:**
```javascript
{
  values: {},           // { key: jsonString }
  selectedKey: null,
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: '',

  // Actions
  fetchValues(),
  selectKey(key),
  setValue(key, value),      // Local draft only
  deleteValue(key),          // Confirm, then persist immediately
  createValue(key),          // Persist immediately
  renameKey(oldKey, newKey), // Persist immediately
  setSearchQuery(query)
}
```

**Draft Editing State (UI-level):**
- The editor always writes text changes to local state so dirty tracking stays accurate.
- Temporary syntax errors are allowed while typing so the editor never interrupts partial JSON5 edits.
- The key list does not show a special invalid marker for draft-only syntax errors.
- Save actions stay available while dirty drafts exist and validation is deferred to explicit save.

**API Integration:**
- `fetchValues()` calls `getValues()` on mount
- `fetchValues()` must normalize both Whistle envelope responses (`{ ec, list }`) and plain key-value maps before writing to context state
- `setValue(key, value)` updates local draft state only
- `deleteValue(key)` calls `deleteValue(key)` after confirmation and updates the persisted baseline on success
- `createValue(key)` calls `setValue(key, '{}')` immediately and updates the persisted baseline on success
- `renameKey(oldKey, newKey)` calls `setValue(newKey, currentValue)` then `deleteValue(oldKey)`, and updates the persisted baseline on success

**Save Behavior:**
- JSON text edits stay local until the user clicks `Save` or presses `Cmd/Ctrl+S`
- Structural operations (`create`, `delete`, `rename`) persist immediately after their confirm action succeeds
- Immediate structural saves must not flush unrelated unsaved editor drafts
- On explicit save, every dirty value is validated and formatted as JSON5 before any persistence call
- If one dirty value is invalid JSON5, the entire save fails, no values are persisted, and the error message names the offending key
- Successful saves replace dirty drafts with their formatted JSON5 text before promoting them to the persisted baseline

**Pending Navigation Behavior:**
- The App shell can enter Values with a pending key from Rules `Cmd/Ctrl+Click` navigation
- If the key exists, Values selects it immediately and focuses the Monaco editor
- If the key does not exist, Values clears selection for that navigation cycle and suppresses the usual first-key auto-select once
- Non-local Whistle `file://` targets do not enter Values and instead surface an inline Rules status message

## Component Structure

```
src/features/values/
├── Values.jsx              # Main container (two-column layout)
├── components/
│   ├── KeysList.jsx        # Left panel: search + key list + add button
│   ├── ValueEditor.jsx     # Right panel: Monaco + toolbar + delete
│   └── CreateValueDialog.jsx # Modal for entering new key name
└── constants.js            # JSON5 language config
```

**Components:**

**Values.jsx:** Main container, fetch values on mount, two-column layout

**KeysList.jsx:** Search input, filtered/sorted key list, "Add New" button

**ValueEditor.jsx:** Key name display, Monaco Editor with JSON5, status indicator, delete button

**CreateValueDialog.jsx:** Modal for new key name with validation

## Editor Configuration

**Monaco Editor:**
- Language: JSON5 (comments allowed, trailing commas)
- Theme: `tahoe-dark` or `tahoe-light` (syncs with system)
- Options: `minimap: { enabled: false }`, `scrollBeyondLastLine: false`
- The shared Monaco wrapper must register Monaco standalone `productService` before the first editor instance is created; `overrideServices` alone is not enough because standalone Monaco ignores overrides for services it never registered
- Paste handling must continue to avoid blanket `Cmd/Ctrl+V` interception and only customize the main Monaco text surface when native clipboard fallback is needed
- In Electron, the editable Monaco wrapper must provide a `Cmd/Ctrl+V` fallback that reads clipboard text from the preload-exposed API and forwards it through Monaco's `paste` handler when the built-in native command path inserts nothing
- When Monaco find or replace inputs are focused, that custom `Cmd/Ctrl+V` fallback must be disabled so native paste continues to target the overlay input instead of the editor buffer
- Focus can be requested programmatically after cross-view navigation from Rules

## Edge Cases

1. **No values:** Empty state with hint message
2. **Invalid JSON5 while dirty:** Monaco can show syntax errors, but editing continues uninterrupted until the user explicitly saves
3. **Delete confirmation:** Dialog confirmation triggers immediate delete persistence
4. **Duplicate key:** Inline error in create dialog
5. **API failures:** Retry with exponential backoff
6. **Rename:** Double-click or context menu on key
7. **Empty value:** Defaults to `{}` for new values
8. **Unexpected payload types:** Non-string values must be coerced to strings before passing data into Monaco to prevent renderer crashes on initial load
9. **Missing cross-view target:** Navigating from Rules to a missing `{valueKey}` keeps the empty state instead of selecting an unrelated first key

## Keyboard Shortcuts

- `Cmd/Ctrl+S`: Save dirty values (blocked only while a save is already in progress)
- `Cmd/Ctrl+N`: Create new value
- `Cmd/Ctrl+Shift+R`: Rename selected key
- `Cmd/Ctrl+D`: Delete selected key
- `Cmd/Ctrl+F`: Focus search input
