"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hideNativeWindowButtons = exports.bindMaximizeStateEvents = exports.toggleMaximize = void 0;
/**
 * Toggle the maximize state of a browser window
 *
 * @param win - The BrowserWindow instance to toggle
 *
 * @example
 * toggleMaximize(browserWindow); // Maximizes if unmaximized, unmaximizes if maximized
 */
const toggleMaximize = (win) => {
    if (!win || typeof win.isMaximized !== 'function') {
        return;
    }
    if (win.isMaximized()) {
        win.unmaximize();
    }
    else {
        win.maximize();
    }
};
exports.toggleMaximize = toggleMaximize;
/**
 * Bind event listeners for maximize state changes
 *
 * @param win - The BrowserWindow instance to bind events to
 * @param onChange - Callback invoked when maximize state changes
 *
 * @example
 * bindMaximizeStateEvents(browserWindow, (isMaximized) => {
 *   console.log(`Window is now ${isMaximized ? 'maximized' : 'unmaximized'}`);
 * });
 */
const bindMaximizeStateEvents = (win, onChange) => {
    if (!win || typeof onChange !== 'function') {
        return;
    }
    win.on('maximize', () => onChange(true));
    win.on('unmaximize', () => onChange(false));
};
exports.bindMaximizeStateEvents = bindMaximizeStateEvents;
/**
 * Hide native window buttons on macOS
 *
 * On macOS, this hides the red/yellow/green traffic light buttons.
 * Useful for frameless windows with custom window controls.
 *
 * @param win - The BrowserWindow instance
 * @param platform - The platform (defaults to current process platform)
 *
 * @example
 * hideNativeWindowButtons(browserWindow); // Hides buttons on macOS, no-op on other platforms
 */
const hideNativeWindowButtons = (win, platform = process.platform) => {
    if (platform === 'darwin'
        && win
        && typeof win.setWindowButtonVisibility === 'function') {
        win.setWindowButtonVisibility(false);
    }
};
exports.hideNativeWindowButtons = hideNativeWindowButtons;
//# sourceMappingURL=window-controls.js.map