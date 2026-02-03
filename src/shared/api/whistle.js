import { getBaseUrl, getAuthHeaders } from './config';

function getElectronApi() {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron;
  }
  return null;
}

// Helper for making API requests
async function request(endpoint, options = {}) {
  const url = `${getBaseUrl()}${endpoint}`;
  const headers = {
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
export async function getNetworkRequests(options = {}) {
  const params = new URLSearchParams(options);
  return request(`/api/requests?${params}`);
}

export async function getRequestDetails(id) {
  return request(`/api/requests/${id}`);
}

// Rules API
export async function getRules() {
  return request('/api/rules');
}

export async function setRules(rules) {
  return request('/api/rules', {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });
}

// Values API
export async function getValues() {
  const electronApi = getElectronApi();
  const result = electronApi?.getValues
    ? await electronApi.getValues()
    : await request('/cgi-bin/values/list2');
  if (result?.ec && result.ec !== 0) {
    throw new Error(result.message || `API error: ${result.ec}`);
  }
  if (!result || !Array.isArray(result.list)) {
    return {};
  }
  // Transform [{name, data}] => {name: data}
  const values = {};
  result.list.forEach(item => {
    if (item && typeof item.name === 'string') {
      values[item.name] = item.data || '';
    }
  });
  return values;
}

export async function setValue(key, value) {
  const electronApi = getElectronApi();
  if (electronApi?.setValue) {
    const result = await electronApi.setValue(key, String(value));
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

export async function deleteValue(key) {
  const electronApi = getElectronApi();
  if (electronApi?.deleteValue) {
    const result = await electronApi.deleteValue(key);
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
export async function installPlugin(name, options = {}) {
  return request('/api/plugins/install', {
    method: 'POST',
    body: JSON.stringify({ name, ...options }),
  });
}

// Health check
export async function checkHealth() {
  try {
    await request('/api/health');
    return true;
  } catch {
    return false;
  }
}
