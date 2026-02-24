"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRunning = exports.isServiceRunning = exports.setDataUrl = exports.sendMsg = exports.getOptions = exports.setOptions = exports.getWin = exports.setWin = exports.getChild = exports.setChild = exports.execJsSafe = void 0;
/**
 * Global state management for Prokcy application
 * Manages window references, child processes, and application state
 */
// Global state variables
let win = null;
let child = null;
let options = null;
let dataUrl = null;
let timer = null;
let isRunning = false;
/**
 * Safely execute JavaScript code in the renderer process
 * @param code - JavaScript code to execute
 * @returns Promise that resolves with the execution result or undefined on error
 */
const execJsSafe = async (code) => {
    try {
        return await win?.webContents.executeJavaScript(code);
    }
    catch (e) {
        // Silently handle errors
        return undefined;
    }
};
exports.execJsSafe = execJsSafe;
/**
 * Import data URL into the renderer process
 * @param delay - If true, skip processing and just set up timer
 */
const importDataUrl = async (delay) => {
    if (delay !== true && win && isRunning && dataUrl && win.webContents) {
        const result = await (0, exports.execJsSafe)(`window.setWhistleDataUrl("${dataUrl}")`);
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
const triggerDataUrlImport = () => {
    if (timer) {
        clearTimeout(timer);
    }
    importDataUrl(true);
};
/**
 * Set the child utility process reference
 * @param c - UtilityProcess instance or null
 */
const setChild = (c) => {
    child = c;
};
exports.setChild = setChild;
/**
 * Get the current child utility process reference
 * @returns UtilityProcess instance or null
 */
const getChild = () => child;
exports.getChild = getChild;
/**
 * Set the main browser window reference
 * @param w - BrowserWindow instance or null
 */
const setWin = (w) => {
    win = w;
    triggerDataUrlImport();
};
exports.setWin = setWin;
/**
 * Get the current browser window reference
 * @returns BrowserWindow instance or null
 */
const getWin = () => win;
exports.getWin = getWin;
/**
 * Set whistle options
 * @param o - Options object
 */
const setOptions = (o) => {
    options = o;
};
exports.setOptions = setOptions;
/**
 * Get current whistle options
 * @returns Options object or null
 */
const getOptions = () => options;
exports.getOptions = getOptions;
/**
 * Send a message to the child utility process
 * @param data - Data to send to the child process
 */
const sendMsg = (data) => {
    if (child) {
        child.postMessage(data);
    }
};
exports.sendMsg = sendMsg;
/**
 * Set and sanitize data URL for import into renderer
 * Sanitizes URL by encoding non-URL-safe characters
 * @param url - Raw data URL to sanitize and set
 */
const setDataUrl = (url) => {
    dataUrl = url.replace(/[^\w.~!*'();:@&=+$,/?#[\]<>{}|%-]/g, (s) => {
        try {
            return encodeURIComponent(s);
        }
        catch (e) {
            return '';
        }
    });
    triggerDataUrlImport();
};
exports.setDataUrl = setDataUrl;
/**
 * Check if the whistle service is currently running
 * @returns true if service is running, false otherwise
 */
const isServiceRunning = () => isRunning;
exports.isServiceRunning = isServiceRunning;
/**
 * Set the service running state
 * @param running - true if service is running, false otherwise
 */
const setRunning = (running) => {
    isRunning = running;
};
exports.setRunning = setRunning;
//# sourceMappingURL=context.js.map