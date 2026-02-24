import { dialog, nativeImage, app } from 'electron';
import { getWin } from './context';
import { getErrorMsg, ICON } from './util';

/**
 * Type guard to check if a value is a function
 */
const isFunction = (fn: unknown): fn is (...args: unknown[]) => unknown =>
  typeof fn === 'function';

/**
 * Options for showing a message box with custom buttons
 */
export interface MessageBoxOptions {
  /** Title of the message box */
  title?: string;
  /** Type of dialog: 'error', 'warning', 'info', 'question', or 'none' */
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  /** Custom button labels */
  buttons?: string[];
  /** Callback when the primary action is triggered */
  callback?: (retry: boolean) => void;
  /** Action to perform when settings button is clicked (or showSettings as boolean) */
  handleAction?: (() => void) | boolean;
  /** Legacy name for handleAction */
  showSettings?: (() => void) | boolean;
  /** Action to perform when cancel button is clicked */
  handleCancel?: () => void;
}

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
export const showMessageBox = async (
  message: string | Error | unknown,
  callback?: ((retry: boolean) => void) | MessageBoxOptions,
  showSettings?: (() => void) | boolean,
  handleCancel?: (() => void)
): Promise<number | undefined> => {
  // Early return if app is exiting
  if ((app as any).waitForExiting) {
    return;
  }

  let title: string | undefined;
  let type: MessageBoxOptions['type'];
  let buttons: string[] | undefined;

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
    message = getErrorMsg(message);
  }

  // Default button configurations
  if (!buttons) {
    if (showSettings) {
      buttons = [
        handleCancel ? 'Confirm' : 'Retry',
        'Settings',
        handleCancel ? 'Cancel' : 'Quit'
      ];
    } else {
      buttons = callback ? ['Retry', 'Cancel'] : ['OK'];
    }
  }

  // Show the dialog
  const win = getWin();
  if (!win) {
    return undefined;
  }
  const result = await dialog.showMessageBox(win, {
    message: message as string,
    title: title == null ? 'Error' : (title || ' '),
    type: type || 'error',
    noLink: true,
    textWidth: 320,
    defaultId: 0,
    icon: nativeImage.createFromPath(ICON),
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
  app.quit();
  return response;
};
