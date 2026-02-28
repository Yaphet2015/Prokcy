const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');

function withUpdaterHarness(t, overrides = {}) {
  const originalLoad = Module._load;

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
      return null;
    },
    quitAndInstall: () => {
      calls.quitAndInstall += 1;
    },
  };

  const app = {
    isPackaged: overrides.isPackaged ?? true,
  };

  const showMessageBox = async (message, options) => {
    calls.messageBoxes.push({ message, options });
    return 0;
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
    return originalLoad(request, parent, isMain);
  };

  t.after(() => {
    Module._load = originalLoad;
  });

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const updater = require('../../lib/updater');

  return { updater, calls, events, app };
}

test('checkForUpdates triggers updater check and reports up-to-date state', async (t) => {
  const { updater, calls, events } = withUpdaterHarness(t);

  const promise = updater.checkForUpdates();
  events.emit('update-not-available');
  const result = await promise;

  assert.equal(calls.checkForUpdates, 1);
  assert.equal(result.success, true);
  assert.match(result.message, /up to date/i);
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

test('downloaded updates trigger immediate install', async (t) => {
  const { updater, calls, events } = withUpdaterHarness(t);

  const promise = updater.checkForUpdates();
  events.emit('update-available', { version: '9.9.9' });
  events.emit('update-downloaded', { version: '9.9.9' });

  await promise;
  assert.equal(calls.quitAndInstall, 1);
});
