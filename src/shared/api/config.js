// Default Whistle proxy configuration
export const DEFAULT_CONFIG = {
  host: 'localhost',
  port: 8888,
};

let currentConfig = { ...DEFAULT_CONFIG };

export function setConfig(config) {
  currentConfig = { ...currentConfig, ...config };
}

export function getConfig() {
  return currentConfig;
}

export function getBaseUrl() {
  const { host, port } = currentConfig;
  return `http://${host}:${port}`;
}

// Get auth headers if configured
export function getAuthHeaders() {
  const { username, password } = currentConfig;
  if (username && password) {
    const credentials = btoa(`${username}:${password}`);
  return { Authorization: `Basic ${credentials}` };
  }
  return {};
}
