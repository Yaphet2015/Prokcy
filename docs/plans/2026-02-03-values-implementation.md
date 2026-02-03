# Values Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Values key-value management feature with two-column layout, Monaco Editor for JSON5, and auto-save functionality.

**Architecture:** Two-column split layout (KeysList left 30%, ValueEditor right 70%) with React Context state management, Whistle HTTP API integration, and Monaco Editor for JSON5 editing.

**Tech Stack:** React 18, TailwindCSS, Monaco Editor, JSON5 language, Whistle HTTP API (`/cgi-bin/values/`)

---

## Task 1: Update Whistle API Client for Values

**Files:**
- Modify: `src/shared/api/whistle.js:53-69`

**Step 1: Implement getValues function**

The Whistle API returns values as `{ ec: 0, list: [{name: string, data: string}] }`. We need to transform this to a `{ key: value }` object.

```javascript
// Replace existing getValues with:
export async function getValues() {
  const result = await request('/cgi-bin/values/list2');
  if (!result || !Array.isArray(result.list)) {
    return {};
  }
  // Transform [{name, data}] => {name: data}
  const values = {};
  result.list.forEach(item => {
    if (item && typeof item.name === 'string') {
      values[item.name] = item.data || '';
    }
  });
  return values;
}
```

**Step 2: Implement setValue function**

Uses `/cgi-bin/values/add` with `{name, value}` body.

```javascript
// Replace existing setValue with:
export async function setValue(key, value) {
  return request('/cgi-bin/values/add', {
    method: 'POST',
    body: JSON.stringify({ name: key, value: String(value) }),
  });
}
```

**Step 3: Implement deleteValue function**

Uses `/cgi-bin/values/remove` endpoint.

```javascript
// Replace existing deleteValue with:
export async function deleteValue(key) {
  return request('/cgi-bin/values/remove', {
    method: 'POST',
    body: JSON.stringify({ name: key }),
  });
}
```

**Step 4: Commit**

```bash
git add src/shared/api/whistle.js
git commit -m "feat: implement Values API client functions

Add getValues, setValue, deleteValue using Whistle's /cgi-bin/values/ endpoints.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Enhance ValuesContext with API Integration

**Files:**
- Modify: `src/shared/context/ValuesContext.jsx` (full rewrite)

**Step 1: Add new state variables**

```javascript
const [isLoading, setIsLoading] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [error, setError] = useState(null);
const [searchQuery, setSearchQuery] = useState('');
```

**Step 2: Implement fetchValues action**

```javascript
const fetchValues = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const { getValues } = await import('../api/whistle');
    const data = await getValues();
    setValuesState(data);
  } catch (err) {
    console.error('Failed to load values:', err);
    setError(err.message || 'Failed to load values');
  } finally {
    setIsLoading(false);
  }
}, []);
```

**Step 3: Implement setValue with auto-save**

```javascript
const setValue = useCallback(async (key, value) => {
  setValuesState((prev) => ({ ...prev, [key]: value }));
  setIsSaving(true);
  setError(null);
  try {
    const { setValue: apiSetValue } = await import('../api/whistle');
    await apiSetValue(key, value);
  } catch (err) {
    console.error('Failed to save value:', err);
    setError(err.message || 'Failed to save value');
  } finally {
    setIsSaving(false);
  }
}, []);
```

**Step 4: Implement deleteValue with confirmation**

```javascript
const deleteValue = useCallback(async (key) => {
  if (!window.confirm(`Delete "${key}"?`)) {
    return;
  }
  setIsSaving(true);
  setError(null);
  try {
    const { deleteValue: apiDeleteValue } = await import('../api/whistle');
    await apiDeleteValue(key);
    setValuesState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedKey === key) {
      setSelectedKey(null);
    }
  } catch (err) {
    console.error('Failed to delete value:', err);
    setError(err.message || 'Failed to delete value');
  } finally {
    setIsSaving(false);
  }
}, [selectedKey]);
```

**Step 5: Implement createValue**

```javascript
const createValue = useCallback(async (key) => {
  if (!key || values[key]) {
    return false;
  }
  const emptyValue = '{}';
  await setValue(key, emptyValue);
  setSelectedKey(key);
  return true;
}, [values, setValue]);
```

**Step 6: Implement renameKey**

```javascript
const renameKey = useCallback(async (oldKey, newKey) => {
  if (!oldKey || !newKey || oldKey === newKey || values[newKey]) {
    return false;
  }
  const value = values[oldKey];
  await setValue(newKey, value);
  await deleteValue(oldKey);
  setSelectedKey(newKey);
  return true;
}, [values, setValue, deleteValue]);
```

**Step 7: Add useEffect to fetch on mount**

```javascript
useEffect(() => {
  fetchValues();
}, [fetchValues]);
```

**Step 8: Update context value**

Add all new state and actions to the context value object.

**Step 9: Commit**

```bash
git add src/shared/context/ValuesContext.jsx
git commit -m "feat: enhance ValuesContext with API integration

