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
- "Saving..." / "Saved" / "Unsaved changes"
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
  setValue(key, value),      // Auto-saves
  deleteValue(key),          // With confirmation
  createValue(key),
  renameKey(oldKey, newKey),
  setSearchQuery(query)
}
```

**API Integration:**
- `fetchValues()` calls `getValues()` on mount
- `setValue(key, value)` → `setValue(key, jsonString)` with 300ms debounce
- `deleteValue(key)` → `deleteValue(key)` after confirmation
- `createValue(key)` → `setValue(key, '{}')` for new empty JSON object

**Auto-save Behavior:**
- Changes trigger save after 300ms delay
- Shows "Saving..." during API call
- On success: "Saved" for 2 seconds, then clears

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

## Edge Cases

1. **No values:** Empty state with hint message
2. **Invalid JSON5:** Monaco shows syntax errors, auto-save suppressed
3. **Delete confirmation:** Native `confirm()` dialog
4. **Duplicate key:** Inline error in create dialog
5. **API failures:** Retry with exponential backoff
6. **Rename:** Double-click or context menu on key
7. **Empty value:** Defaults to `{}` for new values

## Keyboard Shortcuts

- `Cmd/Ctrl+N`: Create new value
- `Cmd/Ctrl+Shift+R`: Rename selected key
- `Cmd/Ctrl+D`: Delete selected key
- `Cmd/Ctrl+F`: Focus search input
