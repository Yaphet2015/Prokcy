const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');

function withUpdaterHarness(t, overrides = {}) {
  const originalLoad = Module._load;
  const updaterPath = require.resolve('../../lib/updater');

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

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return { app };
    }
    if (request === 'electron-updater') {
      return { autoUpdater };
    }
    if (request === './dialog' || request.endsWith('/lib/dialog')) {
      return { showMessageBox };
    }
    if (request === './storage' || request.endsWith('/lib/storage')) {
      return { __esModule: true, default: storage };
    }
    return originalLoad(request, parent, isMain);
  };

  t.after(() => {
    Module._load = originalLoad;
    delete require.cache[updaterPath];
  });

  delete require.cache[updaterPath];
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const updater = require('../../lib/updater');

  return { updater, calls, events, app, store };
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
