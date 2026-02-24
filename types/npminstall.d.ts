/**
 * Type declarations for npminstall package
 */

declare module 'npminstall' {
  import { Request } from 'npm-package-arg';

  interface NpmInstallOptions {
    /** Root directory for installation */
    root?: string;
    /** Array of packages to install */
    pkgs: Array<{
      /** Package name */
      name: string;
      /** Package version */
      version?: string;
      /** Package type */
      type?: string;
      /** Original package argument */
      arg?: Request;
    }>;
    /** Store directory for packages */
    storeDir?: string;
    /** Optional npm registry URL */
    registry?: string;
    /** Whether to ignore missing scripts */
    ignoreScripts?: boolean;
    /** Detailed installation output */
    detail?: boolean;
    /** Whether to install as production dependencies */
    production?: boolean;
  }

  interface NpmInstall {
    (options: NpmInstallOptions): Promise<void>;
  }

  const npminstall: NpmInstall;
  export default npminstall;
}

declare module 'npminstall/lib/npa' {
  import { Request } from 'npm-package-arg';

  interface NpaOptions {
    /** Base directory for resolution */
    where?: string;
    /** Nested package info */
    nested?: {
      /** Show path for nested package */
      showPath(arg: string): string;
    };
  }

  function npa(arg: string, options?: NpaOptions): Request;

  export = npa;
}

declare module 'npminstall/lib/context' {
  class Context {
    nested?: {
      showPath(arg: string): string;
    };
  }

  export = Context;
}

declare module 'whistle/lib/util/common' {
  /**
   * Regular expression to match Whistle plugin names
   * Pattern: ^whistle\.
   */
  export const WHISTLE_PLUGIN_RE: RegExp;

  /**
   * Get peer plugins from installed packages
   * @param pkgs - Array of installed packages
   * @param rootPath - Root directory to search for peer plugins
   * @param callback - Callback function receiving array of peer plugin packages
   */
  export function getPeerPlugins(
    pkgs: Array<Record<string, unknown>>,
    rootPath: string,
    callback: (pkgs: Array<Record<string, unknown>>) => void
  ): void;
}
