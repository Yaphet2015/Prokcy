import path from 'path';
import Storage from 'whistle/lib/rules/storage';
import { BASE_DIR } from './util';

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
  lowMemoryMode?: boolean;
  networkPollingCount?: number;
  trackedRequestIdsLimit?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

/**
 * Storage instance for proxy settings
 * Persists settings to ~/.whistle_client/proxy_settings
 */
const storageInstance = new Storage(
  path.join(BASE_DIR, 'proxy_settings')
);

export default storageInstance;
