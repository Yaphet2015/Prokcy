import type Storage from 'whistle/lib/rules/storage';
export declare const authorization: string;
export interface ProxySettings {
    port: string;
    socksPort?: string;
    username?: string;
    password?: string;
    uiAuth: {
        username: string;
        password: string;
    };
    host: string;
    bypass: string;
    useDefaultStorage: boolean;
    maxHttpHeaderSize: number;
    requestListLimit: number;
}
type SettingsInput = Storage | Record<string, unknown>;
interface ApplySettingsOptions {
    hideOnSuccess?: boolean;
    showErrorToast?: boolean;
}
interface ApplySettingsResult {
    success: boolean;
    message?: string;
    changed?: boolean;
    needsRestart?: boolean;
}
/**
 * Get current proxy settings from storage
 * @returns Current ProxySettings
 */
export declare const getSettings: () => ProxySettings;
/**
 * Apply new proxy settings
 * Validates settings, updates system proxy if needed, and persists to storage
 *
 * @param rawData - New settings data
 * @param options - Options for behavior
 * @returns Promise with result object
 */
export declare const applySettings: (rawData: SettingsInput, options?: ApplySettingsOptions) => Promise<ApplySettingsResult>;
/**
 * Reload the main page if storage directory changed
 */
export declare const reloadPage: () => void;
/**
 * Show the settings window
 * Creates window on first call, shows existing window on subsequent calls
 */
export declare const showSettingsWindow: () => void;
export {};
//# sourceMappingURL=settings.d.ts.map