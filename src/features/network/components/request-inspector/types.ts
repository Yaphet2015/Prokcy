import type { NormalizedRequest } from '../../../../shared/context/NetworkContext';

// Tab component props
export interface TabProps {
  request: NormalizedRequest | null;
}

// Rule type configuration for visual differentiation
export interface RuleTypeConfig {
  color: string;
  label: string;
}

// Parsed rule value structure
export interface ParsedRuleValue {
  protocol?: string;
  value?: string;
  pattern?: string;
}

// Drag state for resize functionality
export interface DragState {
  startY: number;
  startHeight: number;
}
