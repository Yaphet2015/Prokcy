const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');

function withUpdaterHarness(t, overrides = {}) {
  const originalLoad = Module._load;
  const updaterPath = require.resolve('../../lib/updater');
  const originalPlatform = process.platform;

  if (overrides.platform) {
    Object.defineProperty(process, 'platform', {
      value: overrides.platform,
    });
  }

  const events = new EventEmitter();
  const calls = {
    checkForUpdates: 0,
    quitAndInstall: 0,
    messageBoxes: [],
  };

  const autoUpdater = {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    on: (name, handler) => {
      events.on(name, handler);
      return autoUpdater;
    },
    checkForUpdates: async () => {
      calls.checkForUpdates += 1;
      if (typeof overrides.autoUpdaterCheckForUpdates === 'function') {
        return overrides.autoUpdaterCheckForUpdates({ calls, events });
      }
      return null;
    },
    quitAndInstall: () => {
      calls.quitAndInstall += 1;
    },
  };

  const app = {
    ...new EventEmitter(),
    isPackaged: overrides.isPackaged ?? true,
    getVersion: () => overrides.appVersion ?? '1.0.0',
  };

  const showMessageBox = async (message, options) => {
    calls.messageBoxes.push({ message, options });
    return 0;
  };

  const store = {};
  const storage = {
    getProperty: (name) => store[name],
    setProperty: (name, value) => {
      store[name] = value;
    },
  };
  const diagnosticsDir = path.join(os.tmpdir(), `prokcy-updater-test-${Date.now()}-${Math.random()}`);

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return { app };
    }
    if (request === 'electron-updater') {
      return { autoUpdater };
    }
    if (request === 'node:child_process' || request === 'child_process') {
      return {
        spawnSync: () => ({
          status: 0,
          stdout: '',
          stderr: overrides.developerIdSigned === false
            ? 'Signature=adhoc\n'
            : 'Authority=Developer ID Application: Yaphet\n',
        }),
      };
    }
    if (request === './dialog' || request.endsWith('/lib/dialog')) {
      return { showMessageBox };
    }
    if (request === './storage' || request.endsWith('/lib/storage')) {
      return { __esModule: true, default: storage };
    }
    if (request === './util' || request.endsWith('/lib/util')) {
      return { BASE_DIR: diagnosticsDir };
    }
    return originalLoad(request, parent, isMain);
  };

  t.after(() => {
    Module._load = originalLoad;
    if (overrides.platform) {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      });
    }
    delete require.cache[updaterPath];
  });

  delete require.cache[updaterPath];
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const updater = require('../../lib/updater');

  return { updater, calls, events, app, store, autoUpdater };
}

test('checkForUpdates triggers updater check and reports up-to-date state', async (t) => {
  const { updater, calls, events } = withUpdaterHarness(t);

  const promise = updater.checkForUpdates();
  events.emit('update-not-available');
  const result = await promise;

  assert.equal(calls.checkForUpdates, 1);
  assert.equal(result.success, true);
  assert.match(result.message, /checking|up to date/i);
  const status = updater.getUpdateStatus();
  assert.equal(status.phase, 'up-to-date');
});

test('checkForUpdates rejects concurrent requests while check is in progress', async (t) => {
  const { updater, calls } = withUpdaterHarness(t);

  const first = updater.checkForUpdates();
  const second = await updater.checkForUpdates();

  assert.equal(calls.checkForUpdates, 1);
  assert.equal(second.success, false);
  assert.match(second.message, /already checking/i);

  await first.catch(() => {});
});

test('downloaded updates do not auto-install and become installable', async (t) => {
  const { updater, calls, events } = withUpdaterHarness(t);

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '9.9.9' });
  events.emit('update-downloaded', { version: '9.9.9', downloadedFile: __filename });

  await promise;
  assert.equal(calls.quitAndInstall, 0);
  const status = updater.getUpdateStatus();
  assert.equal(status.canInstall, true);
  assert.equal(status.phase, 'downloaded');
  assert.equal(status.version, '9.9.9');
});

test('unsigned macOS update availability switches to manual download without auto-download', async (t) => {
  const { updater, calls, events, autoUpdater } = withUpdaterHarness(t, {
    platform: 'darwin',
    developerIdSigned: false,
  });

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '9.9.9' });
  const result = await promise;

  assert.equal(calls.checkForUpdates, 1);
  assert.equal(autoUpdater.autoDownload, false);
  assert.equal(result.success, true);
  assert.equal(result.status, 'manual-download');
  assert.equal(result.version, '9.9.9');
  assert.match(result.manualDownloadUrl, /Prokcy-v9\.9\.9-mac-arm64\.dmg$/);
  assert.equal(result.homebrewCommand, 'brew upgrade --cask prokcy');

  const status = updater.getUpdateStatus();
  assert.equal(status.phase, 'manual-download');
  assert.equal(status.downloading, false);
  assert.equal(status.canInstall, false);
  assert.equal(status.homebrewCommand, 'brew upgrade --cask prokcy');
});

test('unsigned macOS ignores update availability that is not newer than current app', async (t) => {
  const { updater, calls, events } = withUpdaterHarness(t, {
    platform: 'darwin',
    developerIdSigned: false,
    appVersion: '1.8.16',
  });

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '1.8.14' });
  const result = await promise;

  assert.equal(calls.checkForUpdates, 1);
  assert.equal(result.success, true);
  assert.equal(result.status, 'up-to-date');
  assert.equal(result.version, undefined);
  assert.match(result.message, /up to date/i);

  const status = updater.getUpdateStatus();
  assert.equal(status.phase, 'up-to-date');
  assert.equal(status.version, undefined);
  assert.equal(status.canInstall, false);
  assert.equal(status.manualDownloadUrl, undefined);
  assert.equal(status.homebrewCommand, undefined);
});

