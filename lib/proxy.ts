import path from 'path';
import requireW2 from 'whistle/require';
import { compareFile, BASE_DIR, LOCALHOST, sudoPromptExec } from './util';

const setGlobalProxy = requireW2('set-global-proxy') as {
  enableProxy: (options: {
    port: number;
    host?: string;
    bypass?: string;
    proxyHelper: string;
  }) => void;
  disableProxy: (proxyHelper: string) => void;
  getMacProxyHelper: () => string | undefined;
  getUid: (filePath: string) => number;
};

const TITLE = 'Prokcy';
const DISABLED_TITLE = 'Prokcy (system proxy disabled)';
const PROXY_HELPER = path.join(BASE_DIR, 'whistle');

/**
 * Internal state tracking whether system proxy is enabled
 * undefined = unknown, true = enabled, false = disabled
 */
let proxyEnabled: boolean | undefined;

/**
 * Install the proxy helper binary for macOS
 * Copies the helper from the original location to BASE_DIR and sets proper ownership/permissions
 * This requires sudo privileges
 *
 * @returns Promise that resolves when installation is complete
 */
const installProxyHelper = async (): Promise<void> => {
  const originHelper = setGlobalProxy.getMacProxyHelper();
  if (!originHelper) {
    return;
  }

  // Check if helper is already installed with correct permissions
  const uid = setGlobalProxy.getUid(PROXY_HELPER);
  if (uid === 0 && (await compareFile(PROXY_HELPER, originHelper))) {
    return;
  }

  // Copy helper and set ownership/permissions
  const command = `cp "${originHelper}" "${PROXY_HELPER}" && chown root:admin "${PROXY_HELPER}" && chmod a+rx+s "${PROXY_HELPER}"`;

  return new Promise((resolve, reject) => {
    sudoPromptExec(command, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

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
export const enableProxy = async (options: ProxyOptions): Promise<void> => {
  await installProxyHelper();
  setGlobalProxy.enableProxy({
    port: options.port,
    host: options.host || LOCALHOST,
    bypass: options.bypass,
    proxyHelper: PROXY_HELPER,
  });
  proxyEnabled = true;
};

/**
 * Disable system proxy
 * Restores system network settings to not use a proxy
 */
export const disableProxy = async (): Promise<void> => {
  await installProxyHelper();
  setGlobalProxy.disableProxy(PROXY_HELPER);
  proxyEnabled = false;
};

/**
 * Check if system proxy is currently enabled
 *
 * @returns true if proxy is enabled, false if disabled, undefined if unknown
 */
export const isEnabled = (): boolean | undefined => proxyEnabled;

/**
 * Manually set the enabled state
 * Used to synchronize state with actual system settings
 *
 * @param flag - The enabled state to set
 */
export const setEnabled = (flag: boolean): void => {
  proxyEnabled = flag;
};

/**
 * Get the window title based on proxy status
 * Shows "(system proxy disabled)" suffix when proxy is disabled
 *
 * @returns The appropriate window title
 */
export const getTitle = (): string =>
  proxyEnabled !== false ? TITLE : DISABLED_TITLE;
