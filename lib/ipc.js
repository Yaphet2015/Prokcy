const { ipcMain, nativeTheme } = require('electron');
const http = require('http');

let mainWindow = null;
let currentRules = null;

const getRuntimeConfig = () => {
  const { getOptions } = require('./context');
  const { getSettings } = require('./settings');

  const options = getOptions() || {};
  const settings = getSettings() || {};
  const uiAuth = settings.uiAuth || {};

  return {
    host: options.host || settings.host || '127.0.0.1',
    port: options.port || settings.port || '8888',
    username: options.username || uiAuth.username || '',
    password: options.password || uiAuth.password || '',
  };
};

const requestWhistleApi = ({
  host,
  port,
  username,
  password,
  method = 'GET',
  path,
  body,
  timeout = 8000,
}) => {
  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'identity',
  };
  const payload = body == null ? '' : JSON.stringify(body);
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }
  if (username || password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Whistle API error: ${res.statusCode}`));
          }
          if (!text) {
            return resolve(null);
          }
          try {
            resolve(JSON.parse(text));
          } catch (error) {
            reject(new Error('Failed to parse Whistle API response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error('Whistle API timeout'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

function initIpc(win) {
  mainWindow = win;

  // Send current theme on request
  ipcMain.handle('get-theme', () => {
    try {
      return {
        isDark: nativeTheme.shouldUseDarkColors,
      };
    } catch (error) {
      console.error('Failed to get theme:', error);
      return { isDark: false }; // Fallback
    }
  });

  // Get current rules
  ipcMain.handle('get-rules', () => currentRules);

  // Set rules content
  ipcMain.handle('set-rules', async (event, payload) => {
    const { getChild } = require('./context');
    const child = getChild();
    if (child) {
      const content = typeof payload === 'string' ? payload : payload?.content;
      const name = typeof payload === 'object' ? payload?.name : undefined;
      child.postMessage({
        type: 'setRulesContent',
        content,
        name,
      });
    }
    return { success: true };
  });

  // Enable/disable all rules
  ipcMain.handle('set-rules-enabled', async (event, enabled) => {
    const { getChild } = require('./context');
    const child = getChild();
    if (child) {
      child.postMessage({
        type: enabled ? 'enableAllRules' : 'disableAllRules',
      });
    }
    return { success: true };
  });

  // Select/unselect a single rules group
  ipcMain.handle('set-rule-selection', async (event, payload = {}) => {
    const { getChild } = require('./context');
    const child = getChild();
    const name = typeof payload.name === 'string' ? payload.name : '';
    if (!child || !name) {
      return { success: false };
    }
    child.postMessage({
      type: payload.selected ? 'selectRules' : 'unselectRules',
      name,
    });
    return { success: true };
  });

  // Get service status
  ipcMain.handle('get-service-status', () => {
    const { isRunning } = require('./context');
    return { running: isRunning() };
  });

  // Get runtime proxy config for renderer API calls
  ipcMain.handle('get-runtime-config', () => {
    const { isRunning } = require('./context');
    const config = getRuntimeConfig();

    return {
      running: isRunning(),
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    };
  });

  ipcMain.handle('get-settings', () => {
    const { getSettings } = require('./settings');
    const { getPreferences } = require('./preferences');
    return {
      ...getSettings(),
      ...getPreferences(),
    };
  });

  ipcMain.handle('update-settings', async (event, payload = {}) => {
    const proxy = payload.proxy && typeof payload.proxy === 'object'
      ? payload.proxy
      : null;
    const preferences = payload.preferences && typeof payload.preferences === 'object'
      ? payload.preferences
      : {};

    if (!proxy) {
      return { success: false, message: 'Missing proxy settings' };
    }

    const { applySettings, getSettings } = require('./settings');
    const result = await applySettings(proxy, { hideOnSuccess: false, showErrorToast: false });
    if (!result || !result.success) {
      return result || { success: false, message: 'Failed to apply settings' };
    }

    const {
      setStartAtLogin,
      setHideFromDock,
      applyThemeMode,
      getPreferences,
    } = require('./preferences');

    if (Object.prototype.hasOwnProperty.call(preferences, 'startAtLogin')) {
      setStartAtLogin(preferences.startAtLogin);
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'hideFromDock')) {
      setHideFromDock(preferences.hideFromDock);
    }
    if (Object.prototype.hasOwnProperty.call(preferences, 'themeMode')) {
      applyThemeMode(preferences.themeMode);
    }

    return {
      ...result,
      settings: {
        ...getSettings(),
        ...getPreferences(),
      },
    };
  });

  // Fetch network data from Whistle via main process (avoids renderer CORS limits)
  ipcMain.handle('get-network-data', async (event, query = {}) => {
    const { isRunning } = require('./context');

    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }

    const config = getRuntimeConfig();

    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    return requestWhistleApi({
      ...config,
      method: 'GET',
      path: `/cgi-bin/get-data?${search.toString()}`,
    });
  });

  ipcMain.handle('get-values', async () => {
    const { isRunning } = require('./context');
    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }
    return requestWhistleApi({
      ...getRuntimeConfig(),
      method: 'GET',
      path: '/cgi-bin/values/list2',
    });
  });

  ipcMain.handle('set-value', async (event, payload = {}) => {
    const { isRunning } = require('./context');
    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }
    return requestWhistleApi({
      ...getRuntimeConfig(),
      method: 'POST',
      path: '/cgi-bin/values/add',
      body: {
        name: payload.name,
        value: String(payload.value ?? ''),
      },
    });
  });

  ipcMain.handle('delete-value', async (event, payload = {}) => {
    const { isRunning } = require('./context');
    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }
    return requestWhistleApi({
      ...getRuntimeConfig(),
      method: 'POST',
      path: '/cgi-bin/values/remove',
      body: {
        name: payload.name,
      },
    });
  });

  // Start whistle service
  ipcMain.handle('start-service', async () => {
    const { isRunning } = require('./context');
    if (isRunning()) {
      return { success: false, message: 'Service already running' };
    }
    const forkWhistle = require('./fork');
    forkWhistle();
    return { success: true };
  });

  // Stop whistle service
  ipcMain.handle('stop-service', async () => {
    const { isRunning, getChild } = require('./context');
    if (!isRunning()) {
      return { success: false, message: 'Service not running' };
    }
    const child = getChild();
    if (child) {
      child.kill();
    }
    const { setChild, setRunning } = require('./context');
    setChild(null);
    setRunning(false);
    notifyServiceStatus({ running: false });
    return { success: true };
  });

  // Notify renderer when theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', {
        isDark: nativeTheme.shouldUseDarkColors,
      });
    }
  });
}

// Update rules from Whistle utility process
function updateRules(rules) {
  currentRules = rules;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rules-updated', rules);
  }
}

// Notify renderer of service status changes
function notifyServiceStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('service-status-changed', status);
  }
}

module.exports = { initIpc, updateRules, notifyServiceStatus };
