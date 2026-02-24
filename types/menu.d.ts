/**
 * Create the application menu
 * Sets up the main menu and tray icon
 */
declare function create(): Promise<void>;

/**
 * Update rules from Whistle utility process
 * Updates the rules menu items
 *
 * @param rulesConf - The updated rules configuration
 */
declare function updateRules(rulesConf: unknown): void;

/**
 * Refresh the proxy status in the menu
 * Updates the menu items based on current proxy state
 */
declare function refreshProxyStatus(): void;

export { create, updateRules, refreshProxyStatus };
