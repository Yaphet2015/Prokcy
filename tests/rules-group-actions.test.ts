import test from 'node:test';
import assert from 'node:assert/strict';

import { getNextSelectionStateFromGroup } from '../src/features/rules/hooks/useRuleGroupActions.ts';

test('double-click enables a disabled group', () => {
  assert.equal(getNextSelectionStateFromGroup({ name: 'Group A', selected: false }), true);
});

test('double-click disables an enabled group', () => {
  assert.equal(getNextSelectionStateFromGroup({ name: 'Group A', selected: true }), false);
});

test('double-click enables when selected flag is missing', () => {
  assert.equal(getNextSelectionStateFromGroup({ name: 'Group A' }), true);
});
