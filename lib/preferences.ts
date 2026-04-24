import { app, nativeTheme } from 'electron';
import storage from './storage';
import { isMac } from './util';

/**
 * Theme mode options matching Electron's nativeTheme.themeSource
 * - 'system': Follow system appearance
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 */
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Preferences returned to the renderer process
 */
export interface PreferencesData {
  startAtLogin: boolean;
  hideFromDock: boolean;
  themeMode: ThemeMode;
  sidebarDefaultCollapsed: boolean;
  rulesOrder: string[];
  requestFilters: string;
  networkPollingCount: number;
  trackedRequestIdsLimit: number;
  systemProxyEnabled: boolean;
}

const DEFAULT_NETWORK_POLLING_COUNT = 50;
const MIN_NETWORK_POLLING_COUNT = 10;
const MAX_NETWORK_POLLING_COUNT = 100;
const DEFAULT_TRACKED_REQUEST_IDS_LIMIT = 50;
const MIN_TRACKED_REQUEST_IDS_LIMIT = 0;
const MAX_TRACKED_REQUEST_IDS_LIMIT = 200;

const normalizeNumberPreference = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
};

// Valid theme mode values
const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Normalize theme mode to ensure it's a valid ThemeMode value
 * @param mode - The theme mode to normalize
 * @returns A valid ThemeMode value ('system' if invalid)
 */
const normalizeThemeMode = (mode: unknown): ThemeMode => {
  if (typeof mode !== 'string') {
    return 'system';
  }
  const normalized = mode.toLowerCase() as ThemeMode;
  return THEME_MODES.includes(normalized) ? normalized : 'system';
};

/**
 * Get the current theme mode preference
 * @returns The current theme mode ('system' | 'light' | 'dark')
 */
export const getThemeMode = (): ThemeMode =>
  normalizeThemeMode(storage.getProperty('themeMode'));

/**
 * Apply theme mode to both Electron's nativeTheme and persist to storage
 * @param mode - The theme mode to apply (defaults to current stored value)
 * @returns The normalized theme mode that was applied
 */
export const applyThemeMode = (mode?: ThemeMode): ThemeMode => {
  const nextMode = normalizeThemeMode(mode ?? getThemeMode());
  nativeTheme.themeSource = nextMode;
  storage.setProperty('themeMode', nextMode);
  return nextMode;
};

/**
 * Get whether the app should start at login
 * @returns true if app starts at login
 */
export const getStartAtLogin = (): boolean =>
  !!storage.getProperty('startAtLogin');

/**
 * Set whether the app should start at login
 * Also updates the system login item settings when packaged
 * @param startAtLogin - Whether to start at login
 * @returns The enabled state
 */
export const setStartAtLogin = (startAtLogin: unknown): boolean => {
  const enabled = !!startAtLogin;
  storage.setProperty('startAtLogin', enabled);
  if (app.isPackaged) {
    try {
      app.setLoginItemSettings({ openAtLogin: enabled });
    } catch (e) {
      // Ignore errors when setting login item
    }
  }
  return enabled;
};

/**
 * Get whether the app should hide from dock (macOS only)
 * @returns true if app should hide from dock
 */
export const getHideFromDock = (): boolean =>
  !!storage.getProperty('hideFromDock');

/**
 * Set whether the app should hide from dock (macOS only)
 * @param hideFromDock - Whether to hide from dock
 * @returns The enabled state
 */
export const setHideFromDock = (hideFromDock: unknown): boolean => {
  const enabled = !!hideFromDock;
  storage.setProperty('hideFromDock', enabled);
  if (isMac && app.dock) {
    if (enabled) {
      app.dock.hide();
    } else {
      app.dock.show();
    }
  }
  return enabled;
};

export const getSidebarDefaultCollapsed = (): boolean =>
  storage.getProperty('sidebarDefaultCollapsed') === true;

export const setSidebarDefaultCollapsed = (collapsed: unknown): boolean => {
  const enabled = collapsed === true;
  storage.setProperty('sidebarDefaultCollapsed', enabled);
  return enabled;
};

