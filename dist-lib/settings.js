"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showSettingsWindow = exports.reloadPage = exports.applySettings = exports.getSettings = exports.authorization = void 0;
const path_1 = __importDefault(require("path"));
const net_1 = require("net");
const dns_1 = require("dns");
const util_1 = require("util");
const electron_1 = require("electron");
const util_2 = require("./util");
const context_1 = require("./context");
const proxy_1 = require("./proxy");
const storage_1 = __importDefault(require("./storage"));
const window_1 = require("./window");
// Constants
const username = util_2.USERNAME_EXPORT;
const password = `pass_${Math.random()}`;
exports.authorization = Buffer.from(`${username}:${password}`).toString('base64');
const DEFAULT_PORT = '8888';
const HEADER_SIZE_OPTIONS = [512, 1024, 5120, 10240, 51200, 102400];
const DEFAULT_REQUEST_LIST_LIMIT = 500;
const MIN_REQUEST_LIST_LIMIT = 100;
const MAX_REQUEST_LIST_LIMIT = 5000;
// State variables
let child = null;
let storageChanged = false;
// DNS lookup promisified
const dnsLookupAsync = (0, util_1.promisify)(dns_1.lookup);
/**
 * Check if a port number is valid
 * @param p - Port number to check
 * @returns true if port is in valid range
 */
const isPort = (p) => p > 0 && p < 65536;
/**
 * Get a validated port as string
 * @param p - Port number
 * @param defaultPort - Default port to use if invalid
 * @returns Port as string or default
 */
const getPort = (p, defaultPort) => isPort(p) ? String(p) : (defaultPort || '');
/**
 * Hide the settings window
 */
const hideSettings = () => {
    if (child) {
        child.hide();
    }
    // @ts-expect-error - Patched globalShortcut.unregister accepts callback
    electron_1.globalShortcut.unregister('ESC', hideSettings);
};
/**
 * Get a value from settings data
 * Handles both raw objects and Storage instances with getProperty
 * @param data - Settings data object
 * @param key - Key to retrieve
 * @returns The value or undefined
 */
const getValue = (data, key) => {
    if (!data) {
        return undefined;
    }
    // Check if it's a Storage instance with getProperty method
    if (typeof data.getProperty === 'function') {
        return data.getProperty(key);
    }
    // Otherwise treat as plain object
    return data[key];
};
/**
 * Normalize request list limit to valid range
 * @param value - Raw limit value
 * @returns Normalized limit within valid range
 */
const normalizeRequestListLimit = (value) => {
    const limit = Number(value);
    if (!Number.isInteger(limit)) {
        return DEFAULT_REQUEST_LIST_LIMIT;
    }
    if (limit < MIN_REQUEST_LIST_LIMIT) {
        return MIN_REQUEST_LIST_LIMIT;
    }
    if (limit > MAX_REQUEST_LIST_LIMIT) {
        return MAX_REQUEST_LIST_LIMIT;
    }
    return limit;
};
/**
 * Parse settings from storage data
 * @param data - Raw settings data from storage
 * @returns Parsed and validated ProxySettings
 */
const parseSettings = (data) => {
    const headerSize = +getValue(data, 'maxHttpHeaderSize');
    return {
        port: getPort(getValue(data, 'port'), DEFAULT_PORT),
        socksPort: getPort(getValue(data, 'socksPort')),
        username: (0, util_2.getString)(getValue(data, 'username'), 16),
        password: (0, util_2.getString)(getValue(data, 'password'), 16),
        uiAuth: { username, password },
        host: (0, util_2.getString)(getValue(data, 'host'), 255),
        bypass: (0, util_2.getString)(getValue(data, 'bypass'), 2000),
        useDefaultStorage: !!getValue(data, 'useDefaultStorage'),
        maxHttpHeaderSize: HEADER_SIZE_OPTIONS.includes(headerSize) ? headerSize : 256,
        requestListLimit: normalizeRequestListLimit(getValue(data, 'requestListLimit')),
    };
};
/**
 * Get current proxy settings from storage
 * @returns Current ProxySettings
 */
const getSettings = () => parseSettings(storage_1.default);
exports.getSettings = getSettings;
/**
 * Update shadow rules in the child process
 * @param settings - Settings to send to child process
 */
const updateShadowRules = (settings) => {
    (0, context_1.sendMsg)({
        type: 'setShadowRules',
        settings,
    });
};
/**
 * Check if settings have changed compared to current settings
 * @param data - New settings data
 * @returns true if any setting has changed
 */
const hasChanged = (data) => {
    if (!(0, context_1.getChild)()) {
        return true;
    }
    const curSettings = (0, exports.getSettings)();
    const keys = Object.keys(curSettings);
    for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
        if (key !== 'uiAuth' && curSettings[key] !== data[key]) {
            return true;
        }
    }
    return false;
};
/**
 * Show a toast message in the settings window
 * @param msg - Message or error to display
 */
