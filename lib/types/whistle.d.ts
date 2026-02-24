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
