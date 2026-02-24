// Whistle type declarations (stubs for untyped dependencies)
declare module 'whistle' {
  export interface WhistleOptions {
    port: number;
    host?: string;
    socksPort?: number;
    username?: string;
    password?: string;
    uiAuth?: { username?: string; password?: string };
    maxHttpHeaderSize?: number;
  }

  export interface RulesPayload {
    [key: string]: any;
    defalutRules?: string;
    list?: Array<{ name: string; selected: boolean }>;
  }

  export function startWhistle(options: WhistleOptions): any;
  export function getWhistlePath(): string;
}

declare module 'whistle/require' {
  export default function requireW2(name: string): any;
}

declare module 'whistle/lib/util/common' {
  export function writeLogSync(message: string): void;
}

declare module 'whistle.proxyauth' {
  const version: string;
  export default version;
}

declare module 'whistle/lib/rules/storage' {
  /**
   * Whistle Storage class for persisting rules and properties
   */
  class Storage {
    [key: string]: unknown;
    constructor(dir: string, filters?: Record<string, boolean>, disabled?: boolean, allows?: Record<string, boolean>);

    /**
     * Get a property value by name
     */
    getProperty(name: string): unknown;

    /**
     * Set multiple properties at once
     */
    setProperties(obj: Record<string, unknown>): boolean | undefined;

    /**
     * Remove a property
     */
    removeProperty(name: string): void;

    /**
     * Check if a property exists
     */
    hasProperty(name: string): boolean;

    /**
     * Get the count of files
     */
    count(): number;

    /**
     * Check if a file exists
     */
    existsFile(file: string): boolean;

    /**
     * Get list of files
     */
    getFileList(origObj?: boolean): Array<{
      index: number;
      name: string;
      data?: string;
      selected?: boolean;
    }>;

    /**
     * Add a new file
     */
    add(name: string, data: string, selected?: boolean): void;

    /**
     * Update an existing file
     */
    update(name: string, data: string): boolean;

    /**
     * Remove a file
     */
    remove(name: string): boolean;

    /**
     * Storage cache containing properties and files
     */
    _cache: {
      properties: Record<string, unknown>;
      files: Record<string, {
        index: number;
        name: string;
        data: string;
        selected?: boolean;
      }>;
    };
  }

  export default Storage;
}

declare module 'set-global-proxy' {
  /**
   * Enable system proxy settings
   * @param options - Proxy configuration options
   */
  export function enableProxy(options: {
    port: number;
    host?: string;
    bypass?: string;
    proxyHelper: string;
  }): void;

  /**
   * Disable system proxy settings
   * @param proxyHelper - Path to the proxy helper binary
   */
  export function disableProxy(proxyHelper: string): void;

  /**
   * Get the path to the macOS proxy helper binary
   * @returns Path to the proxy helper or undefined if not on macOS
   */
  export function getMacProxyHelper(): string | undefined;

  /**
   * Get the user ID (UID) of a file
   * @param filePath - Path to the file
   * @returns The UID of the file owner
   */
  export function getUid(filePath: string): number;
}
