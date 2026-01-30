import { getBaseUrl, getAuthHeaders } from './config';

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
  return request('/api/values');
}

export async function setValue(key, value) {
  return request('/api/values', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

export async function deleteValue(key) {
  return request(`/api/values/${key}`, {
    method: 'DELETE',
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

export default {
  getNetworkRequests,
  getRequestDetails,
  getRules,
  setRules,
  getValues,
  setValue,
  deleteValue,
  installPlugin,
  checkHealth,
};
