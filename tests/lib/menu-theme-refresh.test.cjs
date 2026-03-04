const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('menu bar icons follow system theme, not app theme override', async (t) => {
  const originalLoad = Module._load;
  const originalSetTimeout = global.setTimeout;
  const state = {
    trayTemplate: null,
    appMenuTemplate: null,
  };

  const nativeTheme = {
    shouldUseDarkColors: false,
    themeSource: 'system',
    on: () => {},
  };
  let appleInterfaceStyle = 'Light';

  const electronStub = {
    app: {
      on: () => {},
      getName: () => 'Prokcy',
    },
    nativeTheme,
    Menu: {
      buildFromTemplate: (template) => ({ template }),
      setApplicationMenu: (menu) => {
        state.appMenuTemplate = menu.template;
      },
    },
    Tray: class Tray {
      constructor() {}

      setContextMenu(menu) {
        state.trayTemplate = menu.template;
      }

      setToolTip() {}

      setImage() {}

      on() {}
    },
    nativeImage: {
      createFromPath: (imgPath) => ({
        path: imgPath,
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
      getUserDefault: () => appleInterfaceStyle,
    },
  };

  const storageStub = {
    getProperty: () => false,
    setProperty: () => {},
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') return electronStub;
    if (request === 'electron-context-menu') return () => {};
    if (request === 'whistle/bin/ca') return () => Promise.resolve();
    if (request === './proxy') {
      return {
        isEnabled: () => false,
        enableProxy: () => Promise.resolve(),
        disableProxy: () => Promise.resolve(),
        setEnabled: () => {},
        getTitle: () => 'Prokcy',
      };
    }
    if (request === './dialog') return { showMessageBox: () => {} };
    if (request === './util') {
      return {
        getJson: () => Promise.resolve(null),
        getString: (v) => String(v || ''),
        requireW2: () => ({ getServerProxy: () => {} }),
        LOCALHOST: '127.0.0.1',
        TRAY_ICON: '/tmp/dock.png',
        sudoPromptExec: () => {},
        getArtifactName: () => 'artifact',
        isMac: true,
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
    if (request === './storage') return storageStub;
    return originalLoad(request, parent, isMain);
  };

  global.setTimeout = () => 0;
  t.after(() => {
    Module._load = originalLoad;
    global.setTimeout = originalSetTimeout;
  });

  const { create, refreshTheme } = require('../../lib/menu');

  await create();
  const initialIconPath = state.trayTemplate?.[0]?.icon?.path;
  assert.ok(typeof initialIconPath === 'string' && initialIconPath.length > 0);
  const windowMenu = state.appMenuTemplate?.find((item) => item.label === 'Window');
  assert.ok(windowMenu, 'Window menu should exist');
  const closeShortcut = windowMenu.submenu?.find((item) => item.accelerator === 'CmdOrCtrl+W');
  assert.ok(closeShortcut, 'Window menu should expose CmdOrCtrl+W close shortcut');

  // App theme change should not affect menu bar theme.
  nativeTheme.shouldUseDarkColors = !nativeTheme.shouldUseDarkColors;
  refreshTheme();
  const afterAppThemeIconPath = state.trayTemplate?.[0]?.icon?.path;
  assert.equal(afterAppThemeIconPath, initialIconPath);

  // System theme change should update menu bar theme.
  appleInterfaceStyle = appleInterfaceStyle === 'Dark' ? 'Light' : 'Dark';
  refreshTheme();
  const afterSystemThemeIconPath = state.trayTemplate?.[0]?.icon?.path;
  assert.notEqual(afterSystemThemeIconPath, initialIconPath);
});
