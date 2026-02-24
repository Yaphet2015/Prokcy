import npa from 'npminstall/lib/npa';
/**
 * Represents a package argument for installation
 */
interface PackageArg extends Record<string, unknown> {
    /** Package name */
    name: string;
    /** Package version */
    version?: string;
    /** Package type (e.g., 'tag', 'version', 'range', 'local', etc.) */
    type?: string;
    /** Original package argument object from npa */
    arg?: ReturnType<typeof npa>;
}
/**
 * Installation data for plugins
 */
interface InstallData {
    /** Array of packages to install */
    pkgs: PackageArg[];
    /** Root directory for installation */
    root?: string;
    /** Optional npm registry URL */
    registry?: string;
    /** Store directory for packages */
    storeDir?: string;
    /** Whether to ignore missing scripts */
    ignoreScripts?: boolean;
    /** Detailed installation output */
    detail?: boolean;
    /** Whether to install as production dependencies */
    production?: boolean;
}
/**
 * Install Whistle plugins with proper configuration
 * Sets root directory to client plugins path and handles peer dependencies
 * @param data - Installation data containing packages to install
 * @returns Promise that resolves when installation is complete
 */
declare const installPlugins: (data: InstallData) => Promise<void>;
/**
 * Install Whistle plugins
 * This is the main exported function for plugin installation
 * @param data - Installation data containing packages and options
 */
export { installPlugins as install };
//# sourceMappingURL=plugins.d.ts.map