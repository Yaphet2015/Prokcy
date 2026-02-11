/**
 * Whistle API type definitions
 */

// Whistle Rule structure
export interface WhistleRule {
  name: string;
  data: string;
  selected?: boolean;
  // Client-side computed properties
  isOpen?: boolean;
}

// Whistle Value structure
export interface WhistleValue {
  key: string;
  value: string;
  selected?: boolean;
}

// Whistle Network Request structure
export interface WhistleRequest {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  statusMessage?: string;
  startTime: number;
  endTime: number;
  duration?: number;
  size: number;
  reqHeaders: Record<string, string>;
  resHeaders: Record<string, string>;
  reqBody?: string;
  resBody?: string;
  style?: string; // Custom styling from 'style' protocol
  // Additional properties
  protocol?: string;
  host?: string;
  path?: string;
  isHttps?: boolean;
  // Whistle-specific properties
  rules?: string[];
  _clientId?: string;
}

// Whistle API response types
export interface WhistleRulesResponse {
  data?: WhistleRule[];
  selected?: string;
}

export interface WhistleValuesResponse {
  data?: WhistleValue[];
  selected?: string;
}

export interface WhistleRequestsResponse {
  data?: WhistleRequest[];
}

export interface WhistleComposeResponse {
  curData?: WhistleRequest;
  list?: WhistleRequest[];
}

// Whistle option types
export interface WhistleOptions {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  selectedRules?: string;
  selectedValues?: string;
  // Add other Whistle options as needed
}

// Sidebar resize state types
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
