/**
 * Type for rules configuration from whistle
 */
export interface RulesConfig {
    disabled?: boolean;
    list?: Array<{
        name: string;
        selected: boolean;
    }>;
}
/**
 * Main export: Create application menu and system tray
 */
export declare const create: () => Promise<void>;
/**
 * Update rules configuration and refresh tray menu
 */
export declare const updateRules: (rulesConf: RulesConfig) => void;
/**
 * Refresh proxy status in menu
 */
export declare const refreshProxyStatus: () => void;
//# sourceMappingURL=menu.d.ts.map