const showToast = (msg) => {
    const message = (msg && msg.message) || msg;
    if (child && child.webContents && !child.isDestroyed()) {
        child.webContents.send('showToast', message);
    }
};
/**
 * Perform DNS lookup on a hostname
 * @param host - Hostname to lookup
 * @returns Promise that resolves to IP address or the original host if it's already an IP
 */
const dnsLookup = async (host) => {
    if (!host || (0, net_1.isIP)(host)) {
        return host;
    }
    try {
        const result = await dnsLookupAsync(host);
        return result?.address || util_2.LOCALHOST;
    }
    catch (err) {
        throw err;
    }
};
/**
 * Apply new proxy settings
 * Validates settings, updates system proxy if needed, and persists to storage
 *
 * @param rawData - New settings data
 * @param options - Options for behavior
 * @returns Promise with result object
 */
const applySettings = async (rawData, options = {}) => {
    const { hideOnSuccess = false, showErrorToast = false } = options;
    const data = rawData && parseSettings(rawData);
    if (!data) {
        return { success: false, message: 'Invalid settings' };
    }
    try {
        await dnsLookup(data.host);
    }
    catch (e) {
        if (showErrorToast) {
            showToast(e);
        }
        return { success: false, message: e?.message || 'Invalid bound host' };
    }
    if ((0, context_1.isServiceRunning)() && !hasChanged(data)) {
        if (hideOnSuccess) {
            hideSettings();
        }
        return { success: true, changed: false, needsRestart: false };
    }
    const curSettings = (0, exports.getSettings)();
    const portChanged = curSettings.port !== data.port;
    const hostChanged = curSettings.host !== data.host;
    const bypassChanged = curSettings.bypass !== data.bypass;
    if ((0, proxy_1.isEnabled)() && (portChanged || hostChanged || bypassChanged)) {
        try {
            await (0, proxy_1.enableProxy)({
                port: Number(data.port),
                host: data.host,
                bypass: data.bypass,
            });
        }
        catch (e) {
            // Silently ignore proxy enable errors
        }
    }
    updateShadowRules(data);
    const nextData = { ...data };
    delete nextData.uiAuth;
    storage_1.default.setProperties(nextData);
    if (hideOnSuccess) {
        hideSettings();
    }
    storageChanged = curSettings.useDefaultStorage !== data.useDefaultStorage;
    const socksChanged = curSettings.socksPort !== data.socksPort;
    const headerSizeChanged = curSettings.maxHttpHeaderSize !== data.maxHttpHeaderSize;
    const requestListLimitChanged = curSettings.requestListLimit !== data.requestListLimit;
    const needsRestart = !(0, context_1.isServiceRunning)() || portChanged || hostChanged
        || socksChanged || storageChanged || headerSizeChanged || requestListLimitChanged;
    if (needsRestart) {
        electron_1.app.emit('whistleSettingsChanged', true);
    }
    return { success: true, changed: true, needsRestart };
};
exports.applySettings = applySettings;
/**
 * Send current settings to the settings window
 */
const showSettings = () => {
    (0, util_2.showWin)(child);
    if (child?.webContents) {
        child.webContents.send('showSettings', (0, exports.getSettings)());
    }
};
/**
 * Reload the main page if storage directory changed
 */
const reloadPage = () => {
    if (storageChanged) {
        storageChanged = false;
        const win = (0, context_1.getWin)();
        if (win && win.webContents) {
            win.webContents.reload();
        }
    }
};
exports.reloadPage = reloadPage;
/**
 * Show the settings window
 * Creates window on first call, shows existing window on subsequent calls
 */
const showSettingsWindow = () => {
    (0, window_1.showWindow)();
    if (child) {
        return showSettings();
    }
    child = new electron_1.BrowserWindow({
        parent: (0, context_1.getWin)() || undefined,
        title: 'Proxy Settings',
        autoHideMenuBar: true,
        show: false,
        frame: false,
        modal: true,
        icon: util_2.ICON,
        width: 470,
        height: util_2.isMac ? 460 : 435,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            spellcheck: false,
        },
    });
    // @ts-expect-error - Custom property for find bar support
    child._hasFindBar = true;
    child.loadFile(path_1.default.join(__dirname, '../public/settings.html'));
    // @ts-expect-error - Custom property to identify settings window
    child.isSettingsWin = true;
    child.on('focus', () => {
        // @ts-expect-error - Patched globalShortcut.unregister accepts callback
        electron_1.globalShortcut.unregister('ESC', hideSettings);
        electron_1.globalShortcut.register('ESC', hideSettings);
    });
    child.on('ready-to-show', () => {
        showSettings();
    });
};
exports.showSettingsWindow = showSettingsWindow;
// IPC handlers
electron_1.ipcMain.on('hideSettings', () => {
    if (!(0, context_1.getOptions)() || !(0, context_1.isServiceRunning)()) {
        return electron_1.app.quit();
    }
    hideSettings();
});
electron_1.ipcMain.on('applySettings', async (_event, data) => {
    await (0, exports.applySettings)(data, { hideOnSuccess: true, showErrorToast: true });
});
//# sourceMappingURL=settings.js.map