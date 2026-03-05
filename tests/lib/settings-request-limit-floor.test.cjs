const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('requestListLimit is normalized to the effective runtime floor (600)', () => {
  const originalLoad = Module._load;

  const storageState = {
    port: '8888',
    host: '127.0.0.1',
    requestListLimit: 100,
    maxHttpHeaderSize: 512,
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return { app: {} };
    }
    if (request === './util') {
      return {
        getString: (value) => (value == null ? '' : String(value)),
        LOCALHOST: '127.0.0.1',
        USERNAME_EXPORT: 'prokcy-user',
      };
    }
    if (request === './context') {
      return {
        getWin: () => null,
        getChild: () => null,
        sendMsg: () => {},
        isServiceRunning: () => false,
      };
    }
    if (request === './proxy') {
      return {
        enableProxy: async () => {},
        isEnabled: () => false,
      };
    }
    if (request === './storage') {
      return {
        __esModule: true,
        default: {
          getProperty: (key) => storageState[key],
          setProperties: () => {},
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    const { getSettings } = require('../../lib/settings');
    const settings = getSettings();
    assert.equal(settings.requestListLimit, 600);
  } finally {
    Module._load = originalLoad;
  }
});
