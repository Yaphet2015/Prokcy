/**
 * Type declarations for whistle's Storage class
 * This is a minimal interface based on actual usage in the codebase
 */

declare module 'whistle/lib/rules/storage' {
  /**
   * Filter options for Storage
   */
  interface StorageFilters {
    [key: string]: boolean;
  }

  /**
   * Storage class for persisting key-value settings and files
   * @param dir - Directory path for storage
   * @param filters - Optional filter object
   * @param disabled - Whether storage is disabled
   * @param allows - Optional allowed properties
   */
  class Storage {
    constructor(
      dir: string,
      filters?: StorageFilters,
      disabled?: boolean,
      allows?: string[]
    );

    /**
     * Get a property value by key
     * @param name - The property name
     * @returns The property value (can be any type)
     */
    getProperty<T = unknown>(name: string): T;

    /**
     * Set a property value by key
     * @param name - The property name
     * @param value - The value to set
     */
    setProperty(name: string, value: unknown): void;

    /**
     * Add a value to a property (creates array if needed)
     * @param name - The property name
     * @param value - The value to add
     */
    addProperty(name: string, value: unknown): void;

    /**
     * Remove a value from a property array
     * @param name - The property name
     * @param value - The value to remove
     */
    removeProperty(name: string, value: unknown): void;

    /**
     * Get all properties as an object
     * @returns Object containing all properties
     */
    allProperties(): Record<string, unknown>;

    /**
     * Clear all properties
     */
    clear(): void;
  }

  export = Storage;
}
