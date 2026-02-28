interface UpdateResult {
  success: boolean;
  message: string;
  status?: 'checking' | 'up-to-date' | 'available' | 'error';
  version?: string;
}

const NO_RESULT_TIMEOUT_MS = 100;
let checking = false;

const createSuccess = (
  message: string,
  status: UpdateResult['status'],
  version?: string
): UpdateResult => ({
  success: true,
  message,
  status,
  version,
});

const createFailure = (message: string): UpdateResult => ({
  success: false,
  message,
  status: 'error',
});

export const checkForUpdates = async (): Promise<UpdateResult> => {
  if (checking) {
    return createFailure('Update check is already checking in progress.');
  }

  // Resolve dependencies lazily so tests can stub per invocation.
  // eslint-disable-next-line global-require
  const { app } = require('electron') as typeof import('electron');
  // eslint-disable-next-line global-require
  const { autoUpdater } = require('electron-updater') as { autoUpdater: any };

  if (!app.isPackaged) {
    return createFailure('Auto update is only available in packaged builds.');
  }

  checking = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  return new Promise<UpdateResult>(async (resolve) => {
    let settled = false;

    const done = (result: UpdateResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      checking = false;
      resolve(result);
    };

    autoUpdater.on('update-not-available', () => {
      done(createSuccess('Prokcy is up to date.', 'up-to-date'));
    });

    autoUpdater.on('update-available', (info: { version?: string } = {}) => {
      const version = typeof info.version === 'string' ? info.version : '';
      done(createSuccess(
        version
          ? `Update ${version} found. Downloading now...`
          : 'New update found. Downloading now...',
        'available',
        version || undefined,
      ));
    });

    autoUpdater.on('update-downloaded', (info: { version?: string } = {}) => {
      const version = typeof info.version === 'string' ? info.version : '';
      autoUpdater.quitAndInstall();
      done(createSuccess(
        version
          ? `Update ${version} downloaded. Installing now...`
          : 'Update downloaded. Installing now...',
        'available',
        version || undefined,
      ));
    });

    autoUpdater.on('error', (error: Error | unknown) => {
      const message = (error as Error)?.message || 'Failed to check for updates.';
      done(createFailure(message));
    });

    try {
      await autoUpdater.checkForUpdates();
      setTimeout(() => {
        done(createSuccess('Checking for updates...', 'checking'));
      }, NO_RESULT_TIMEOUT_MS);
    } catch (error) {
      const message = (error as Error)?.message || 'Failed to check for updates.';
      done(createFailure(message));
    }
  });
};

export type { UpdateResult };
