const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');

function createHttpStub(harness) {
  return {
    request(options, callback) {
      const req = new EventEmitter();
      req.write = () => {};
      req.destroy = (error) => {
        if (error) {
          req.emit('error', error);
        }
      };
      req.setTimeout = () => {};
      req.end = () => {
        process.nextTick(() => {
          if (!harness.healthAvailable) {
            req.emit('error', new Error('ECONNREFUSED'));
            return;
          }

          const res = new EventEmitter();
          res.statusCode = 200;
          res.setEncoding = () => {};
          callback(res);
          res.emit('data', JSON.stringify({ ec: 0, list: [] }));
          res.emit('end');
        });
      };
      harness.httpCalls.push(options);
      return req;
    },
  };
}

function createIpcHarness(t, overrides = {}) {
  const originalLoad = Module._load;
  const ipcPath = require.resolve('../../lib/ipc');

  const handlers = new Map();
  const sends = [];
  const state = {
    running: overrides.running ?? false,
    child: overrides.child ?? null,
    options: overrides.options ?? { host: '127.0.0.1', port: '8888' },
  };
  const calls = {
    forkWhistle: 0,
    setChild: [],
    setRunning: [],
  };

  const harness = {
    healthAvailable: overrides.healthAvailable ?? true,
    httpCalls: [],
  };

  const mainWindow = {
    isDestroyed: () => false,
    webContents: {
      send: (channel, payload) => {
        sends.push({ channel, payload });
      },
    },
    minimize: () => {},
    close: () => {},
    isMaximized: () => false,
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        ipcMain: {
          handle: (name, handler) => {
            handlers.set(name, handler);
          },
        },
        nativeTheme: {
          shouldUseDarkColors: false,
          on: () => {},
        },
        BrowserWindow: class {},
        shell: {
          openPath: async () => '',
        },
      };
    }
    if (request === 'http') {
      return createHttpStub(harness);
    }
    if (request === './window-controls') {
      return {
        toggleMaximize: () => {},
        bindMaximizeStateEvents: () => {},
      };
    }
    if (request === './context') {
      return {
        getOptions: () => state.options,
        getChild: () => state.child,
        isServiceRunning: () => state.running,
        setChild: (value) => {
          state.child = value;
          calls.setChild.push(value);
        },
        setRunning: (value) => {
          state.running = value;
          calls.setRunning.push(value);
        },
      };
    }
    if (request === './settings') {
      return {
        getSettings: () => ({
          host: '127.0.0.1',
          port: '8888',
          bypass: '',
          uiAuth: { username: '', password: '' },
        }),
        applySettings: async () => ({ success: true }),
      };
    }
    if (request === './preferences') {
      return {
        getPreferences: () => ({}),
        setRulesOrder: () => [],
        getRulesOrder: () => [],
        setStartAtLogin: () => {},
        setHideFromDock: () => {},
        applyThemeMode: () => {},
        setRequestFilters: () => {},
        setNetworkPollingCount: () => {},
        setTrackedRequestIdsLimit: () => {},
      };
    }
    if (request === './proxy') {
      return {
        enableProxy: async () => {},
        disableProxy: async () => {},
        isEnabled: () => false,
      };
    }
    if (request === './storage') {
      return {
        __esModule: true,
        default: {
          setProperty: () => {},
        },
      };
    }
    if (request === './menu') {
      return {
        refreshProxyStatus: () => {},
        refreshTheme: () => {},
      };
    }
    if (request === './updater') {
      return {
        checkForUpdates: async () => ({ success: true }),
        getUpdateStatus: () => ({ phase: 'idle', checking: false, downloading: false, canInstall: false }),
        installDownloadedUpdate: async () => ({ success: true }),
        onUpdateStatusChanged: () => () => {},
      };
    }
    if (request === './file-target') {
      return {
        resolveFileProtocolTarget: () => ({ kind: 'local-file', path: __filename }),
      };
    }
    if (request === './fork') {
      return () => {
        calls.forkWhistle += 1;
      };
    }
    return originalLoad(request, parent, isMain);
  };

  t.after(() => {
    Module._load = originalLoad;
    delete require.cache[ipcPath];
  });

  delete require.cache[ipcPath];
  const ipc = require('../../lib/ipc');
  ipc.initIpc(mainWindow);

  return {
    handlers,
    sends,
    state,
    calls,
    harness,
  };
}

test('get-service-status falls back to false and notifies renderer when health check fails', async (t) => {
  const { handlers, state, sends } = createIpcHarness(t, {
    running: true,
    healthAvailable: false,
  });

  const result = await handlers.get('get-service-status')();

  assert.equal(result.running, false);
  assert.equal(state.running, false);
  assert.deepEqual(sends, [
    { channel: 'service-status-changed', payload: { running: false } },
  ]);
});

test('get-runtime-config exposes health-based running state', async (t) => {
  const { handlers, harness } = createIpcHarness(t, {
    running: true,
    healthAvailable: false,
  });

  const result = await handlers.get('get-runtime-config')();

  assert.equal(result.running, false);
  assert.equal(harness.httpCalls[0].path, '/cgi-bin/values/list2');
});

test('stop-service still kills a residual child after health has fallen false', async (t) => {
  let killed = 0;
  const child = {
    kill: () => {
      killed += 1;
    },
  };
  const { handlers, state } = createIpcHarness(t, {
    running: false,
    child,
    healthAvailable: false,
  });

  const result = await handlers.get('stop-service')();

  assert.equal(result.success, true);
  assert.equal(killed, 1);
  assert.equal(state.child, null);
});

test('start-service clears a residual unhealthy child before forking again', async (t) => {
  let killed = 0;
  const child = {
    kill: () => {
      killed += 1;
    },
  };
  const { handlers, state, calls } = createIpcHarness(t, {
    running: false,
    child,
    healthAvailable: false,
  });

  const result = await handlers.get('start-service')();

  assert.equal(result.success, true);
  assert.equal(killed, 1);
  assert.equal(state.child, null);
  assert.equal(calls.forkWhistle, 1);
});
