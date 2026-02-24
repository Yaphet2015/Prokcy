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
export declare const showMessageBox: (message: string | Error | unknown, callback?: ((retry: boolean) => void) | MessageBoxOptions, showSettings?: (() => void) | boolean, handleCancel?: (() => void)) => Promise<number | undefined>;
//# sourceMappingURL=dialog.d.ts.map