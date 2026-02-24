/**
 * Interface for proxy options passed to enableProxy
 */
export interface ProxyOptions {
    port: number;
    host?: string;
    bypass?: string;
}
/**
 * Enable system proxy for all network traffic
 * On macOS, this installs the proxy helper if needed and configures system proxy settings
 *
 * @param options - Proxy configuration including port, host, and bypass list
 */
export declare const enableProxy: (options: ProxyOptions) => Promise<void>;
/**
 * Disable system proxy
 * Restores system network settings to not use a proxy
 */
export declare const disableProxy: () => Promise<void>;
/**
 * Check if system proxy is currently enabled
 *
 * @returns true if proxy is enabled, false if disabled, undefined if unknown
 */
export declare const isEnabled: () => boolean | undefined;
/**
 * Manually set the enabled state
 * Used to synchronize state with actual system settings
 *
 * @param flag - The enabled state to set
 */
export declare const setEnabled: (flag: boolean) => void;
/**
 * Get the window title based on proxy status
 * Shows "(system proxy disabled)" suffix when proxy is disabled
 *
 * @returns The appropriate window title
 */
export declare const getTitle: () => string;
//# sourceMappingURL=proxy.d.ts.map