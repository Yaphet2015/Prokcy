import { BrowserWindow } from 'electron';
/**
 * Callback type for maximize state change events
 * @param isMaximized - true when window is maximized, false when unmaximized
 */
export type MaximizeStateCallback = (isMaximized: boolean) => void;
/**
 * Toggle the maximize state of a browser window
 *
 * @param win - The BrowserWindow instance to toggle
 *
 * @example
 * toggleMaximize(browserWindow); // Maximizes if unmaximized, unmaximizes if maximized
 */
export declare const toggleMaximize: (win: BrowserWindow | null | undefined) => void;
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
export declare const bindMaximizeStateEvents: (win: BrowserWindow | null | undefined, onChange: MaximizeStateCallback) => void;
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
export declare const hideNativeWindowButtons: (win: BrowserWindow | null | undefined, platform?: NodeJS.Platform) => void;
//# sourceMappingURL=window-controls.d.ts.map