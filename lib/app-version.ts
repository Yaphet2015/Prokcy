import { version as packageVersion } from '../package.json';

export const getAppVersion = (): string => {
  try {
    // Resolve lazily so tests and early startup code can stub Electron per load.
    // eslint-disable-next-line global-require
    const { app } = require('electron') as typeof import('electron');
    const runtimeVersion = typeof app?.getVersion === 'function' ? app.getVersion() : '';
    return runtimeVersion || packageVersion;
  } catch {
    return packageVersion;
  }
};
