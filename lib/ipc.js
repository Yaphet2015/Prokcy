const { ipcMain, nativeTheme } = require('electron');
const http = require('http');

let mainWindow = null;
let currentRules = null;
const serviceStatusCallbacks = [];

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

  // Toggle multiple-choice mode for rules selection behavior
  ipcMain.handle('set-rules-allow-multiple-choice', async (event, enabled) => {
    const { getChild } = require('./context');
    const child = getChild();
    if (!child) {
      return { success: false };
    }
    child.postMessage({
      type: 'setAllowMultipleChoice',
      enabled: !!enabled,
    });
    return { success: true };
  });

  // Enable/disable reverse rules priority mode
  ipcMain.handle('set-rules-back-rules-first', async (event, enabled) => {
    const { getChild } = require('./context');
    const child = getChild();
    if (!child) {
      return { success: false };
    }
    child.postMessage({
      type: 'setBackRulesFirst',
      enabled: !!enabled,
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
    const { isRunning, getOptions } = require('./context');
    const { getSettings } = require('./settings');

    const options = getOptions() || {};
    const settings = getSettings() || {};
    const uiAuth = settings.uiAuth || {};

    return {
      running: isRunning(),
      host: options.host || settings.host || '127.0.0.1',
      port: options.port || settings.port || '8888',
      username: options.username || uiAuth.username || '',
      password: options.password || uiAuth.password || '',
    };
  });

  // Fetch network data from Whistle via main process (avoids renderer CORS limits)
  ipcMain.handle('get-network-data', async (event, query = {}) => {
    const { isRunning, getOptions } = require('./context');
    const { getSettings } = require('./settings');

    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }

    const options = getOptions() || {};
    const settings = getSettings() || {};
    const uiAuth = settings.uiAuth || {};
    const host = options.host || settings.host || '127.0.0.1';
    const port = options.port || settings.port || '8888';
    const username = options.username || uiAuth.username || '';
    const password = options.password || uiAuth.password || '';

    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    const path = `/cgi-bin/get-data?${search.toString()}`;

    const headers = {
      Accept: 'application/json',
      'Accept-Encoding': 'identity',
    };
    if (username || password) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    return new Promise((resolve, reject) => {
      const req = http.get({
        host, port, path, headers,
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Network API error: ${res.statusCode}`));
          }
          try {
            resolve(JSON.parse(body || '{}'));
          } catch (err) {
            reject(new Error('Failed to parse network API response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(8000, () => {
        req.destroy(new Error('Network API timeout'));
      });
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
