import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import http from 'http';
import { toggleMaximize, bindMaximizeStateEvents } from './window-controls';
import {
  getOptions,
  getChild,
  isServiceRunning,
} from './context';
import { getSettings, applySettings, type ProxySettings } from './settings';
import {
  getPreferences,
  setRulesOrder,
  getRulesOrder,
  setStartAtLogin,
  setHideFromDock,
  applyThemeMode,
  setRequestFilters,
  type PreferencesData,
} from './preferences';
import { enableProxy, disableProxy, isEnabled, type ProxyOptions } from './proxy';
import storage from './storage';
import { refreshProxyStatus, refreshTheme } from './menu';
import {
  checkForUpdates,
  getUpdateStatus,
  installDownloadedUpdate,
  onUpdateStatusChanged,
} from './updater';
import type { IpcRequest, NetworkQuery } from './types/electron';

// Module state
let mainWindow: BrowserWindow | null = null;
let currentRules: unknown = null;
let unsubscribeUpdateStatus: (() => void) | null = null;

const DEFAULT_REQUEST_LIST_LIMIT = 500;

/**
 * Get runtime configuration for Whistle API requests
 * Combines options from context with settings from storage
 *
 * @returns Runtime configuration with host, port, and credentials
 */
const getRuntimeConfig = (): {
  host: string;
  port: string;
  username: string;
  password: string;
} => {
  const options = (getOptions() as { host?: string; port?: string; username?: string; password?: string } | null) || {};
  const settings = getSettings() || {};
  const uiAuth = (settings.uiAuth as { username?: string; password?: string } | undefined) || {};

  return {
    host: options.host || settings.host || '127.0.0.1',
    port: String(options.port || settings.port || '8888'),
    username: options.username || uiAuth.username || '',
    password: options.password || uiAuth.password || '',
  };
};

/**
 * Make an HTTP request to the Whistle API
 *
 * @param config - Request configuration
 * @param config.host - Whistle server host
 * @param config.port - Whistle server port
 * @param config.username - Basic auth username
 * @param config.password - Basic auth password
 * @param config.method - HTTP method (default: 'GET')
 * @param config.path - Request path
 * @param config.body - Request body for POST requests
 * @param config.timeout - Request timeout in ms (default: 8000)
 *
 * @returns Promise that resolves with parsed JSON response
 *
 * @throws Error if request fails, times out, or response is invalid JSON
 */
