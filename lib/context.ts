import { BrowserWindow, utilityProcess } from 'electron';

/**
 * Global state management for Prokcy application
 * Manages window references, child processes, and application state
 */

// Global state variables
let win: BrowserWindow | null = null;
let child: ReturnType<typeof utilityProcess.fork> | null = null;
let options: unknown = null;
let dataUrl: string | null = null;
let timer: NodeJS.Timeout | null = null;
let isRunning: boolean = false;

/**
 * Safely execute JavaScript code in the renderer process
 * @param code - JavaScript code to execute
 * @returns Promise that resolves with the execution result or undefined on error
 */
export const execJsSafe = async (code: string): Promise<unknown> => {
  try {
    return await win?.webContents.executeJavaScript(code);
  } catch (e) {
    // Silently handle errors
    return undefined;
  }
};

/**
 * Import data URL into the renderer process
 * @param delay - If true, skip processing and just set up timer
 */
const importDataUrl = async (delay: boolean | undefined): Promise<void> => {
  if (delay !== true && win && isRunning && dataUrl && win.webContents) {
    const result = await execJsSafe(`window.setWhistleDataUrl("${dataUrl}")`);
    if (result != null) {
      dataUrl = null;
    }
  }
  if (dataUrl) {
    timer = setTimeout(() => importDataUrl(undefined), isRunning ? 100 : 300);
  }
};

/**
 * Trigger data URL import with cleared timer
 */
const triggerDataUrlImport = (): void => {
  if (timer) {
    clearTimeout(timer);
  }
  importDataUrl(true);
};

/**
 * Set the child utility process reference
 * @param c - UtilityProcess instance or null
 */
export const setChild = (c: ReturnType<typeof utilityProcess.fork> | null): void => {
  child = c;
};

/**
 * Get the current child utility process reference
 * @returns UtilityProcess instance or null
 */
export const getChild = (): ReturnType<typeof utilityProcess.fork> | null => child;

/**
 * Set the main browser window reference
 * @param w - BrowserWindow instance or null
 */
export const setWin = (w: BrowserWindow | null): void => {
  win = w;
  triggerDataUrlImport();
};

/**
 * Get the current browser window reference
 * @returns BrowserWindow instance or null
 */
export const getWin = (): BrowserWindow | null => win;

/**
 * Set whistle options
 * @param o - Options object
 */
export const setOptions = (o: unknown): void => {
  options = o;
};

/**
 * Get current whistle options
 * @returns Options object or null
 */
export const getOptions = (): unknown => options;

/**
 * Send a message to the child utility process
 * @param data - Data to send to the child process
 */
export const sendMsg = (data: unknown): void => {
  if (child) {
    child.postMessage(data);
  }
};

/**
 * Set and sanitize data URL for import into renderer
 * Sanitizes URL by encoding non-URL-safe characters
 * @param url - Raw data URL to sanitize and set
 */
export const setDataUrl = (url: string): void => {
  dataUrl = url.replace(/[^\w.~!*'();:@&=+$,/?#[\]<>{}|%-]/g, (s: string) => {
    try {
      return encodeURIComponent(s);
    } catch (e) {
      return '';
    }
  });
  triggerDataUrlImport();
};

/**
 * Check if the whistle service is currently running
 * @returns true if service is running, false otherwise
 */
export const isServiceRunning = (): boolean => isRunning;

/**
 * Set the service running state
 * @param running - true if service is running, false otherwise
 */
export const setRunning = (running: boolean): void => {
  isRunning = running;
};
