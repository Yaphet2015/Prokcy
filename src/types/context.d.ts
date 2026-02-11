/**
 * React Context type definitions
 */

import type { Dispatch, SetStateAction } from 'react';
import type { WhistleRequest, WhistleRule, WhistleValue, WhistleOptions } from './whistle';

// Network Context
export interface NetworkContextValue {
  requests: WhistleRequest[];
  selectedRequest: WhistleRequest | null;
  selectRequest: (request: WhistleRequest | null) => void;
  clearRequests: () => void;
  loading: boolean;
  error: string | null;
}

// Rules Context
export interface RulesContextValue {
  rules: WhistleRule[];
  selectedRuleName: string | null;
  selectedRuleData: string;
  loading: boolean;
  error: string | null;
  selectRule: (name: string) => void;
  updateRuleData: (data: string) => void;
  saveRule: () => Promise<void>;
  createRule: (name: string) => Promise<void>;
  deleteRule: (name: string) => Promise<void>;
  renameRule: (oldName: string, newName: string) => Promise<void>;
}

// Values Context
export interface ValuesContextValue {
  values: WhistleValue[];
  selectedValueKey: string | null;
  selectedValueData: string;
  loading: boolean;
  error: string | null;
  selectValue: (key: string) => void;
  updateValueData: (data: string) => void;
  saveValue: () => Promise<void>;
  createValue: (key: string) => Promise<void>;
  deleteValue: (key: string) => Promise<void>;
}

// Service Context
export interface ServiceContextValue {
  isRunning: boolean;
  port: number;
  options: WhistleOptions;
  toggleService: () => Promise<void>;
  updateOptions: (options: Partial<WhistleOptions>) => Promise<void>;
}

// Theme Context
export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeContextValue {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}