const requestWhistleApi = ({
  host,
  port,
  username,
  password,
  method = 'GET',
  path,
  body,
  timeout = 8000,
}: IpcRequest): Promise<unknown> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'identity',
  };

  const payload = body == null ? '' : JSON.stringify(body);
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(payload));
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
        res.on('data', (chunk: string) => {
          text += chunk;
        });
        res.on('end', () => {
          const statusCode = res.statusCode ?? 0;
          if (statusCode < 200 || statusCode >= 300) {
            return reject(new Error(`Whistle API error: ${statusCode}`));
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

/**
 * Initialize all IPC handlers for the application
 * Sets up communication between main and renderer processes
 *
 * @param win - The main browser window
 */
function initIpc(win: BrowserWindow): void {
  mainWindow = win;

  if (unsubscribeUpdateStatus) {
    unsubscribeUpdateStatus();
  }
  unsubscribeUpdateStatus = onUpdateStatusChanged((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status-changed', status);
    }
  });

  // Bind maximize state events and notify renderer
  bindMaximizeStateEvents(mainWindow, (isMaximized: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximize-changed', isMaximized);
    }
  });

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

  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('window:toggle-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      toggleMaximize(mainWindow);
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('window:is-maximized', () => (
    !!(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized())
  ));

  // Get current rules
  ipcMain.handle('get-rules', () => currentRules);

  // Get persisted rules order (UI order, includes Default)
  ipcMain.handle('get-rules-order', () => {
    return getRulesOrder();
  });

  // Persist rules order (UI order, includes Default)
  ipcMain.handle('set-rules-order', (_event, payload: { order?: string[] } = {}) => {
    return setRulesOrder(payload.order);
  });

  // Set rules content
  ipcMain.handle('set-rules', async (_event, payload: string | { content?: string; name?: string }) => {
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
  ipcMain.handle('set-rules-enabled', async (_event, enabled: boolean) => {
    const child = getChild();
    if (child) {
      child.postMessage({
        type: enabled ? 'enableAllRules' : 'disableAllRules',
      });
    }
    return { success: true };
  });

  // Select/unselect a single rules group
  ipcMain.handle(
    'set-rule-selection',
    async (_event, payload: { name?: string; selected?: boolean } = {}) => {
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
    },
  );

  // Create a new rules group
  ipcMain.handle(
    'create-rules-group',
    async (_event, payload: { name?: string; content?: string } = {}) => {
      const child = getChild();
      if (!child) {
        return { success: false, message: 'Service not running' };
      }
      child.postMessage({
        type: 'createRulesGroup',
        name: payload.name,
        content: payload.content,
      });
      return { success: true };
    },
  );

  // Delete a rules group
  ipcMain.handle('delete-rules-group', async (_event, payload: { name?: string } = {}) => {
    const child = getChild();
    if (!child) {
      return { success: false, message: 'Service not running' };
    }
    child.postMessage({
      type: 'deleteRulesGroup',
      name: payload.name,
    });
    return { success: true };
  });

  // Rename a rules group
  ipcMain.handle(
    'rename-rules-group',
    async (_event, payload: { name?: string; newName?: string } = {}) => {
      const child = getChild();
      if (!child) {
        return { success: false, message: 'Service not running' };
      }
      child.postMessage({
        type: 'renameRulesGroup',
        name: payload.name,
        newName: payload.newName,
      });
      return { success: true };
    },
  );

  // Reorder rules groups
  ipcMain.handle('reorder-rules-groups', async (_event, payload: { names?: string[] } = {}) => {
    const child = getChild();
    if (!child) {
      return { success: false, message: 'Service not running' };
    }
    const names = Array.isArray(payload.names) ? payload.names : [];
    child.postMessage({
      type: 'reorderRulesGroups',
      names,
    });
    return { success: true };
  });

  // Get service status
  ipcMain.handle('get-service-status', () => {
    return { running: isServiceRunning() };
  });

  // Get runtime proxy config for renderer API calls
  ipcMain.handle('get-runtime-config', () => {
    const config = getRuntimeConfig();

    return {
      running: isServiceRunning(),
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    };
  });

  // Get all settings and preferences
  ipcMain.handle('get-settings', () => {
    return {
      ...getSettings(),
      ...getPreferences(),
    };
  });

  // Update settings and preferences
  ipcMain.handle(
    'update-settings',
    async (
      _event,
      payload: {
        proxy?: Partial<ProxySettings> | null;
        preferences?: Partial<PreferencesData>;
      } = {},
    ) => {
      const proxy =
        payload.proxy && typeof payload.proxy === 'object' ? payload.proxy : null;
      const preferences =
        payload.preferences && typeof payload.preferences === 'object'
          ? payload.preferences
          : {};

      if (!proxy) {
        return { success: false, message: 'Missing proxy settings' };
      }

      const result = await applySettings(proxy, {
        hideOnSuccess: false,
        showErrorToast: false,
      });
      if (!result || !result.success) {
        return result || { success: false, message: 'Failed to apply settings' };
      }

      if (Object.prototype.hasOwnProperty.call(preferences, 'startAtLogin')) {
        setStartAtLogin(preferences.startAtLogin);
      }
      if (Object.prototype.hasOwnProperty.call(preferences, 'hideFromDock')) {
        setHideFromDock(preferences.hideFromDock);
      }
      if (Object.prototype.hasOwnProperty.call(preferences, 'themeMode')) {
        applyThemeMode(preferences.themeMode);
      }
      if (Object.prototype.hasOwnProperty.call(preferences, 'requestFilters')) {
        setRequestFilters(preferences.requestFilters);
      }
      if (Object.prototype.hasOwnProperty.call(preferences, 'themeMode')) {
        // Manually refresh theme after programmatic change
        // nativeTheme.on('updated') only fires on system appearance changes
        refreshTheme();
        // Notify renderer of theme change
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('theme-changed', {
            isDark: nativeTheme.shouldUseDarkColors,
          });
        }
      }

      const finalSettings = {
        ...getSettings(),
        ...getPreferences(),
      };
      console.log('[ipc] update-settings returning settings.requestFilters:', finalSettings.requestFilters);

      return {
        ...result,
        settings: finalSettings,
      };
    },
  );

  // Fetch network data from Whistle via main process (avoids renderer CORS limits)
  ipcMain.handle('get-network-data', async (_event, query: NetworkQuery = {}) => {
    if (!isServiceRunning()) {
      return { ec: 1, message: 'Service not running' };
    }

    const config = getRuntimeConfig();
    const settings = getSettings() || {};
    const rawLimit = Number(settings.requestListLimit);
    const requestListLimit =
      Number.isInteger(rawLimit) && rawLimit > 0
        ? rawLimit
        : DEFAULT_REQUEST_LIST_LIMIT;
    const requestedCount = Number(query.count);
    const safeCount =
      Number.isInteger(requestedCount) && requestedCount > 0
        ? Math.min(requestedCount, requestListLimit)
        : Math.min(120, requestListLimit);

    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    search.set('count', String(safeCount));
    return requestWhistleApi({
      ...config,
      method: 'GET',
      path: `/cgi-bin/get-data?${search.toString()}`,
    });
  });

  // Get values from Whistle
  ipcMain.handle('get-values', async () => {
    if (!isServiceRunning()) {
      return { ec: 1, message: 'Service not running' };
    }
    return requestWhistleApi({
      ...getRuntimeConfig(),
      method: 'GET',
      path: '/cgi-bin/values/list2',
    });
  });

  // Set a value in Whistle
  ipcMain.handle(
    'set-value',
    async (_event, payload: { name?: string; value?: string } = {}) => {
      if (!isServiceRunning()) {
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
    },
  );

  // Delete a value from Whistle
  ipcMain.handle('delete-value', async (_event, payload: { name?: string } = {}) => {
    if (!isServiceRunning()) {
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
    if (isServiceRunning()) {
      return { success: false, message: 'Service already running' };
    }
    // Dynamic import to avoid circular dependency
    const forkModule = require('./fork') as { default?: () => void } | (() => void);
    const forkWhistle = typeof forkModule === 'function' ? forkModule : forkModule.default;
    if (typeof forkWhistle !== 'function') {
      return { success: false, message: 'Failed to load service starter' };
    }
    forkWhistle();
    return { success: true };
  });

  // Stop whistle service
  ipcMain.handle('stop-service', async () => {
    if (!isServiceRunning()) {
      return { success: false, message: 'Service not running' };
    }
    const child = getChild();
    if (child) {
      child.kill();
    }
    // Dynamic import to avoid circular dependency
    const { setChild, setRunning } = require('./context');
    setChild(null);
    setRunning(false);
    notifyServiceStatus({ running: false });
    return { success: true };
  });

  // Get system proxy enabled state
  ipcMain.handle('get-system-proxy-enabled', () => {
    return isEnabled();
  });

  // Toggle system proxy
  ipcMain.handle('set-system-proxy-enabled', async (_event, enabled: boolean) => {
    try {
      if (enabled) {
        const settings = getSettings();
        // Convert ProxySettings to ProxyOptions (port needs to be number)
        const proxyOptions: ProxyOptions = {
          port: Number(settings.port),
          host: settings.host,
          bypass: settings.bypass,
        };
        await enableProxy(proxyOptions);
      } else {
        await disableProxy();
      }

      // Update storage to persist state
      storage.setProperty('autoSetProxy', enabled);

      // Refresh menu to show updated proxy status
      refreshProxyStatus();

      return { success: true, enabled };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to toggle system proxy',
      };
    }
  });

  // Check for app updates (auto-download + manual install)
  ipcMain.handle('check-for-updates', async () => {
    return checkForUpdates();
  });

  ipcMain.handle('get-update-status', () => {
    return getUpdateStatus();
  });

  ipcMain.handle('install-downloaded-update', async () => {
    return installDownloadedUpdate();
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

/**
 * Update rules from Whistle utility process
 * Notifies the renderer of the updated rules
 *
 * @param rules - The updated rules object
 */
function updateRules(rules: unknown): void {
  currentRules = rules;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rules-updated', rules);
  }
}

/**
 * Notify renderer of service status changes
 *
 * @param status - Service status object with running state
 */
function notifyServiceStatus(status: { running: boolean }): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('service-status-changed', status);
  }
}

export { initIpc, updateRules, notifyServiceStatus };
