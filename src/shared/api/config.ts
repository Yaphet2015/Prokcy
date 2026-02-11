// Default Whistle proxy configuration
export interface ProxyConfig {
  host: string;
  port: string;
}

export const DEFAULT_CONFIG: ProxyConfig = {
  host: 'localhost',
  port: '8888',
};

let currentConfig: ProxyConfig = { ...DEFAULT_CONFIG };

export function setConfig(config: Partial<ProxyConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

export function getConfig(): ProxyConfig {
  return currentConfig;
}

export function getBaseUrl(): string {
  const { host, port } = currentConfig;
  return `http://${host}:${port}`;
}

// Get auth headers if configured
export interface AuthHeaders {
  Authorization?: string;
}

export function getAuthHeaders(): AuthHeaders {
  const { username, password } = currentConfig;
  if (username && password) {
    const credentials = btoa(`${username}:${password}`);
    return { Authorization: `Basic ${credentials}` };
  }
  return {};
}
