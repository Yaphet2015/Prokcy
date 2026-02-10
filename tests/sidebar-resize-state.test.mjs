import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSidebarDragMetrics,
  getSidebarCollapseTransition,
} from '../src/shared/utils/sidebarResizeState.mjs';

test('getSidebarDragMetrics returns raw and clamped widths from drag delta', () => {
  const result = getSidebarDragMetrics({
    startX: 300,
    startWidth: 240,
    currentX: 100,
    minWidth: 200,
    maxWidth: 360,
  });

  assert.equal(result.rawNextWidth, 40);
  assert.equal(result.clampedNextWidth, 200);
});

test('getSidebarCollapseTransition requests collapse only when dragging below min from expanded', () => {
  const shouldCollapse = getSidebarCollapseTransition({
    rawNextWidth: 150,
    minWidth: 200,
    isCollapsed: false,
  });

  const alreadyCollapsed = getSidebarCollapseTransition({
    rawNextWidth: 150,
    minWidth: 200,
    isCollapsed: true,
  });

  assert.deepEqual(shouldCollapse, { shouldCollapse: true, shouldExpand: false });
  assert.deepEqual(alreadyCollapsed, { shouldCollapse: false, shouldExpand: false });
});

test('getSidebarCollapseTransition requests expand when dragging back above min while collapsed', () => {
  const result = getSidebarCollapseTransition({
    rawNextWidth: 220,
    minWidth: 200,
    isCollapsed: true,
  });

  assert.deepEqual(result, { shouldCollapse: false, shouldExpand: true });
});
