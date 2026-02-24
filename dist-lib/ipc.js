"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initIpc = initIpc;
exports.updateRules = updateRules;
exports.notifyServiceStatus = notifyServiceStatus;
const electron_1 = require("electron");
const http_1 = __importDefault(require("http"));
const window_controls_1 = require("./window-controls");
const context_1 = require("./context");
const settings_1 = require("./settings");
const preferences_1 = require("./preferences");
const proxy_1 = require("./proxy");
const storage_1 = __importDefault(require("./storage"));
const menu_1 = require("./menu");
// Module state
let mainWindow = null;
let currentRules = null;
const DEFAULT_REQUEST_LIST_LIMIT = 500;
/**
 * Get runtime configuration for Whistle API requests
 * Combines options from context with settings from storage
 *
 * @returns Runtime configuration with host, port, and credentials
 */
const getRuntimeConfig = () => {
    const options = (0, context_1.getOptions)() || {};
    const settings = (0, settings_1.getSettings)() || {};
    const uiAuth = settings.uiAuth || {};
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
const requestWhistleApi = ({ host, port, username, password, method = 'GET', path, body, timeout = 8000, }) => {
    const headers = {
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
        const req = http_1.default.request({
            host,
            port,
            path,
            method,
            headers,
        }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
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
                }
                catch (error) {
                    reject(new Error('Failed to parse Whistle API response'));
                }
            });
        });
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
function initIpc(win) {
    mainWindow = win;
    // Bind maximize state events and notify renderer
    (0, window_controls_1.bindMaximizeStateEvents)(mainWindow, (isMaximized) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('window-maximize-changed', isMaximized);
        }
    });
    // Send current theme on request
    electron_1.ipcMain.handle('get-theme', () => {
        try {
            return {
                isDark: electron_1.nativeTheme.shouldUseDarkColors,
            };
        }
        catch (error) {
            console.error('Failed to get theme:', error);
            return { isDark: false }; // Fallback
        }
    });
    // Window control handlers
    electron_1.ipcMain.handle('window:minimize', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.minimize();
            return { success: true };
        }
        return { success: false };
    });
    electron_1.ipcMain.handle('window:toggle-maximize', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            (0, window_controls_1.toggleMaximize)(mainWindow);
            return { success: true };
        }
        return { success: false };
    });
    electron_1.ipcMain.handle('window:close', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.close();
            return { success: true };
        }
        return { success: false };
    });
    electron_1.ipcMain.handle('window:is-maximized', () => (!!(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized())));
    // Get current rules
    electron_1.ipcMain.handle('get-rules', () => currentRules);
    // Get persisted rules order (UI order, includes Default)
    electron_1.ipcMain.handle('get-rules-order', () => {
        return (0, preferences_1.getRulesOrder)();
    });
    // Persist rules order (UI order, includes Default)
    electron_1.ipcMain.handle('set-rules-order', (_event, payload = {}) => {
        return (0, preferences_1.setRulesOrder)(payload.order);
    });
    // Set rules content
    electron_1.ipcMain.handle('set-rules', async (_event, payload) => {
        const child = (0, context_1.getChild)();
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
    electron_1.ipcMain.handle('set-rules-enabled', async (_event, enabled) => {
        const child = (0, context_1.getChild)();
        if (child) {
            child.postMessage({
                type: enabled ? 'enableAllRules' : 'disableAllRules',
            });
        }
        return { success: true };
    });
    // Select/unselect a single rules group
    electron_1.ipcMain.handle('set-rule-selection', async (_event, payload = {}) => {
        const child = (0, context_1.getChild)();
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
    // Create a new rules group
    electron_1.ipcMain.handle('create-rules-group', async (_event, payload = {}) => {
        const child = (0, context_1.getChild)();
        if (!child) {
            return { success: false, message: 'Service not running' };
        }
        child.postMessage({
            type: 'createRulesGroup',
            name: payload.name,
            content: payload.content,
        });
        return { success: true };
    });
    // Delete a rules group
    electron_1.ipcMain.handle('delete-rules-group', async (_event, payload = {}) => {
        const child = (0, context_1.getChild)();
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
    electron_1.ipcMain.handle('rename-rules-group', async (_event, payload = {}) => {
        const child = (0, context_1.getChild)();
        if (!child) {
            return { success: false, message: 'Service not running' };
        }
        child.postMessage({
            type: 'renameRulesGroup',
            name: payload.name,
            newName: payload.newName,
        });
        return { success: true };
    });
    // Reorder rules groups
    electron_1.ipcMain.handle('reorder-rules-groups', async (_event, payload = {}) => {
        const child = (0, context_1.getChild)();
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
    electron_1.ipcMain.handle('get-service-status', () => {
        return { running: (0, context_1.isServiceRunning)() };
    });
    // Get runtime proxy config for renderer API calls
    electron_1.ipcMain.handle('get-runtime-config', () => {
        const config = getRuntimeConfig();
        return {
            running: (0, context_1.isServiceRunning)(),
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
        };
    });
    // Get all settings and preferences
    electron_1.ipcMain.handle('get-settings', () => {
        return {
            ...(0, settings_1.getSettings)(),
            ...(0, preferences_1.getPreferences)(),
        };
    });
    // Update settings and preferences
    electron_1.ipcMain.handle('update-settings', async (_event, payload = {}) => {
        const proxy = payload.proxy && typeof payload.proxy === 'object' ? payload.proxy : null;
        const preferences = payload.preferences && typeof payload.preferences === 'object'
            ? payload.preferences
            : {};
        if (!proxy) {
            return { success: false, message: 'Missing proxy settings' };
        }
        const result = await (0, settings_1.applySettings)(proxy, {
            hideOnSuccess: false,
            showErrorToast: false,
        });
        if (!result || !result.success) {
            return result || { success: false, message: 'Failed to apply settings' };
        }
        if (Object.prototype.hasOwnProperty.call(preferences, 'startAtLogin')) {
            (0, preferences_1.setStartAtLogin)(preferences.startAtLogin);
        }
        if (Object.prototype.hasOwnProperty.call(preferences, 'hideFromDock')) {
            (0, preferences_1.setHideFromDock)(preferences.hideFromDock);
        }
        if (Object.prototype.hasOwnProperty.call(preferences, 'themeMode')) {
            (0, preferences_1.applyThemeMode)(preferences.themeMode);
        }
        if (Object.prototype.hasOwnProperty.call(preferences, 'requestFilters')) {
            (0, preferences_1.setRequestFilters)(preferences.requestFilters);
        }
        const finalSettings = {
            ...(0, settings_1.getSettings)(),
            ...(0, preferences_1.getPreferences)(),
        };
        console.log('[ipc] update-settings returning settings.requestFilters:', finalSettings.requestFilters);
        return {
            ...result,
            settings: finalSettings,
        };
    });
    // Fetch network data from Whistle via main process (avoids renderer CORS limits)
    electron_1.ipcMain.handle('get-network-data', async (_event, query = {}) => {
        if (!(0, context_1.isServiceRunning)()) {
            return { ec: 1, message: 'Service not running' };
        }
        const config = getRuntimeConfig();
        const settings = (0, settings_1.getSettings)() || {};
        const rawLimit = Number(settings.requestListLimit);
        const requestListLimit = Number.isInteger(rawLimit) && rawLimit > 0
            ? rawLimit
            : DEFAULT_REQUEST_LIST_LIMIT;
        const requestedCount = Number(query.count);
        const safeCount = Number.isInteger(requestedCount) && requestedCount > 0
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
    electron_1.ipcMain.handle('get-values', async () => {
        if (!(0, context_1.isServiceRunning)()) {
            return { ec: 1, message: 'Service not running' };
        }
        return requestWhistleApi({
            ...getRuntimeConfig(),
            method: 'GET',
            path: '/cgi-bin/values/list2',
        });
    });
    // Set a value in Whistle
    electron_1.ipcMain.handle('set-value', async (_event, payload = {}) => {
        if (!(0, context_1.isServiceRunning)()) {
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
    // Delete a value from Whistle
    electron_1.ipcMain.handle('delete-value', async (_event, payload = {}) => {
        if (!(0, context_1.isServiceRunning)()) {
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
    electron_1.ipcMain.handle('start-service', async () => {
        if ((0, context_1.isServiceRunning)()) {
            return { success: false, message: 'Service already running' };
        }
        // Dynamic import to avoid circular dependency
        const forkWhistle = require('./fork');
        forkWhistle();
        return { success: true };
    });
    // Stop whistle service
    electron_1.ipcMain.handle('stop-service', async () => {
        if (!(0, context_1.isServiceRunning)()) {
            return { success: false, message: 'Service not running' };
        }
        const child = (0, context_1.getChild)();
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
    electron_1.ipcMain.handle('get-system-proxy-enabled', () => {
        return (0, proxy_1.isEnabled)();
    });
    // Toggle system proxy
    electron_1.ipcMain.handle('set-system-proxy-enabled', async (_event, enabled) => {
        try {
            if (enabled) {
                const settings = (0, settings_1.getSettings)();
                // Convert ProxySettings to ProxyOptions (port needs to be number)
                const proxyOptions = {
                    port: Number(settings.port),
                    host: settings.host,
                    bypass: settings.bypass,
                };
                await (0, proxy_1.enableProxy)(proxyOptions);
            }
            else {
                await (0, proxy_1.disableProxy)();
            }
            // Update storage to persist state
            storage_1.default.setProperty('autoSetProxy', enabled);
            // Refresh menu to show updated proxy status
            (0, menu_1.refreshProxyStatus)();
            return { success: true, enabled };
        }
        catch (err) {
            return {
                success: false,
                message: err instanceof Error ? err.message : 'Failed to toggle system proxy',
            };
        }
    });
    // Notify renderer when theme changes
    electron_1.nativeTheme.on('updated', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('theme-changed', {
                isDark: electron_1.nativeTheme.shouldUseDarkColors,
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
function updateRules(rules) {
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
function notifyServiceStatus(status) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('service-status-changed', status);
    }
}
//# sourceMappingURL=ipc.js.map