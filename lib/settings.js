const path = require('path');
const { isIP } = require('net');
const { lookup } = require('dns');
const {
  BrowserWindow, ipcMain, app, globalShortcut,
} = require('electron');
const {
  showWin, getString, LOCALHOST, USERNAME, ICON, isMac,
} = require('./util');
const {
  getWin, getOptions, getChild, sendMsg, isRunning,
} = require('./context');
const { enableProxy, isEnabled } = require('./proxy');
const storage = require('./storage');
const { showWindow } = require('./window');

const username = USERNAME;
const password = `pass_${Math.random()}`;
const authorization = Buffer.from(`${username}:${password}`).toString('base64');
const DEFAULT_PORT = '8888';
const HEADER_SIZE_OPTIONS = [512, 1024, 5120, 10240, 51200, 102400];
const DEFAULT_REQUEST_LIST_LIMIT = 500;
const MIN_REQUEST_LIST_LIMIT = 100;
const MAX_REQUEST_LIST_LIMIT = 5000;
let child;
let storageChanged;

exports.authorization = authorization;

const isPort = p => p > 0 && p < 65536;

const getPort = (p, defaultPort) => (isPort(p) ? String(p) : (defaultPort || ''));

const hideSettings = () => {
  if (child) {
    child.hide();
  }
  globalShortcut.unregister('ESC', hideSettings);
};

const getValue = (data, key) => data && (data.getProperty ? data.getProperty(key) : data[key]);

const normalizeRequestListLimit = (value) => {
  const limit = Number(value);
  if (!Number.isInteger(limit)) {
    return DEFAULT_REQUEST_LIST_LIMIT;
  }
  if (limit < MIN_REQUEST_LIST_LIMIT) {
    return MIN_REQUEST_LIST_LIMIT;
  }
  if (limit > MAX_REQUEST_LIST_LIMIT) {
    return MAX_REQUEST_LIST_LIMIT;
  }
  return limit;
};

const parseSettings = (data) => {
  const headerSize = +getValue(data, 'maxHttpHeaderSize');

  return {
    port: getPort(getValue(data, 'port'), DEFAULT_PORT),
    socksPort: getPort(getValue(data, 'socksPort')),
    username: getString(getValue(data, 'username'), 16),
    password: getString(getValue(data, 'password'), 16),
    uiAuth: { username, password },
    host: getString(getValue(data, 'host'), 255),
    bypass: getString(getValue(data, 'bypass'), 2000),
    useDefaultStorage: !!getValue(data, 'useDefaultStorage'),
    maxHttpHeaderSize: HEADER_SIZE_OPTIONS.includes(headerSize) ? headerSize : 256,
    requestListLimit: normalizeRequestListLimit(getValue(data, 'requestListLimit')),
  };
};

const getSettings = () => parseSettings(storage);

const updateShadowRules = (settings) => {
  sendMsg({
    type: 'setShadowRules',
    settings,
  });
};
const hasChanged = (data) => {
  if (!getChild()) {
    return true;
  }
  const curSettings = getSettings();
  const keys = Object.keys(curSettings);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    if (key !== 'uiAuth' && curSettings[key] !== data[key]) {
      return true;
    }
  }
  return false;
};

const showToast = msg => {
  msg = (msg && msg.message) || msg;
  if (child && child.webContents && !child.isDestroyed()) {
    child.webContents.send('showToast', msg);
  }
};

const dnsLookup = (host) => {
  if (!host || isIP(host)) {
    return host;
  }
  return new Promise((resolve, reject) => {
    lookup(host, (err, ip) => {
      if (err) {
        return reject(err);
      }
      resolve(ip || LOCALHOST);
    });
  });
};

const applySettings = async (rawData, options = {}) => {
  const { hideOnSuccess = false, showErrorToast = false } = options;
  const data = rawData && parseSettings(rawData);
  if (!data) {
    return { success: false, message: 'Invalid settings' };
  }

  try {
    await dnsLookup(data.host);
  } catch (e) {
    if (showErrorToast) {
      showToast(e);
    }
    return { success: false, message: (e && e.message) || 'Invalid bound host' };
  }

  if (isRunning() && !hasChanged(data)) {
    if (hideOnSuccess) {
      hideSettings();
    }
    return { success: true, changed: false, needsRestart: false };
  }

  const curSettings = getSettings();
  const portChanged = curSettings.port !== data.port;
  const hostChanged = curSettings.host !== data.host;
  const bypassChanged = curSettings.bypass !== data.bypass;

  if (isEnabled() && (portChanged || hostChanged || bypassChanged)) {
    try {
      await enableProxy(data);
    } catch (e) {}
  }

  updateShadowRules(data);
  const nextData = { ...data };
  delete nextData.uiAuth;
  storage.setProperties(nextData);

  if (hideOnSuccess) {
    hideSettings();
  }

  storageChanged = curSettings.useDefaultStorage !== data.useDefaultStorage;
  const socksChanged = curSettings.socksPort !== data.socksPort;
  const headerSizeChanged = curSettings.maxHttpHeaderSize !== data.maxHttpHeaderSize;
  const requestListLimitChanged = curSettings.requestListLimit !== data.requestListLimit;
  const needsRestart = !isRunning() || portChanged || hostChanged
    || socksChanged || storageChanged || headerSizeChanged || requestListLimitChanged;

  if (needsRestart) {
    app.emit('whistleSettingsChanged', true);
  }

  return { success: true, changed: true, needsRestart };
};

ipcMain.on('hideSettings', () => {
  if (!getOptions() || !isRunning()) {
    return app.quit();
  }
  hideSettings();
});

ipcMain.on('applySettings', async (_, data) => {
  await applySettings(data, { hideOnSuccess: true, showErrorToast: true });
});

const showSettings = () => {
  showWin(child);
  child.webContents.send('showSettings', getSettings());
};

exports.reloadPage = () => {
  if (storageChanged) {
    storageChanged = false;
    const win = getWin();
    if (win) {
      win.webContents.reload();
    }
  }
};

exports.showSettings = () => {
  showWindow();
  if (child) {
    return showSettings();
  }
  child = new BrowserWindow({
    parent: getWin(),
    title: 'Proxy Settings',
    autoHideMenuBar: true,
    show: false,
    frame: false,
    modal: true,
    icon: ICON,
    width: 470,
    height: isMac ? 460 : 435,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false,
    },
  });
  child._hasFindBar = true; // eslint-disable-line
  child.loadFile(path.join(__dirname, '../public/settings.html'));
  child.isSettingsWin = true;
  child.on('focus', () => {
    globalShortcut.unregister('ESC', hideSettings);
    globalShortcut.register('ESC', hideSettings);
  });
  child.on('ready-to-show', () => {
    showSettings();
  });
};

exports.getSettings = getSettings;
exports.applySettings = applySettings;
