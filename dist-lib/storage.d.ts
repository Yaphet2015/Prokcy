import Storage from 'whistle/lib/rules/storage';
/**
 * Type for proxy settings stored in the storage
 */
export interface ProxySettings {
    [key: string]: unknown;
    port?: string;
    socksPort?: string;
    username?: string;
    password?: string;
    host?: string;
    bypass?: string;
    useDefaultStorage?: boolean;
    maxHttpHeaderSize?: number;
    requestListLimit?: number;
}
/**
 * Storage instance for proxy settings
 * Persists settings to ~/.whistle_client/proxy_settings
 */
declare const storageInstance: Storage;
export default storageInstance;
//# sourceMappingURL=storage.d.ts.map