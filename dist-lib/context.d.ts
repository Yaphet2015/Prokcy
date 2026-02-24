import { BrowserWindow, utilityProcess } from 'electron';
/**
 * Safely execute JavaScript code in the renderer process
 * @param code - JavaScript code to execute
 * @returns Promise that resolves with the execution result or undefined on error
 */
export declare const execJsSafe: (code: string) => Promise<unknown>;
/**
 * Set the child utility process reference
 * @param c - UtilityProcess instance or null
 */
export declare const setChild: (c: ReturnType<typeof utilityProcess.fork> | null) => void;
/**
 * Get the current child utility process reference
 * @returns UtilityProcess instance or null
 */
export declare const getChild: () => ReturnType<typeof utilityProcess.fork> | null;
/**
 * Set the main browser window reference
 * @param w - BrowserWindow instance or null
 */
export declare const setWin: (w: BrowserWindow | null) => void;
/**
 * Get the current browser window reference
 * @returns BrowserWindow instance or null
 */
export declare const getWin: () => BrowserWindow | null;
/**
 * Set whistle options
 * @param o - Options object
 */
export declare const setOptions: (o: unknown) => void;
/**
 * Get current whistle options
 * @returns Options object or null
 */
export declare const getOptions: () => unknown;
/**
 * Send a message to the child utility process
 * @param data - Data to send to the child process
 */
export declare const sendMsg: (data: unknown) => void;
/**
 * Set and sanitize data URL for import into renderer
 * Sanitizes URL by encoding non-URL-safe characters
 * @param url - Raw data URL to sanitize and set
 */
export declare const setDataUrl: (url: string) => void;
/**
 * Check if the whistle service is currently running
 * @returns true if service is running, false otherwise
 */
export declare const isServiceRunning: () => boolean;
/**
 * Set the service running state
 * @param running - true if service is running, false otherwise
 */
export declare const setRunning: (running: boolean) => void;
//# sourceMappingURL=context.d.ts.map