const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('preferences expose and persist the default sidebar collapsed state', () => {
  const originalLoad = Module._load;
  const storageState = {};

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: { isPackaged: false },
        nativeTheme: { themeSource: 'system' },
      };
    }
    if (request === './util') {
      return { isMac: false };
    }
    if (request === './storage') {
      return {
        __esModule: true,
        default: {
          getProperty: (key) => storageState[key],
          setProperty: (key, value) => {
            storageState[key] = value;
          },
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../../lib/preferences')];
    const {
      getPreferences,
      getSidebarDefaultCollapsed,
      setSidebarDefaultCollapsed,
    } = require('../../lib/preferences');

    assert.equal(getSidebarDefaultCollapsed(), false);
    assert.equal(getPreferences().sidebarDefaultCollapsed, false);

    assert.equal(setSidebarDefaultCollapsed(true), true);
    assert.equal(storageState.sidebarDefaultCollapsed, true);
    assert.equal(getPreferences().sidebarDefaultCollapsed, true);

    assert.equal(setSidebarDefaultCollapsed(false), false);
    assert.equal(storageState.sidebarDefaultCollapsed, false);
  } finally {
    delete require.cache[require.resolve('../../lib/preferences')];
    Module._load = originalLoad;
  }
});
