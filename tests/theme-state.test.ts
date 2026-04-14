import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyDocumentThemeClass,
  getInitialIsDark,
} from '../src/shared/context/theme-state.ts';

test('getInitialIsDark prefers the synchronous initial theme exposed by Electron', () => {
  assert.equal(getInitialIsDark({
    initialTheme: { isDark: true },
  }), true);
});

test('getInitialIsDark falls back to light mode when Electron does not expose an initial theme', () => {
  assert.equal(getInitialIsDark(undefined), false);
  assert.equal(getInitialIsDark({}), false);
});

test('applyDocumentThemeClass synchronizes the root dark class without waiting for effects', () => {
  const calls: string[] = [];
  const root = {
    classList: {
      add: (name: string) => calls.push(`add:${name}`),
      remove: (name: string) => calls.push(`remove:${name}`),
    },
  };

  applyDocumentThemeClass(root as any, true);
  applyDocumentThemeClass(root as any, false);

  assert.deepEqual(calls, ['add:dark', 'remove:dark']);
});
