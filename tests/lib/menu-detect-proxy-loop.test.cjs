const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('detectProxy schedules only one follow-up timer per polling cycle', async (t) => {
  const originalLoad = Module._load;
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const scheduled = [];

  const nativeTheme = {
    shouldUseDarkColors: false,
    shouldUseDarkColorsForSystemIntegratedUI: false,
    on: () => {},
  };

  const electronStub = {
    app: {
      on: () => {},
      getName: () => 'Prokcy',
      isPackaged: false,
    },
    nativeTheme,
    Menu: {
      buildFromTemplate: (template) => ({ template }),
      setApplicationMenu: () => {},
    },
    Tray: class Tray {
      constructor() {}

      setContextMenu() {}

      setToolTip() {}

      setImage() {}

      on() {}
    },
    nativeImage: {
      createFromPath: () => ({
        resize() {
          return this;
        },
        setTemplateImage() {
          return this;
        },
      }),
    },
    shell: {
      openExternal: () => {},
    },
    systemPreferences: {
      getUserDefault: () => 'Light',
    },
  };

  const proxyState = { enabled: true };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') return electronStub;
    if (request === 'electron-context-menu') return () => {};
    if (request === 'whistle/bin/ca') return () => Promise.resolve();
    if (request === './proxy') {
      return {
        isEnabled: () => proxyState.enabled,
        enableProxy: async () => {},
        disableProxy: async () => {},
        setEnabled: (value) => {
          proxyState.enabled = !!value;
        },
        getTitle: () => 'Prokcy',
      };
    }
    if (request === './dialog') return { showMessageBox: () => {} };
    if (request === './util') {
      return {
        getJson: () => Promise.resolve(null),
        getString: (v) => String(v || ''),
        requireW2: () => ({
          getServerProxy: (callback) => callback(null, {
            http: { enabled: true, host: '127.0.0.1', port: 8888 },
            https: { enabled: true, host: '127.0.0.1', port: 8888 },
          }),
        }),
        LOCALHOST: '127.0.0.1',
        TRAY_ICON: '/tmp/dock.png',
        sudoPromptExec: () => {},
        getArtifactName: () => 'artifact',
        isMac: false,
      };
    }
    if (request === './context') {
      return {
        getOptions: () => ({}),
        sendMsg: () => {},
        getWin: () => null,
      };
    }
    if (request === './window') {
      return {
        restart: () => {},
        showWindow: () => {},
      };
    }
    if (request === './settings') {
      return {
        getSettings: () => ({ port: '8888', host: '127.0.0.1', bypass: '' }),
      };
    }
    if (request === './preferences') {
      return {
        getHideFromDock: () => false,
        getStartAtLogin: () => false,
        setHideFromDock: () => {},
        setStartAtLogin: () => {},
        applyThemeMode: () => {},
      };
    }
    if (request === './storage') {
      return {
        getProperty: () => true,
        setProperty: () => {},
      };
    }
    if (request === './updater') {
      return {
        checkForUpdates: async () => ({ success: true, message: '' }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  global.setTimeout = (fn, delay) => {
    scheduled.push({ fn, delay });
    return scheduled.length;
  };
  global.clearTimeout = () => {};

  t.after(() => {
    Module._load = originalLoad;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  });

  const { create } = require('../../lib/menu');
  await create();

  assert.ok(scheduled.length > 0, 'create() should schedule proxy detection');
  const detectProxyEntry = scheduled[0];
  const before = scheduled.length;
  detectProxyEntry.fn();
  const scheduledBySingleRun = scheduled.length - before;

  assert.equal(
    scheduledBySingleRun,
    1,
    `expected one timer to be scheduled, got ${scheduledBySingleRun}`,
  );
});
