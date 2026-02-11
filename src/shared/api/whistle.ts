import { getBaseUrl, getAuthHeaders } from './config';

interface RuntimeConfig {
  running?: boolean;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
}

interface Settings {
  requestListLimit?: number;
}

interface UpdateSettingsResult {
  success?: boolean;
  message?: string;
  settings?: Settings;
}

// Helper for making API requests
async function request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${getBaseUrl()}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Handle 204 No Content (DELETE operations)
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Whistle API request failed:', error);
    throw error;
  }
}

// Network API
export async function getNetworkRequests(options: NetworkRequestOptions = {}): Promise<unknown> {
  const params = new URLSearchParams(options);
  return request(`/api/requests?${params}`);
}

export async function getRequestDetails(id: string): Promise<unknown> {
  return request(`/api/requests/${id}`);
}

// Rules API
export async function getRules(): Promise<unknown> {
  return request('/api/rules');
}

export async function setRules(rules: string): Promise<unknown> {
  return request('/api/rules', {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });
}

// Values API
export async function getValues(): Promise<Record<string, string>> {
  if (window.electron?.getValues) {
    const result = await window.electron.getValues();
    if (result?.ec && result.ec !== 0) {
      throw new Error(result.message || `API error: ${result.ec}`);
    }
    if (!result || !Array.isArray(result.list)) {
      return {};
    }
    // Transform [{name, data}] => {name: data}
    const values: Record<string, string> = {};
    result.list.forEach((item) => {
      if (item && typeof item.name === 'string') {
        values[item.name] = item.data ?? '';
      }
    });
    return values;
  }

  // Fallback when electron API not available
  return request('/cgi-bin/values/list2');
}

export async function setValue(key: string, value: string): Promise<unknown> {
  if (window.electron?.setValue) {
    const result = await window.electron.setValue(key, String(value));
    if (result?.ec && result.ec !== 0) {
      throw new Error(result.message || `API error: ${result.ec}`);
    }
    return result;
  }
  return request('/cgi-bin/values/add', {
    method: 'POST',
    body: JSON.stringify({ name: key, value: String(value) }),
  });
}

export async function deleteValue(key: string): Promise<unknown> {
  if (window.electron?.deleteValue) {
    const result = await window.electron.deleteValue(key);
    if (result?.ec && result.ec !== 0) {
      throw new Error(result.message || `API error: ${result.ec}`);
    }
    return result;
  }
  return request('/cgi-bin/values/remove', {
    method: 'POST',
    body: JSON.stringify({ name: key }),
  });
}

// Plugin API (for future use)
export async function installPlugin(name: string, options: Record<string, unknown> = {}): Promise<unknown> {
  return request('/api/plugins/install', {
    method: 'POST',
    body: JSON.stringify({ name, ...options }),
  });
}

// Health check
export async function checkHealth(): Promise<boolean> {
  try {
    await request('/api/health');
    return true;
  } catch {
    return false;
  }
}

// Types for request options
interface NetworkRequestOptions {
  startTime?: string;
  ids?: string;
  count?: number;
}
