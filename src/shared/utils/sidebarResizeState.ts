export interface SidebarDragMetrics {
  startX: number;
  startWidth: number;
  currentX: number;
  minWidth: number;
  maxWidth: number;
}

export interface SidebarDragMetricsResult {
  rawNextWidth: number;
  clampedNextWidth: number;
}

export interface SidebarCollapseTransition {
  rawNextWidth: number;
  minWidth: number;
  isCollapsed: boolean;
}

export interface SidebarCollapseTransitionResult {
  shouldCollapse: boolean;
  shouldExpand: boolean;
}

export function getSidebarDragMetrics({
  startX,
  startWidth,
  currentX,
  minWidth,
  maxWidth,
}: SidebarDragMetrics): SidebarDragMetricsResult {
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
}: SidebarCollapseTransition): SidebarCollapseTransitionResult {
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
