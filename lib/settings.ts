import { isIP } from 'net';
import { lookup } from 'dns';
import { promisify } from 'util';
import { app } from 'electron';
import {
  getString,
  LOCALHOST,
  USERNAME_EXPORT,
} from './util';
import {
  getWin,
  getChild,
  sendMsg,
  isServiceRunning as isRunning,
} from './context';
import { enableProxy, isEnabled } from './proxy';
import storage, { ProxySettings as StorageProxySettings } from './storage';
import type Storage from 'whistle/lib/rules/storage';

// Constants
const username: string = USERNAME_EXPORT;
const password: string = `pass_${Math.random()}`;
export const authorization: string = Buffer.from(`${username}:${password}`).toString('base64');
const DEFAULT_PORT: string = '8888';
const HEADER_SIZE_OPTIONS: number[] = [512, 1024, 5120, 10240, 51200, 102400];
const DEFAULT_REQUEST_LIST_LIMIT = 500;
const MIN_REQUEST_LIST_LIMIT = 100;
const MAX_REQUEST_LIST_LIMIT = 5000;

// Window size constants
const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 800;
const MIN_WINDOW_SIZE = 800;
const MAX_WINDOW_SIZE = 3840;

/**
 * Normalize window size to valid range
 * @param value - Raw window size value
 * @param defaultSize - Default size to use if invalid
 * @returns Normalized size within valid range
 */
const normalizeWindowSize = (value: unknown, defaultSize: number): number =>
  normalizeToRange(value, MIN_WINDOW_SIZE, MAX_WINDOW_SIZE, defaultSize);

/**
 * Normalize a number to a valid range
 * @param value - Raw value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultSize - Default to use if invalid
 * @returns Normalized value within range
 */
const normalizeToRange = (
  value: unknown,
  min: number,
  max: number,
  defaultSize: number
): number => {
  const num = Number(value);
  if (!Number.isInteger(num)) {
    return defaultSize;
  }
  if (num < min) {
    return min;
  }
  if (num > max) {
    return max;
  }
  return num;
};

// Type for the parsed settings
export interface ProxySettings {
  port: string;
  socksPort?: string;
  username?: string;
  password?: string;
  uiAuth: {
    username: string;
    password: string;
  };
  host: string;
  bypass: string;
  useDefaultStorage: boolean;
  maxHttpHeaderSize: number;
  requestListLimit: number;
  defaultWidth: number;
  defaultHeight: number;
}

// Type for settings input (from storage or UI)
type SettingsInput = Storage | Record<string, unknown>;

// Type for applySettings options
interface ApplySettingsOptions {
  hideOnSuccess?: boolean;
  showErrorToast?: boolean;
}

// Type for applySettings result
interface ApplySettingsResult {
  success: boolean;
  message?: string;
  changed?: boolean;
  needsRestart?: boolean;
}

// State variables
let storageChanged: boolean = false;

// DNS lookup promisified
const dnsLookupAsync = promisify(lookup);

/**
 * Check if a port number is valid
 * @param p - Port number to check
 * @returns true if port is in valid range
 */
const isPort = (p: number): boolean => p > 0 && p < 65536;

/**
 * Get a validated port as string
 * @param p - Port number
 * @param defaultPort - Default port to use if invalid
 * @returns Port as string or default
 */
const getPort = (p: unknown, defaultPort?: string): string =>
  isPort(p as number) ? String(p) : (defaultPort || '');

/**
 * Get a value from settings data
 * Handles both raw objects and Storage instances with getProperty
 * @param data - Settings data object
 * @param key - Key to retrieve
 * @returns The value or undefined
 */
const getValue = (data: SettingsInput, key: string): unknown => {
  if (!data) {
    return undefined;
  }
  // Check if it's a Storage instance with getProperty method
  if (typeof (data as Storage).getProperty === 'function') {
    return (data as Storage).getProperty(key);
  }
  // Otherwise treat as plain object
  return (data as Record<string, unknown>)[key];
};

/**
 * Normalize request list limit to valid range
 * @param value - Raw limit value
 * @returns Normalized limit within valid range
 */
const normalizeRequestListLimit = (value: unknown): number =>
  normalizeToRange(value, MIN_REQUEST_LIST_LIMIT, MAX_REQUEST_LIST_LIMIT, DEFAULT_REQUEST_LIST_LIMIT);

/**
 * Parse settings from storage data
 * @param data - Raw settings data from storage
 * @returns Parsed and validated ProxySettings
 */
