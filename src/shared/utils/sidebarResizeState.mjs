export function getSidebarDragMetrics({
  startX,
  startWidth,
  currentX,
  minWidth,
  maxWidth,
}) {
  const deltaX = currentX - startX;
  const rawNextWidth = startWidth + deltaX;
  const clampedNextWidth = Math.min(maxWidth, Math.max(minWidth, rawNextWidth));

  return {
    rawNextWidth,
    clampedNextWidth,
  };
}

export function getSidebarCollapseTransition({
  rawNextWidth,
  minWidth,
  isCollapsed,
}) {
  if (rawNextWidth < minWidth) {
    return {
      shouldCollapse: !isCollapsed,
      shouldExpand: false,
    };
  }

  return {
    shouldCollapse: false,
    shouldExpand: isCollapsed,
  };
}
