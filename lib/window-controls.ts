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

/**
 * Minimal keyboard event shape for Electron before-input-event handling.
 */
type InputKeyEvent = {
  type?: string;
  key?: string;
  meta?: boolean;
  shift?: boolean;
  control?: boolean;
  alt?: boolean;
};

/**
 * Minimal event shape for keyboard shortcut handlers.
 */
type PreventableEvent = {
  preventDefault?: () => void;
};

/**
 * Handle macOS Cmd+W by hiding (not quitting) the main window.
 *
 * This function is called from the 'before-input-event' handler on webContents,
 * which fires before menu accelerators are processed. This allows us to intercept
 * Cmd+W and hide the window instead of triggering the menu's "Close Window" action.
 *
 * @returns true when the shortcut was handled, otherwise false
 */
export const handleMacHideWindowShortcut = (
  event: PreventableEvent | null | undefined,
  input: InputKeyEvent | null | undefined,
  win: BrowserWindow | null | undefined,
  platform: NodeJS.Platform = process.platform
): boolean => {
  // Only handle on macOS
  if (platform !== 'darwin') {
    return false;
  }

  // Check for keyDown event type
  if (input?.type !== 'keyDown') {
    return false;
  }

  // Check for 'w' key (case-insensitive)
  const key = String(input?.key || '').toLowerCase();
  if (key !== 'w') {
    return false;
  }

  // Check for pure Cmd+W (Command key pressed, no other modifiers)
  const isCmdW = input?.meta === true
    && !input?.shift
    && !input?.control
    && !input?.alt;

  if (!isCmdW) {
    return false;
  }

  // Validate window state
  if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
    return false;
  }

  // Prevent the event from reaching the menu accelerator
  event?.preventDefault?.();

  // Hide the window (don't close it - this keeps the app running)
  win.hide();

  return true;
};
