/**
 * Type declarations for whistle library modules
 */

declare module 'whistle/lib/rules/storage' {
  /**
   * Properties cache structure
   */
  interface PropertiesCache {
    [key: string]: unknown;
    filesOrder?: string[];
  }

  /**
   * Files cache structure
   */
  interface FilesCache {
    [filename: string]: {
      index: number;
      name: string;
      data: string;
    };
  }

  /**
   * Storage cache structure
   */
  interface Cache {
    maxIndex: number;
    files: FilesCache;
    properties: PropertiesCache;
  }

  /**
   * Storage class for managing persistent data
   * Used by whistle to store rules, values, and properties
   */
  class Storage {
    /**
     * Internal storage directory path
     */
    _files: string;

    /**
     * Properties file path
     */
    _properties: string;

    /**
     * Backup properties file path
     */
    _backupProps: string;

    /**
     * Cache containing files and properties
     */
    _cache: Cache;

    /**
     * Whether storage is disabled
     */
    _disabled: boolean;

    /**
     * Create a new Storage instance
     * @param dirPath - Directory path for storage files
     */
    constructor(dirPath: string);

    /**
     * Set a property value
     * @param name - Property name
     * @param value - Property value
     */
    setProperty(name: string, value: unknown): void;

    /**
     * Get a property value
     * @param name - Property name
     * @returns Property value or null if not found/disabled
     */
    getProperty(name: string): unknown;

    /**
     * Check if a property exists
     * @param name - Property name
     * @returns true if property exists
     */
    hasProperty(name: string): boolean;

    /**
     * Remove a property
     * @param name - Property name
     */
    removeProperty(name: string): void;

    /**
     * Set multiple properties at once
     * @param obj - Object containing properties to set
     * @returns true if successful
     */
    setProperties(obj: Record<string, unknown>): boolean;

    /**
     * Disable storage operations
     */
    disable(): void;

    /**
     * Enable storage operations
     */
    enable(): void;
  }

  export default Storage;
}

declare module 'whistle/require' {
  /**
   * Require a module from the whistle installation
   */
  interface RequireW2 {
    /**
     * @param moduleName - Name of the module to require
     * @returns The required module
     */
    <T = unknown>(moduleName: string): T;
  }

  const requireW2: RequireW2;

  export = requireW2;
}

declare module 'whistle/bin/ca' {
  /**
   * Install the root CA certificate
   * @param rootCAFile - Path to the root CA file
   * @param execSudo - Function to execute sudo commands
   * @returns Promise that resolves to true if execSudo was used
   */
  function installRootCAFile(
    rootCAFile: string,
    execSudo: (cmd: string, callback: (err: Error | null) => void) => void
  ): Promise<boolean>;

  export = installRootCAFile;
}

declare module 'whistle' {
  /**
   * Get the whistle path
   * @returns The whistle installation path
   */
  function getWhistlePath(): string;

  export { getWhistlePath };
}
