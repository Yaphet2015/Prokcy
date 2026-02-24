type TabName = 'Network' | 'Rules' | 'Values' | 'Plugins' | 'Settings';
/**
 * Show the main window and optionally navigate to a specific tab
 * @param name - Optional tab name to navigate to
 */
export declare const showWindow: (name?: TabName) => void;
/**
 * Create and configure the main BrowserWindow
 * Sets up window lifecycle events and loads the React app
 */
export declare const createWindow: () => void;
/**
 * Check if the application is in the process of quitting
 * @returns true if willQuit flag is set
 */
export declare const willQuitActive: () => boolean;
/**
 * Restart the application
 * Cleans up current instance and relaunches
 */
export declare const restart: () => Promise<void>;
export {};
//# sourceMappingURL=window.d.ts.map