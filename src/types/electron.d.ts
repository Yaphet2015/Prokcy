/**
 * Electron IPC type definitions
 *
 * These types match the API exposed in electron-preload.js
 */

// ============= Common Types =============

interface ServiceStatusResult {
  running?: boolean;
}

interface ServiceOperationResult {
  success?: boolean;
  message?: string;
}

interface RulesDataResponse {
  disabled?: boolean;
  list?: Array<{ name: string; data: string; selected: boolean }>;
}

interface RuntimeConfig {
  running?: boolean;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
}

interface SettingsForm {
  port: string;
  socksPort: string;
  host: string;
  username: string;
  password: string;
  bypass: string;
  useDefaultStorage: boolean;
  maxHttpHeaderSize: string;
  requestListLimit: string;
  startAtLogin: boolean;
  hideFromDock: boolean;
  themeMode: string;
  requestFilters: string;
}

interface ProxyPayload {
  port: string;
  socksPort: string;
  host: string;
  username: string;
  password: string;
  bypass: string;
  useDefaultStorage: boolean;
  maxHttpHeaderSize: string;
  requestListLimit: number;
}

interface PreferencesPayload {
  startAtLogin: boolean;
  hideFromDock: boolean;
  themeMode: string;
  requestFilters: string;
}

interface SettingsPayload {
  proxy: ProxyPayload;
  preferences: PreferencesPayload;
}

interface SettingsResponse {
  success?: boolean;
  message?: string;
  settings?: SettingsForm;
}

// ============= Window Controls API =============

interface WindowControlsAPI {
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  isWindowMaximized(): Promise<boolean>;
  onWindowMaximizeChanged(callback: (isMaximized: boolean) => void): () => void;
}

// ============= Theme API =============

interface ThemeAPI {
  getTheme(): Promise<{ isDark?: boolean }>;
  onThemeChanged(callback: (theme: { isDark?: boolean }) => void): () => void;
}

// ============= Settings API =============

interface SettingsAPI {
  getSettings(): Promise<SettingsForm>;
  updateSettings(payload: SettingsPayload): Promise<SettingsResponse>;
}

// ============= Rules API =============

interface RulesAPI {
  getRules(): Promise<string | RulesDataResponse>;
  getRulesOrder(): Promise<string[]>;
  setRulesOrder(order: string[]): Promise<void>;
  setRules(content: string, name: string): Promise<void>;
  setRulesEnabled(enabled: boolean): Promise<void>;
  setRuleSelection(name: string, selected: boolean): Promise<void>;
  createRulesGroup(name: string, content: string): Promise<void>;
  deleteRulesGroup(name: string): Promise<void>;
  renameRulesGroup(name: string, newName: string): Promise<void>;
  reorderRulesGroups(names: string[]): Promise<void>;
  onRulesUpdated(callback: (rules: string | RulesDataResponse) => void): () => void;
}

// ============= Service API =============

interface ServiceAPI {
  getServiceStatus(): Promise<ServiceStatusResult>;
  getRuntimeConfig(): Promise<RuntimeConfig>;
  getNetworkData(query: Record<string, string>): Promise<unknown>;
  startService(): Promise<ServiceOperationResult>;
  stopService(): Promise<ServiceOperationResult>;
  onServiceStatusChanged(callback: (status: ServiceStatusResult) => void): () => void;
}

// ============= Values API =============

interface ValuesAPI {
  getValues(): Promise<Record<string, string>>;
  setValue(name: string, value: string): Promise<void>;
  deleteValue(name: string): Promise<void>;
}

// ============= Complete Electron API =============
/**
 * The complete API exposed via contextBridge in electron-preload.js
 */
export interface ElectronAPI extends
  WindowControlsAPI,
  ThemeAPI,
  SettingsAPI,
  RulesAPI,
  ServiceAPI,
  ValuesAPI {}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

// For backward compatibility - re-export deprecated types
export type IpcMessageType =
  | 'options'
  | 'rules'
  | 'values'
  | 'selectedRules'
  | 'selectedValues'
  | 'network'
  | 'getRules'
  | 'getValues'
  | 'selectRules'
  | 'selectValues'
  | 'setRules'
  | 'setValues'
  | 'getOptions';

export interface IpcMessage {
  type: IpcMessageType;
  [key: string]: unknown;
}

export {};
