// Shared type definitions

export interface ProxySettings {
  host: string;
  port: number;
  username?: string;
  password?: string;
  socksPort?: number;
  maxHttpHeaderSize?: number;
  autoSetProxy?: boolean;
}

export interface Preferences {
  startAtLogin?: boolean;
  hideFromDock?: boolean;
  themeMode?: 'light' | 'dark' | 'auto';
  requestFilters?: string[];
  rulesOrder?: string[];
  enableMultipleRules?: boolean;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  startTime: number;
  endTime: number;
  phases: {
    dns?: number;
    tcp?: number;
    tls?: number;
    ttfb?: number;
    download?: number;
  };
}

export interface RulesGroup {
  name: string;
  content: string;
  selected: boolean;
}

export interface ValueEntry {
  name: string;
  value: string;
}

export interface ServiceStatus {
  running: boolean;
}

export interface IpcResponse<T = unknown> {
  success?: boolean;
  ec?: number;
  message?: string;
  data?: T;
}