/**
 * Get the order of rule groups
 * Returns a deduplicated array of rule group names
 * @returns Array of rule group names in order
 */
export const getRulesOrder = (): string[] => {
  const value = storage.getProperty('rulesOrder');
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item, index, list) =>
      typeof item === 'string' && item && list.indexOf(item) === index
  );
};

/**
 * Set the order of rule groups
 * Deduplicates and filters the input to ensure valid strings
 * @param order - Array of rule group names
 * @returns The normalized and deduplicated array
 */
export const setRulesOrder = (order: unknown): string[] => {
  const nextOrder = Array.isArray(order)
    ? order.filter(
        (item, index, list) =>
          typeof item === 'string' && item && list.indexOf(item) === index
      )
    : [];
  storage.setProperty('rulesOrder', nextOrder);
  return nextOrder;
};

/**
 * Get the request filters pattern string
 * @returns The request filters pattern (empty string if not set)
 */
export const getRequestFilters = (): string => {
  const value = storage.getProperty('requestFilters');
  console.log('[preferences] getRequestFilters:', value);
  return typeof value === 'string' ? value : '';
};

/**
 * Set the request filters pattern string
 * @param filters - The pattern string to set
 * @returns The normalized pattern (empty string if invalid)
 */
export const setRequestFilters = (filters: unknown): string => {
  const nextFilters = typeof filters === 'string' ? filters : '';
  console.log('[preferences] setRequestFilters:', nextFilters);
  storage.setProperty('requestFilters', nextFilters);
  return nextFilters;
};

export const getNetworkPollingCount = (): number => normalizeNumberPreference(
  storage.getProperty('networkPollingCount'),
  MIN_NETWORK_POLLING_COUNT,
  MAX_NETWORK_POLLING_COUNT,
  DEFAULT_NETWORK_POLLING_COUNT,
);

export const setNetworkPollingCount = (value: unknown): number => {
  const nextValue = normalizeNumberPreference(
    value,
    MIN_NETWORK_POLLING_COUNT,
    MAX_NETWORK_POLLING_COUNT,
    DEFAULT_NETWORK_POLLING_COUNT,
  );
  storage.setProperty('networkPollingCount', nextValue);
  return nextValue;
};

export const getTrackedRequestIdsLimit = (): number => normalizeNumberPreference(
  storage.getProperty('trackedRequestIdsLimit'),
  MIN_TRACKED_REQUEST_IDS_LIMIT,
  MAX_TRACKED_REQUEST_IDS_LIMIT,
  DEFAULT_TRACKED_REQUEST_IDS_LIMIT,
);

export const setTrackedRequestIdsLimit = (value: unknown): number => {
  const nextValue = normalizeNumberPreference(
    value,
    MIN_TRACKED_REQUEST_IDS_LIMIT,
    MAX_TRACKED_REQUEST_IDS_LIMIT,
    DEFAULT_TRACKED_REQUEST_IDS_LIMIT,
  );
  storage.setProperty('trackedRequestIdsLimit', nextValue);
  return nextValue;
};

/**
 * Get whether system proxy is automatically configured
 * @returns true if system proxy auto-configuration is enabled
 */
export const getSystemProxyEnabled = (): boolean =>
  !!storage.getProperty('autoSetProxy');

/**
 * Get all preferences as a single object
 * Useful for sending the complete state to the renderer process
 * @returns Object containing all preference values
 */
export const getPreferences = (): PreferencesData => ({
  startAtLogin: getStartAtLogin(),
  hideFromDock: getHideFromDock(),
  themeMode: getThemeMode(),
  sidebarDefaultCollapsed: getSidebarDefaultCollapsed(),
  rulesOrder: getRulesOrder(),
  requestFilters: getRequestFilters(),
  networkPollingCount: getNetworkPollingCount(),
  trackedRequestIdsLimit: getTrackedRequestIdsLimit(),
  systemProxyEnabled: getSystemProxyEnabled(),
});
