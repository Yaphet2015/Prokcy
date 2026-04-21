const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadIndexHarness(t) {
  const originalLoad = Module._load;
  const indexPath = require.resolve('../../lib/index');

  const callOrder = [];
  const appEvents = new Map();
  const app = {
    setName: () => {},
    requestSingleInstanceLock: () => true,
    on: (name, handler) => {
      appEvents.set(name, handler);
    },
    whenReady: () => Promise.resolve(),
    userAgentFallback: 'Electron',
    dock: null,
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app,
        globalShortcut: {
          register: () => {},
          unregister: () => {},
        },
        BrowserWindow: {
          getAllWindows: () => [],
          getFocusedWindow: () => null,
        },
        Menu: {
          buildFromTemplate: () => ({ items: [] }),
        },
        shell: {
          openExternal: () => {},
        },
        systemPreferences: {
          setUserDefault: () => {},
        },
      };
    }
    if (request === 'whistle/lib/util/common') {
      return {
        writeLogSync: () => {},
      };
    }
    if (request === './util') {
      return {
        noop: () => {},
        DOCK_ICON: '',
        showWin: () => {},
        getErrorStack: (error) => String(error),
        getErrorMsg: (error) => String(error),
        isMac: false,
        getDataUrl: () => '',
      };
    }
    if (request === './context') {
      return {
        setDataUrl: () => {},
        getWin: () => null,
        getOptions: () => null,
        execJsSafe: () => {},
      };
    }
    if (request === './dialog') {
      return {
        showMessageBox: () => Promise.resolve(0),
      };
    }
    if (request === './window') {
      return {
        createWindow: () => {
          callOrder.push('createWindow');
        },
        restart: () => {},
        showWindow: () => {},
      };
    }
    if (request === './preferences') {
      return {
        applyThemeMode: () => {
          callOrder.push('applyThemeMode');
        },
      };
    }
    if (request === './fork') {
      return () => {
        callOrder.push('forkWhistle');
      };
    }
    if (request === './updater') {
      return {
        checkForUpdates: (options) => {
          callOrder.push(['checkForUpdates', options]);
          return Promise.resolve({ success: true });
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  t.after(() => {
    Module._load = originalLoad;
    delete require.cache[indexPath];
  });

  delete require.cache[indexPath];
  require('../../lib/index');

  return { callOrder, appEvents };
}

test('app startup performs a silent update check after creating the window', async (t) => {
  const { callOrder } = loadIndexHarness(t);

  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(callOrder, [
    'applyThemeMode',
    'createWindow',
    ['checkForUpdates', { silent: true, source: 'startup' }],
    'forkWhistle',
  ]);
});
