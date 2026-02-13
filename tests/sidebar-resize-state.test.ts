import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSidebarDragMetrics,
  getSidebarCollapseTransition,
  getSidebarResizeState,
} from '../src/shared/utils/sidebarResizeState.ts';

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
    collapseThreshold: 170,
    expandThreshold: 220,
    isCollapsed: false,
  });

  const alreadyCollapsed = getSidebarCollapseTransition({
    rawNextWidth: 150,
    collapseThreshold: 170,
    expandThreshold: 220,
    isCollapsed: true,
  });

  assert.deepEqual(shouldCollapse, { shouldCollapse: true, shouldExpand: false });
  assert.deepEqual(alreadyCollapsed, { shouldCollapse: false, shouldExpand: false });
});

test('getSidebarCollapseTransition requests expand when dragging back above min while collapsed', () => {
  const result = getSidebarCollapseTransition({
    rawNextWidth: 220,
    collapseThreshold: 170,
    expandThreshold: 220,
    isCollapsed: true,
  });

  assert.deepEqual(result, { shouldCollapse: false, shouldExpand: true });
});

test('getSidebarCollapseTransition does not toggle around shared boundary when expanded', () => {
  const result = getSidebarCollapseTransition({
    rawNextWidth: 190,
    collapseThreshold: 170,
    expandThreshold: 220,
    isCollapsed: false,
  });

  assert.deepEqual(result, { shouldCollapse: false, shouldExpand: false });
});

test('getSidebarCollapseTransition does not expand until crossing expand threshold', () => {
  const result = getSidebarCollapseTransition({
    rawNextWidth: 210,
    collapseThreshold: 170,
    expandThreshold: 220,
    isCollapsed: true,
  });

  assert.deepEqual(result, { shouldCollapse: false, shouldExpand: false });
});

test('getSidebarResizeState keeps expand trigger stable across repeated collapse/expand in one drag', () => {
  const startX = 100;
  const startWidth = 240;
  let isCollapsed = false;

  const collapse = getSidebarResizeState({
    startX,
    startWidth,
    currentX: 29,
    minWidth: 200,
    maxWidth: 300,
    collapseThreshold: 170,
    expandThreshold: 220,
    collapsedWidth: 56,
    isCollapsed,
  });
  isCollapsed = collapse.isCollapsed;
  assert.equal(collapse.isCollapsed, true);

  const expand1 = getSidebarResizeState({
    startX,
    startWidth,
    currentX: 80,
    minWidth: 200,
    maxWidth: 300,
    collapseThreshold: 170,
    expandThreshold: 220,
    collapsedWidth: 56,
    isCollapsed,
  });
  isCollapsed = expand1.isCollapsed;
  assert.equal(expand1.isCollapsed, false);
  assert.equal(expand1.width, 220);

  const collapseAgain = getSidebarResizeState({
    startX,
    startWidth,
    currentX: 20,
    minWidth: 200,
    maxWidth: 300,
    collapseThreshold: 170,
    expandThreshold: 220,
    collapsedWidth: 56,
    isCollapsed,
  });
  isCollapsed = collapseAgain.isCollapsed;
  assert.equal(collapseAgain.isCollapsed, true);

  const expand2 = getSidebarResizeState({
    startX,
    startWidth,
    currentX: 80,
    minWidth: 200,
    maxWidth: 300,
    collapseThreshold: 170,
    expandThreshold: 220,
    collapsedWidth: 56,
    isCollapsed,
  });
  assert.equal(expand2.isCollapsed, false);
  assert.equal(expand2.width, 220);
});

test('getSidebarResizeState clamps expanded width to max while pointer keeps moving right', () => {
  const expanded = getSidebarResizeState({
    startX: 0,
    startWidth: 240,
    currentX: 300,
    minWidth: 200,
    maxWidth: 300,
    collapseThreshold: 170,
    expandThreshold: 220,
    collapsedWidth: 56,
    isCollapsed: false,
  });

  assert.equal(expanded.isCollapsed, false);
  assert.equal(expanded.width, 300);
});
