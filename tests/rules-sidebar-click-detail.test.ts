import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldToggleGroupSelectionFromClickDetail } from '../src/features/rules/utils/clickDetail.ts';

test('does not toggle on single-click detail', () => {
  assert.equal(shouldToggleGroupSelectionFromClickDetail(1), false);
});

test('toggles on double-click detail', () => {
  assert.equal(shouldToggleGroupSelectionFromClickDetail(2), true);
});

test('does not toggle on triple-click detail', () => {
  assert.equal(shouldToggleGroupSelectionFromClickDetail(3), false);
});
