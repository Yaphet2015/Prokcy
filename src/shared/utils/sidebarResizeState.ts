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
  collapseThreshold: number;
  expandThreshold: number;
  isCollapsed: boolean;
}

export interface SidebarCollapseTransitionResult {
  shouldCollapse: boolean;
  shouldExpand: boolean;
}

export interface SidebarResizeStateParams {
  startX: number;
  startWidth: number;
  currentX: number;
  minWidth: number;
  maxWidth: number;
  collapseThreshold: number;
  expandThreshold: number;
  collapsedWidth: number;
  isCollapsed: boolean;
}

export interface SidebarResizeStateResult {
  isCollapsed: boolean;
  width: number;
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
  collapseThreshold,
  expandThreshold,
  isCollapsed,
}: SidebarCollapseTransition): SidebarCollapseTransitionResult {
  if (!isCollapsed && rawNextWidth < collapseThreshold) {
    return {
      shouldCollapse: true,
      shouldExpand: false,
    };
  }

  if (isCollapsed && rawNextWidth >= expandThreshold) {
    return {
      shouldCollapse: false,
      shouldExpand: true,
    };
  }

  return {
    shouldCollapse: false,
    shouldExpand: false,
  };
}

export function getSidebarResizeState({
  startX,
  startWidth,
  currentX,
  minWidth,
  maxWidth,
  collapseThreshold,
  expandThreshold,
  collapsedWidth,
  isCollapsed,
}: SidebarResizeStateParams): SidebarResizeStateResult {
  const { rawNextWidth, clampedNextWidth } = getSidebarDragMetrics({
    startX,
    startWidth,
    currentX,
    minWidth,
    maxWidth,
  });
  const { shouldCollapse, shouldExpand } = getSidebarCollapseTransition({
    rawNextWidth,
    collapseThreshold,
    expandThreshold,
    isCollapsed,
  });

  if (shouldCollapse) {
    return {
      isCollapsed: true,
      width: collapsedWidth,
    };
  }

  if (shouldExpand) {
    return {
      isCollapsed: false,
      width: clampedNextWidth,
    };
  }

  if (isCollapsed) {
    return {
      isCollapsed: true,
      width: collapsedWidth,
    };
  }

  return {
    isCollapsed: false,
    width: clampedNextWidth,
  };
}
