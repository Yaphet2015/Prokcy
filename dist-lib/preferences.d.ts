/**
 * Theme mode options matching Electron's nativeTheme.themeSource
 * - 'system': Follow system appearance
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 */
export type ThemeMode = 'system' | 'light' | 'dark';
/**
 * Preferences returned to the renderer process
 */
export interface PreferencesData {
    startAtLogin: boolean;
    hideFromDock: boolean;
    themeMode: ThemeMode;
    rulesOrder: string[];
    requestFilters: string;
    systemProxyEnabled: boolean;
}
/**
 * Get the current theme mode preference
 * @returns The current theme mode ('system' | 'light' | 'dark')
 */
export declare const getThemeMode: () => ThemeMode;
/**
 * Apply theme mode to both Electron's nativeTheme and persist to storage
 * @param mode - The theme mode to apply (defaults to current stored value)
 * @returns The normalized theme mode that was applied
 */
export declare const applyThemeMode: (mode?: ThemeMode) => ThemeMode;
/**
 * Get whether the app should start at login
 * @returns true if app starts at login
 */
export declare const getStartAtLogin: () => boolean;
/**
 * Set whether the app should start at login
 * Also updates the system login item settings when packaged
 * @param startAtLogin - Whether to start at login
 * @returns The enabled state
 */
export declare const setStartAtLogin: (startAtLogin: unknown) => boolean;
/**
 * Get whether the app should hide from dock (macOS only)
 * @returns true if app should hide from dock
 */
export declare const getHideFromDock: () => boolean;
/**
 * Set whether the app should hide from dock (macOS only)
 * @param hideFromDock - Whether to hide from dock
 * @returns The enabled state
 */
export declare const setHideFromDock: (hideFromDock: unknown) => boolean;
/**
 * Get the order of rule groups
 * Returns a deduplicated array of rule group names
 * @returns Array of rule group names in order
 */
export declare const getRulesOrder: () => string[];
/**
 * Set the order of rule groups
 * Deduplicates and filters the input to ensure valid strings
 * @param order - Array of rule group names
 * @returns The normalized and deduplicated array
 */
export declare const setRulesOrder: (order: unknown) => string[];
/**
 * Get the request filters pattern string
 * @returns The request filters pattern (empty string if not set)
 */
export declare const getRequestFilters: () => string;
/**
 * Set the request filters pattern string
 * @param filters - The pattern string to set
 * @returns The normalized pattern (empty string if invalid)
 */
export declare const setRequestFilters: (filters: unknown) => string;
/**
 * Get whether system proxy is automatically configured
 * @returns true if system proxy auto-configuration is enabled
 */
export declare const getSystemProxyEnabled: () => boolean;
/**
 * Get all preferences as a single object
 * Useful for sending the complete state to the renderer process
 * @returns Object containing all preference values
 */
export declare const getPreferences: () => PreferencesData;
//# sourceMappingURL=preferences.d.ts.map