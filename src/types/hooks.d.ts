/**
 * Custom React Hook type definitions
 */

// Sidebar resize state hook
export interface UseSidebarResizeResult {
  isCollapsed: boolean;
  isResizing: boolean;
  width: number;
  toggleCollapse: () => void;
  startResize: (event: React.MouseEvent) => void;
}

// Virtual list hook
export interface UseVirtualListResult<T> {
  visibleItems: T[];
  totalHeight: number;
  offsetY: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

// Rule group drag and drop hook
export interface UseRuleGroupDragDropResult {
  handleDragStart: (index: number) => void;
  handleDragOver: (index: number) => void;
  handleDragEnd: () => void;
  draggedIndex: number | null;
  dropTargetIndex: number | null;
}

// Rule group actions hook
export interface RuleGroupActions {
  toggleExpand: (name: string) => void;
  select: (name: string) => void;
  create: (name: string) => Promise<void>;
  rename: (oldName: string, newName: string) => Promise<void>;
  delete: (name: string) => Promise<void>;
  duplicate: (name: string) => Promise<void>;
}

// Network inspector hook
export interface UseNetworkInspectorResult {
  request: WhistleRequest | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

import type { WhistleRequest } from './whistle';