test('installDownloadedUpdate triggers quitAndInstall for cached update', async (t) => {
  const { updater, calls, events } = withUpdaterHarness(t);

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '9.9.9' });
  events.emit('update-downloaded', { version: '9.9.9', downloadedFile: __filename });
  await promise;

  const result = await updater.installDownloadedUpdate();
  assert.equal(result.success, true);
  assert.equal(calls.quitAndInstall, 1);
});

test('unsigned macOS install uses manual download instead of quitAndInstall', async (t) => {
  const { updater, calls, events } = withUpdaterHarness(t, {
    platform: 'darwin',
    developerIdSigned: false,
  });

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '9.9.9' });
  events.emit('update-downloaded', { version: '9.9.9', downloadedFile: __filename });
  await promise;

  const result = await updater.installDownloadedUpdate();

  assert.equal(calls.quitAndInstall, 0);
  assert.equal(result.success, true);
  assert.equal(result.status, 'manual-download');
  assert.equal(result.homebrewCommand, 'brew upgrade --cask prokcy');

  const status = updater.getUpdateStatus();
  assert.equal(status.phase, 'manual-download');
  assert.equal(status.canInstall, false);
});

test('cached downloaded update older than current app is cleared instead of restored', async (t) => {
  const { updater, store } = withUpdaterHarness(t, {
    platform: 'darwin',
    developerIdSigned: false,
    appVersion: '1.8.16',
  });
  store.downloadedUpdateInfo = {
    version: '1.8.14',
    downloadedFile: __filename,
    downloadedAt: Date.now(),
  };

  const status = updater.getUpdateStatus();

  assert.equal(store.downloadedUpdateInfo, null);
  assert.equal(status.phase, 'idle');
  assert.equal(status.version, undefined);
  assert.equal(status.canInstall, false);
  assert.equal(status.manualDownloadUrl, undefined);
  assert.equal(status.homebrewCommand, undefined);
});

test('automatic checks reuse an in-flight update check', async (t) => {
  let resolveCheck;
  const { updater, calls } = withUpdaterHarness(t, {
    autoUpdaterCheckForUpdates: () => new Promise((resolve) => {
      resolveCheck = resolve;
    }),
  });

  const first = updater.checkForUpdates({ silent: true, source: 'startup' });
  const second = await updater.checkForUpdates({ silent: true, source: 'settings' });

  assert.equal(calls.checkForUpdates, 1);
  assert.equal(second.success, true);
  assert.equal(second.status, 'checking');

  resolveCheck(null);
  await first;
});

test('installDownloadedUpdate updates status to installing before quitting', async (t) => {
  const { updater, events } = withUpdaterHarness(t);

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '9.9.9' });
  events.emit('update-downloaded', { version: '9.9.9', downloadedFile: __filename });
  await promise;

  await updater.installDownloadedUpdate();

  const status = updater.getUpdateStatus();
  assert.equal(status.phase, 'installing');
  assert.equal(status.canInstall, false);
  assert.equal(status.downloading, false);
});

test('installDownloadedUpdate restores install action when quitAndInstall handoff stalls', async (t) => {
  const previousTimeout = process.env.PROKCY_UPDATE_INSTALL_TIMEOUT_MS;
  process.env.PROKCY_UPDATE_INSTALL_TIMEOUT_MS = '5';
  t.after(() => {
    if (previousTimeout === undefined) {
      delete process.env.PROKCY_UPDATE_INSTALL_TIMEOUT_MS;
    } else {
      process.env.PROKCY_UPDATE_INSTALL_TIMEOUT_MS = previousTimeout;
    }
  });

  const { updater, calls, events } = withUpdaterHarness(t);

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '9.9.9' });
  events.emit('update-downloaded', { version: '9.9.9', downloadedFile: __filename });
  await promise;

  await updater.installDownloadedUpdate();
  assert.equal(calls.quitAndInstall, 1);

  await new Promise((resolve) => setTimeout(resolve, 20));

  const status = updater.getUpdateStatus();
  assert.equal(status.phase, 'error');
  assert.equal(status.canInstall, true);
  assert.match(status.message, /did not start/i);
});

test('checkForUpdates returns a clean message when a macOS release has no zip artifact', async (t) => {
  const rawError = new Error('ZIP file not provided: [{"url":"Prokcy-v1.8.12-mac-arm64.dmg"}]');
  rawError.code = 'ERR_UPDATER_ZIP_FILE_NOT_FOUND';

  const { updater } = withUpdaterHarness(t, {
    autoUpdaterCheckForUpdates: () => {
      throw rawError;
    },
  });

  const result = await updater.checkForUpdates();
  const status = updater.getUpdateStatus();

  assert.equal(result.success, false);
  assert.equal(result.status, 'error');
  assert.equal(
    result.message,
    'This macOS release is missing the auto-update ZIP artifact. Please download the latest DMG from GitHub Releases or install the next patch release.',
  );
  assert.equal(status.phase, 'error');
  assert.equal(status.message, result.message);
  assert.doesNotMatch(result.message, /ZIP file not provided/);
  assert.doesNotMatch(result.message, /Prokcy-v1\.8\.12-mac-arm64\.dmg/);
});
