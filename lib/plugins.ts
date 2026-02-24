import npminstall from 'npminstall';
import fs from 'fs';
import npa from 'npminstall/lib/npa';
import Context from 'npminstall/lib/context';
import { getPeerPlugins, WHISTLE_PLUGIN_RE } from 'whistle/lib/util/common';
import { showMessageBox } from './dialog';
import { CLIENT_PLUGINS_PATH, noop } from './util';
import { sendMsg } from './context';

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
 * Send message to refresh plugins in the worker process
 */
const refreshPlugins = (): void => {
  sendMsg({ type: 'refreshPlugins' });
};

/**
 * Add registry configuration to the worker process
 * @param registry - Registry URL to add
 */
const addRegistry = (registry: string | undefined): void => {
  if (registry) {
    sendMsg({ type: 'addRegistry', registry });
  }
};

/**
 * Install packages using npminstall
 * @param data - Installation data containing packages and options
 * @returns Promise that resolves to true on success, undefined on failure
 */
const install = async (data: InstallData): Promise<boolean | undefined> => {
  let context: InstanceType<typeof Context> | undefined;
  const tgzFiles: string[] = [];

  // Process each package to normalize names and versions
  data.pkgs.forEach((pkg) => {
    const { name } = pkg;
    if (name && !WHISTLE_PLUGIN_RE.test(name)) {
      try {
        context = context || new Context();
        const p = npa(name, { where: data.root, nested: context.nested });
        pkg.name = p.name;
        pkg.version = p.fetchSpec || p.rawSpec;
        pkg.type = p.type;
        pkg.arg = p;
        // Track local .tgz files for cleanup
        if (!name.indexOf('file:')) {
          tgzFiles.push(name.substring(5));
        }
      } catch (e) {
        // Ignore errors during package name parsing
      }
    }
  });

  try {
    await npminstall(data);
    refreshPlugins();

    // Clean up temporary .tgz files
    tgzFiles.forEach((file) => {
      fs.unlink(file, noop);
    });

    return true;
  } catch (e) {
    // Show error message dialog with retry option
    // Note: showMessageBox handles the error, and the callback may retry
    showMessageBox(e, () => install(data));
    return undefined;
  }
};

/**
 * Install Whistle plugins with proper configuration
 * Sets root directory to client plugins path and handles peer dependencies
 * @param data - Installation data containing packages to install
 * @returns Promise that resolves when installation is complete
 */
const installPlugins = async (data: InstallData): Promise<void> => {
  data.root = CLIENT_PLUGINS_PATH;

  // Perform initial installation
  if (!(await install(data))) {
    return;
  }

  // Handle peer plugins
  getPeerPlugins(data.pkgs, CLIENT_PLUGINS_PATH, (pkgs) => {
    data.pkgs = pkgs as PackageArg[];
    if (data.pkgs.length) {
      install(data);
    }
    addRegistry(data.registry);
  });
};

/**
 * Install Whistle plugins
 * This is the main exported function for plugin installation
 * @param data - Installation data containing packages and options
 */
export { installPlugins as install };
