import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getInitialSidebarCollapsed,
  normalizeSidebarDefaultCollapsed,
} from '../src/shared/utils/sidebarDefaultState.ts';

test('sidebar default collapsed preference is opt-in', () => {
  assert.equal(normalizeSidebarDefaultCollapsed(true), true);
  assert.equal(normalizeSidebarDefaultCollapsed(false), false);
  assert.equal(normalizeSidebarDefaultCollapsed(undefined), false);
  assert.equal(normalizeSidebarDefaultCollapsed('true'), false);
});

test('initial sidebar state reads the saved default collapsed preference', () => {
  assert.equal(getInitialSidebarCollapsed({ sidebarDefaultCollapsed: true }), true);
  assert.equal(getInitialSidebarCollapsed({ sidebarDefaultCollapsed: false }), false);
  assert.equal(getInitialSidebarCollapsed({}), false);
  assert.equal(getInitialSidebarCollapsed(undefined), false);
});
