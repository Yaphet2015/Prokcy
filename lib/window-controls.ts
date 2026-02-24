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
export const toggleMaximize = (win: BrowserWindow | null | undefined): void => {
  if (!win || typeof win.isMaximized !== 'function') {
    return;
  }

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
};

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
export const bindMaximizeStateEvents = (
  win: BrowserWindow | null | undefined,
  onChange: MaximizeStateCallback
): void => {
  if (!win || typeof onChange !== 'function') {
    return;
  }

  win.on('maximize', () => onChange(true));
  win.on('unmaximize', () => onChange(false));
};

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
export const hideNativeWindowButtons = (
  win: BrowserWindow | null | undefined,
  platform: NodeJS.Platform = process.platform
): void => {
  if (
    platform === 'darwin'
    && win
    && typeof win.setWindowButtonVisibility === 'function'
  ) {
    win.setWindowButtonVisibility(false);
  }
};
