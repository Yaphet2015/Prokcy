import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSidebarDragMetrics,
  getSidebarCollapseTransition,
  getSidebarWidthTransitionClass,
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
    collapseThreshold: 70,
    expandThreshold: 166,
    isCollapsed: false,
  });

  const alreadyCollapsed = getSidebarCollapseTransition({
    rawNextWidth: 150,
    collapseThreshold: 70,
    expandThreshold: 166,
    isCollapsed: true,
  });

  assert.deepEqual(shouldCollapse, { shouldCollapse: true, shouldExpand: false });
  assert.deepEqual(alreadyCollapsed, { shouldCollapse: false, shouldExpand: false });
});

test('getSidebarCollapseTransition requests expand when dragging back above min while collapsed', () => {
  const result = getSidebarCollapseTransition({
    rawNextWidth: 166,
    collapseThreshold: 70,
    expandThreshold: 166,
    isCollapsed: true,
  });

  assert.deepEqual(result, { shouldCollapse: false, shouldExpand: true });
});

test('getSidebarCollapseTransition does not toggle around shared boundary when expanded', () => {
  const result = getSidebarCollapseTransition({
    rawNextWidth: 190,
    collapseThreshold: 70,
    expandThreshold: 166,
    isCollapsed: false,
  });

  assert.deepEqual(result, { shouldCollapse: false, shouldExpand: false });
});

test('getSidebarCollapseTransition does not expand until crossing expand threshold', () => {
  const result = getSidebarCollapseTransition({
    rawNextWidth: 210,
    collapseThreshold: 70,
    expandThreshold: 166,
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
    collapseThreshold: 70,
    expandThreshold: 166,
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
    collapseThreshold: 70,
    expandThreshold: 166,
    collapsedWidth: 56,
    isCollapsed,
  });
  isCollapsed = expand1.isCollapsed;
  assert.equal(expand1.isCollapsed, false);
  assert.equal(expand1.width, 166);

  const collapseAgain = getSidebarResizeState({
    startX,
    startWidth,
    currentX: 20,
    minWidth: 200,
    maxWidth: 300,
    collapseThreshold: 70,
    expandThreshold: 166,
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
    collapseThreshold: 70,
    expandThreshold: 166,
    collapsedWidth: 56,
    isCollapsed,
  });
  assert.equal(expand2.isCollapsed, false);
  assert.equal(expand2.width, 166);
});

test('getSidebarResizeState clamps expanded width to max while pointer keeps moving right', () => {
  const expanded = getSidebarResizeState({
    startX: 0,
    startWidth: 240,
    currentX: 300,
    minWidth: 200,
    maxWidth: 300,
    collapseThreshold: 70,
    expandThreshold: 166,
    collapsedWidth: 56,
    isCollapsed: false,
  });

  assert.equal(expanded.isCollapsed, false);
  assert.equal(expanded.width, 300);
});

test('getSidebarWidthTransitionClass uses ease-out with no delay when collapsing', () => {
  const easing = getSidebarWidthTransitionClass({
    previousIsCollapsed: false,
    isCollapsed: true,
  });

  assert.equal(easing, 'transition-[width] ease-out delay-0 duration-50');
});

test('getSidebarWidthTransitionClass uses ease-in with 150ms delay when expanding', () => {
  const easing = getSidebarWidthTransitionClass({
    previousIsCollapsed: true,
    isCollapsed: false,
  });

  assert.equal(easing, 'transition-[width] ease-in delay-150 duration-50');
});

test('getSidebarWidthTransitionClass disables transition when collapse state is unchanged', () => {
  const easing = getSidebarWidthTransitionClass({
    previousIsCollapsed: false,
    isCollapsed: false,
  });

  assert.equal(easing, 'transition-none');
});
