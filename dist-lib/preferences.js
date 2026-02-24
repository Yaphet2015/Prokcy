"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferences = exports.getSystemProxyEnabled = exports.setRequestFilters = exports.getRequestFilters = exports.setRulesOrder = exports.getRulesOrder = exports.setHideFromDock = exports.getHideFromDock = exports.setStartAtLogin = exports.getStartAtLogin = exports.applyThemeMode = exports.getThemeMode = void 0;
const electron_1 = require("electron");
const storage_1 = __importDefault(require("./storage"));
const util_1 = require("./util");
// Valid theme mode values
const THEME_MODES = ['system', 'light', 'dark'];
/**
 * Normalize theme mode to ensure it's a valid ThemeMode value
 * @param mode - The theme mode to normalize
 * @returns A valid ThemeMode value ('system' if invalid)
 */
const normalizeThemeMode = (mode) => {
    if (typeof mode !== 'string') {
        return 'system';
    }
    const normalized = mode.toLowerCase();
    return THEME_MODES.includes(normalized) ? normalized : 'system';
};
/**
 * Get the current theme mode preference
 * @returns The current theme mode ('system' | 'light' | 'dark')
 */
const getThemeMode = () => normalizeThemeMode(storage_1.default.getProperty('themeMode'));
exports.getThemeMode = getThemeMode;
/**
 * Apply theme mode to both Electron's nativeTheme and persist to storage
 * @param mode - The theme mode to apply (defaults to current stored value)
 * @returns The normalized theme mode that was applied
 */
const applyThemeMode = (mode) => {
    const nextMode = normalizeThemeMode(mode ?? (0, exports.getThemeMode)());
    electron_1.nativeTheme.themeSource = nextMode;
    storage_1.default.setProperty('themeMode', nextMode);
    return nextMode;
};
exports.applyThemeMode = applyThemeMode;
/**
 * Get whether the app should start at login
 * @returns true if app starts at login
 */
const getStartAtLogin = () => !!storage_1.default.getProperty('startAtLogin');
exports.getStartAtLogin = getStartAtLogin;
/**
 * Set whether the app should start at login
 * Also updates the system login item settings when packaged
 * @param startAtLogin - Whether to start at login
 * @returns The enabled state
 */
const setStartAtLogin = (startAtLogin) => {
    const enabled = !!startAtLogin;
    storage_1.default.setProperty('startAtLogin', enabled);
    if (electron_1.app.isPackaged) {
        try {
            electron_1.app.setLoginItemSettings({ openAtLogin: enabled });
        }
        catch (e) {
            // Ignore errors when setting login item
        }
    }
    return enabled;
};
exports.setStartAtLogin = setStartAtLogin;
/**
 * Get whether the app should hide from dock (macOS only)
 * @returns true if app should hide from dock
 */
const getHideFromDock = () => !!storage_1.default.getProperty('hideFromDock');
exports.getHideFromDock = getHideFromDock;
/**
 * Set whether the app should hide from dock (macOS only)
 * @param hideFromDock - Whether to hide from dock
 * @returns The enabled state
 */
const setHideFromDock = (hideFromDock) => {
    const enabled = !!hideFromDock;
    storage_1.default.setProperty('hideFromDock', enabled);
    if (util_1.isMac && electron_1.app.dock) {
        if (enabled) {
            electron_1.app.dock.hide();
        }
        else {
            electron_1.app.dock.show();
        }
    }
    return enabled;
};
exports.setHideFromDock = setHideFromDock;
/**
 * Get the order of rule groups
 * Returns a deduplicated array of rule group names
 * @returns Array of rule group names in order
 */
const getRulesOrder = () => {
    const value = storage_1.default.getProperty('rulesOrder');
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item, index, list) => typeof item === 'string' && item && list.indexOf(item) === index);
};
exports.getRulesOrder = getRulesOrder;
/**
 * Set the order of rule groups
 * Deduplicates and filters the input to ensure valid strings
 * @param order - Array of rule group names
 * @returns The normalized and deduplicated array
 */
const setRulesOrder = (order) => {
    const nextOrder = Array.isArray(order)
        ? order.filter((item, index, list) => typeof item === 'string' && item && list.indexOf(item) === index)
        : [];
    storage_1.default.setProperty('rulesOrder', nextOrder);
    return nextOrder;
};
exports.setRulesOrder = setRulesOrder;
/**
 * Get the request filters pattern string
 * @returns The request filters pattern (empty string if not set)
 */
const getRequestFilters = () => {
    const value = storage_1.default.getProperty('requestFilters');
    console.log('[preferences] getRequestFilters:', value);
    return typeof value === 'string' ? value : '';
};
exports.getRequestFilters = getRequestFilters;
/**
 * Set the request filters pattern string
 * @param filters - The pattern string to set
 * @returns The normalized pattern (empty string if invalid)
 */
const setRequestFilters = (filters) => {
    const nextFilters = typeof filters === 'string' ? filters : '';
    console.log('[preferences] setRequestFilters:', nextFilters);
    storage_1.default.setProperty('requestFilters', nextFilters);
    return nextFilters;
};
exports.setRequestFilters = setRequestFilters;
/**
 * Get whether system proxy is automatically configured
 * @returns true if system proxy auto-configuration is enabled
 */
const getSystemProxyEnabled = () => !!storage_1.default.getProperty('autoSetProxy');
exports.getSystemProxyEnabled = getSystemProxyEnabled;
/**
 * Get all preferences as a single object
 * Useful for sending the complete state to the renderer process
 * @returns Object containing all preference values
 */
const getPreferences = () => ({
    startAtLogin: (0, exports.getStartAtLogin)(),
    hideFromDock: (0, exports.getHideFromDock)(),
    themeMode: (0, exports.getThemeMode)(),
    rulesOrder: (0, exports.getRulesOrder)(),
    requestFilters: (0, exports.getRequestFilters)(),
    systemProxyEnabled: (0, exports.getSystemProxyEnabled)(),
});
exports.getPreferences = getPreferences;
//# sourceMappingURL=preferences.js.map