const parseSettings = (data: SettingsInput): ProxySettings => {
  const headerSize = +getValue(data, 'maxHttpHeaderSize')!;

  return {
    port: getPort(getValue(data, 'port'), DEFAULT_PORT),
    socksPort: getPort(getValue(data, 'socksPort')),
    username: getString(getValue(data, 'username'), 16),
    password: getString(getValue(data, 'password'), 16),
    uiAuth: { username, password },
    host: getString(getValue(data, 'host'), 255),
    bypass: getString(getValue(data, 'bypass'), 2000),
    useDefaultStorage: !!getValue(data, 'useDefaultStorage'),
    maxHttpHeaderSize: HEADER_SIZE_OPTIONS.includes(headerSize) ? headerSize : 256,
    requestListLimit: normalizeRequestListLimit(getValue(data, 'requestListLimit')),
    defaultWidth: normalizeWindowSize(getValue(data, 'defaultWidth'), DEFAULT_WINDOW_WIDTH),
    defaultHeight: normalizeWindowSize(getValue(data, 'defaultHeight'), DEFAULT_WINDOW_HEIGHT),
  };
};

/**
 * Get current proxy settings from storage
 * @returns Current ProxySettings
 */
export const getSettings = (): ProxySettings => parseSettings(storage);

/**
 * Update shadow rules in the child process
 * @param settings - Settings to send to child process
 */
const updateShadowRules = (settings: ProxySettings): void => {
  sendMsg({
    type: 'setShadowRules',
    settings,
  });
};

/**
 * Check if settings have changed compared to current settings
 * @param data - New settings data
 * @returns true if any setting has changed
 */
const hasChanged = (data: ProxySettings): boolean => {
  if (!getChild()) {
    return true;
  }
  const curSettings = getSettings();
  const keys = Object.keys(curSettings);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    if (key !== 'uiAuth' && curSettings[key as keyof ProxySettings] !== data[key as keyof ProxySettings]) {
      return true;
    }
  }
  return false;
};

/**
 * Perform DNS lookup on a hostname
 * @param host - Hostname to lookup
 * @returns Promise that resolves to IP address or the original host if it's already an IP
 */
const dnsLookup = async (host: string): Promise<string> => {
  if (!host || isIP(host)) {
    return host;
  }
  try {
    const result = await dnsLookupAsync(host);
    return result?.address || LOCALHOST;
  } catch (err) {
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
export const applySettings = async (
  rawData: SettingsInput,
  _options: ApplySettingsOptions = {}
): Promise<ApplySettingsResult> => {
  const data = rawData && parseSettings(rawData);
  if (!data) {
    return { success: false, message: 'Invalid settings' };
  }

  try {
    await dnsLookup(data.host);
  } catch (e) {
    return { success: false, message: (e as Error)?.message || 'Invalid bound host' };
  }

  if (isRunning() && !hasChanged(data)) {
    return { success: true, changed: false, needsRestart: false };
  }

  const curSettings = getSettings();
  const portChanged = curSettings.port !== data.port;
  const hostChanged = curSettings.host !== data.host;
  const bypassChanged = curSettings.bypass !== data.bypass;

  if (isEnabled() && (portChanged || hostChanged || bypassChanged)) {
    try {
      await enableProxy({
        port: Number(data.port),
        host: data.host,
        bypass: data.bypass,
      });
    } catch (e) {
      // Silently ignore proxy enable errors
    }
  }

  updateShadowRules(data);
  const nextData = { ...data };
  delete (nextData as Partial<ProxySettings>).uiAuth;
  storage.setProperties(nextData as StorageProxySettings);

  storageChanged = curSettings.useDefaultStorage !== data.useDefaultStorage;
  const socksChanged = curSettings.socksPort !== data.socksPort;
  const headerSizeChanged = curSettings.maxHttpHeaderSize !== data.maxHttpHeaderSize;
  const requestListLimitChanged = curSettings.requestListLimit !== data.requestListLimit;
  const needsRestart = !isRunning() || portChanged || hostChanged
    || socksChanged || storageChanged || headerSizeChanged || requestListLimitChanged;

  if (needsRestart) {
    app.emit('whistleSettingsChanged', true);
  }

  return { success: true, changed: true, needsRestart };
};

/**
 * Reload the main page if storage directory changed
 */
export const reloadPage = (): void => {
  if (storageChanged) {
    storageChanged = false;
    const win = getWin();
    if (win && win.webContents) {
      win.webContents.reload();
    }
  }
};