Add fetchValues, createValue, renameKey actions, loading/error states,
and auto-save on setValue changes.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Monaco JSON5 Language Configuration

**Files:**
- Create: `src/features/values/constants.js`

**Step 1: Create language config**

```javascript
export const JSON5_LANGUAGE_ID = 'json5';

// Initialize JSON5 language in Monaco
export function initJson5Language(monaco) {
  // JSON5 is built into Monaco as 'json'
  // We configure it to allow comments and trailing commas
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    allowComments: true,
    trailingCommas: 'ignore',
    validate: true,
  });
}
```

**Step 2: Commit**

```bash
git add src/features/values/constants.js
git commit -m "feat: add JSON5 language configuration for Monaco

Configure JSON diagnostics to allow comments and trailing commas.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create KeysList Component

**Files:**
- Create: `src/features/values/components/KeysList.jsx`

**Step 1: Create component with search and list**

```jsx
import { useState, useMemo } from 'react';
import Input from '../../../shared/ui/Input';

export default function KeysList({ values, selectedKey, onSelectKey, onCreateValue }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKeys = useMemo(() => {
    const keys = Object.keys(values).sort();
    if (!searchQuery) return keys;
    const query = searchQuery.toLowerCase();
    return keys.filter(key => key.toLowerCase().includes(query));
  }, [values, searchQuery]);

  const handleCreate = () => {
    const name = prompt('Enter new value name:');
    if (name && name.trim()) {
      onCreateValue(name.trim());
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-tahoe-border/70">
        <Input
          placeholder="Search values..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
      </div>

      {/* Keys list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredKeys.length === 0 ? (
          <div className="text-center text-tahoe-subtle text-sm py-8">
            {searchQuery ? 'No matching values' : 'No values yet'}
          </div>
        ) : (
          filteredKeys.map(key => (
            <button
              key={key}
              onClick={() => onSelectKey(key)}
              className={`w-full px-3 py-2 rounded-lg border transition-all text-left ${
                selectedKey === key
                  ? 'border-tahoe-accent bg-tahoe-accent/10'
                  : 'border-transparent hover:border-tahoe-border hover:bg-tahoe-hover'
              }`}
            >
              <span className="text-sm font-medium truncate block">{key}</span>
            </button>
          ))
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t border-tahoe-border/70">
        <button
          onClick={handleCreate}
          className="w-full h-9 px-5 rounded-lg font-medium text-sm bg-tahoe-accent text-white hover:opacity-90 transition-all"
        >
          Add New Value
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/features/values/components/KeysList.jsx
git commit -m "feat: add KeysList component

Add searchable key list with add button and selection highlight.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create ValueEditor Component

**Files:**
- Create: `src/features/values/components/ValueEditor.jsx`

**Step 1: Create component with Monaco Editor**

```jsx
import { lazy, Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '../../../shared/context/ThemeContext';
import { initJson5Language, JSON5_LANGUAGE_ID } from '../constants';

const MonacoEditor = lazy(() => import('../../../shared/ui/MonacoEditor').then(m => ({ default: m.default })));

export default function ValueEditor({
  selectedKey,
  value,
  onChange,
  onDelete,
  isSaving,
  error
}) {
  const { isDark } = useTheme();
  const [editorValue, setEditorValue] = useState(value || '');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setEditorValue(value || '{}');
  }, [selectedKey, value]);

  const handleBeforeMount = useCallback((monaco) => {
    initJson5Language(monaco);
  }, []);

  const handleChange = useCallback((newValue) => {
    setEditorValue(newValue);
    // Validate JSON5
    try {
      JSON.parse(newValue);
      setIsValid(true);
      onChange(newValue);
    } catch {
      setIsValid(false);
    }
  }, [onChange]);

  const handleDelete = () => {
    if (selectedKey && onDelete) {
      onDelete(selectedKey);
    }
  };

  const handleRename = () => {
    const newName = prompt('Enter new name:', selectedKey);
    if (newName && newName.trim() && newName.trim() !== selectedKey) {
      // Trigger rename via parent
      window.dispatchEvent(new CustomEvent('values-rename', {
        detail: { oldKey: selectedKey, newKey: newName.trim() }
      }));
    }
  };

  if (!selectedKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-tahoe-subtle">Select a value or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tahoe-border glass-tahoe">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-tahoe-fg">{selectedKey}</h2>
          <button
            onClick={handleRename}
            className="text-xs text-tahoe-subtle hover:text-tahoe-fg transition-colors"
          >
            Rename
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && <span className="text-xs text-tahoe-accent">Saving...</span>}
          {!isSaving && !isValid && <span className="text-xs text-red-500">Invalid JSON</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}

          <button
            onClick={handleDelete}
            className="h-7 px-3 text-xs rounded-md font-medium transition-all bg-red-600 text-white hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="h-full flex items-center justify-center">Loading editor...</div>}>
          <MonacoEditor
            value={editorValue}
            onChange={handleChange}
            language={JSON5_LANGUAGE_ID}
            theme={isDark ? 'tahoe-dark' : 'tahoe-light'}
            beforeMount={handleBeforeMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily: 'SF Mono, Monaco, monospace',
              padding: { top: 16 },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/features/values/components/ValueEditor.jsx
git commit -m "feat: add ValueEditor component with Monaco

Add Monaco Editor for JSON5 values with rename, delete, and validation.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Main Values Component

**Files:**
- Modify: `src/features/values/Values.jsx` (full rewrite)

**Step 1: Create two-column layout**

```jsx
import { useEffect } from 'react';
import { useValues } from '../../shared/context/ValuesContext';
import KeysList from './components/KeysList';
import ValueEditor from './components/ValueEditor';

export default function Values() {
  const {
    values,
    selectedKey,
    selectKey,
    setValue,
    deleteValue,
    createValue,
    renameKey,
    isLoading,
    isSaving,
    error,
  } = useValues();

  const handleValueChange = (newValue) => {
    if (selectedKey) {
      setValue(selectedKey, newValue);
    }
  };

  // Handle rename event from ValueEditor
  useEffect(() => {
    const handler = (e) => {
      const { oldKey, newKey } = e.detail;
      renameKey(oldKey, newKey);
    };
    window.addEventListener('values-rename', handler);
    return () => window.removeEventListener('values-rename', handler);
  }, [renameKey]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-tahoe-subtle">Loading values...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-tahoe-bg text-tahoe-fg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tahoe-border glass-tahoe">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-tahoe-fg">Values</h1>
          <span className="text-xs text-tahoe-subtle">
            ({Object.keys(values).length})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isSaving && <span className="text-xs text-tahoe-accent">Saving...</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex">
        <aside className="w-72 border-r border-tahoe-border bg-tahoe-surface backdrop-blur-md">
          <KeysList
            values={values}
            selectedKey={selectedKey}
            onSelectKey={selectKey}
            onCreateValue={createValue}
          />
        </aside>

        <main className="flex-1 overflow-hidden">
          <ValueEditor
            selectedKey={selectedKey}
            value={selectedKey ? values[selectedKey] : ''}
            onChange={handleValueChange}
            onDelete={deleteValue}
            isSaving={isSaving}
            error={error}
          />
        </main>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/features/values/Values.jsx
git commit -m "feat: implement main Values component

Add two-column layout with KeysList and ValueEditor, loading states,
and auto-save integration.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Keyboard Shortcuts

**Files:**
- Modify: `src/features/values/Values.jsx`

**Step 1: Add keyboard shortcuts**

Add this after the existing useEffect:

```javascript
// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl+N: Create new value
    if (isMod && e.key === 'n' && !e.shiftKey) {
      e.preventDefault();
      const name = prompt('Enter new value name:');
      if (name && name.trim()) {
        createValue(name.trim());
      }
    }

    // Cmd/Ctrl+Shift+R: Rename selected
    if (isMod && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      if (selectedKey) {
        const newName = prompt('Enter new name:', selectedKey);
        if (newName && newName.trim() && newName.trim() !== selectedKey) {
          renameKey(selectedKey, newName.trim());
        }
      }
    }

    // Cmd/Ctrl+D: Delete selected
    if (isMod && e.key === 'd' && !e.shiftKey) {
      e.preventDefault();
      if (selectedKey) {
        deleteValue(selectedKey);
      }
    }

    // Cmd/Ctrl+F: Focus search
    if (isMod && e.key === 'f' && !e.shiftKey) {
      e.preventDefault();
      const searchInput = document.querySelector('input[placeholder*="Search"]');
      if (searchInput) {
        searchInput.focus();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedKey, createValue, renameKey, deleteValue]);
```

**Step 2: Commit**

```bash
git add src/features/values/Values.jsx
git commit -m "feat: add keyboard shortcuts to Values

Add Cmd+N (new), Cmd+Shift+R (rename), Cmd+D (delete), Cmd+F (search).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Help Text Footer

**Files:**
- Modify: `src/features/values/Values.jsx`

**Step 1: Add footer with help text**

Add before the closing `</div>`:

```jsx
{/* Help text */}
<div className="px-4 py-2 border-t border-tahoe-border text-xs text-tahoe-subtle">
  <span className="font-medium">Format:</span> JSON5 (comments allowed, trailing commas allowed)
  <span className="mx-2">•</span>
  <span className="font-medium">Shortcuts:</span> Cmd+N New • Cmd+D Delete • Cmd+F Search
</div>
```

**Step 2: Commit**

```bash
git add src/features/values/Values.jsx
git commit -m "feat: add help text footer to Values

Add keyboard shortcuts reference and format hint.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Verify Build

**Step 1: Build React frontend**

Run: `npm run build:react`
Expected: Build succeeds with no errors

**Step 2: Check for console errors**

Open the app in development mode and check browser console for errors.

**Step 3: Manual testing checklist**

- [ ] Values load on mount
- [ ] Create new value
- [ ] Edit value (auto-saves)
- [ ] Delete value (with confirmation)
- [ ] Search/filter keys
- [ ] Rename key
- [ ] Invalid JSON shows error
- [ ] Keyboard shortcuts work

**Step 4: Final commit**

```bash
git add docs/plans/2026-02-03-values-implementation.md
git commit -m "docs: add Values implementation plan

Complete task-by-task implementation plan for Values feature.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Notes

- **JSON5 Support:** Monaco's built-in JSON language with `allowComments: true` enables JSON5-like behavior
- **Auto-save:** Debounced save happens after 300ms in ValuesContext, showing "Saving..." indicator
- **Styling:** Matches Rules view exactly - same toolbar, borders, glass effects
- **Empty State:** Shows hint message when no values exist
- **Error Handling:** API errors show in toolbar, validation errors show per-field
