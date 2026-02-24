"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMessageBox = void 0;
const electron_1 = require("electron");
const context_1 = require("./context");
const util_1 = require("./util");
/**
 * Type guard to check if a value is a function
 */
const isFunction = (fn) => typeof fn === 'function';
/**
 * Show a message box to the user with configurable options
 *
 * @param message - The message to display (can be an Error object or string)
 * @param callback - Either a callback function or a MessageBoxOptions object
 * @param showSettings - Whether to show a settings button (or callback when clicked)
 * @param handleCancel - Callback when cancel is clicked (or enables cancel button)
 * @returns Promise resolving to the button index that was clicked (0-indexed)
 *
 * @example
 * // Simple error message
 * await showMessageBox('An error occurred');
 *
 * @example
 * // With retry callback
 * await showMessageBox('Connection failed', (retry) => {
 *   if (retry) reconnect();
 * });
 *
 * @example
 * // With full options
 * await showMessageBox('Configuration error', {
 *   title: 'Settings Required',
 *   type: 'warning',
 *   buttons: ['Open Settings', 'Ignore'],
 *   handleAction: () => openSettings(),
 *   handleCancel: () => app.quit()
 * });
 */
const showMessageBox = async (message, callback, showSettings, handleCancel) => {
    // Early return if app is exiting
    if (electron_1.app.waitForExiting) {
        return;
    }
    let title;
    let type;
    let buttons;
    // Handle overloaded callback parameter
    if (callback && typeof callback === 'object') {
        title = callback.title;
        type = callback.type;
        buttons = callback.buttons;
        showSettings = callback.handleAction || callback.showSettings;
        handleCancel = callback.handleCancel;
        callback = callback.callback;
    }
    // Convert Error objects to error messages
    if (message && typeof message !== 'string') {
        message = (0, util_1.getErrorMsg)(message);
    }
    // Default button configurations
    if (!buttons) {
        if (showSettings) {
            buttons = [
                handleCancel ? 'Confirm' : 'Retry',
                'Settings',
                handleCancel ? 'Cancel' : 'Quit'
            ];
        }
        else {
            buttons = callback ? ['Retry', 'Cancel'] : ['OK'];
        }
    }
    // Show the dialog
    const win = (0, context_1.getWin)();
    if (!win) {
        return undefined;
    }
    const result = await electron_1.dialog.showMessageBox(win, {
        message: message,
        title: title == null ? 'Error' : (title || ' '),
        type: type || 'error',
        noLink: true,
        textWidth: 320,
        defaultId: 0,
        icon: electron_1.nativeImage.createFromPath(util_1.ICON),
        buttons,
    });
    const { response } = result;
    // Handle user response
    if (!response) {
        if (isFunction(callback)) {
            callback(true);
        }
        return response;
    }
    if (!showSettings) {
        return response;
    }
    // Settings button clicked (index 1)
    if (response === 1) {
        if (isFunction(showSettings)) {
            showSettings();
        }
        return response;
    }
    // Cancel button clicked (index 2)
    if (handleCancel) {
        if (isFunction(handleCancel)) {
            handleCancel();
        }
        return response;
    }
    // Quit button clicked (no handler)
    electron_1.app.quit();
    return response;
};
exports.showMessageBox = showMessageBox;
//# sourceMappingURL=dialog.js.map