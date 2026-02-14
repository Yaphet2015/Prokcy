const { app, nativeTheme } = require('electron');
const storage = require('./storage');
const { isMac } = require('./util');

const THEME_MODES = ['system', 'light', 'dark'];

const normalizeThemeMode = (mode) => {
  if (typeof mode !== 'string') {
    return 'system';
  }
  const normalized = mode.toLowerCase();
  return THEME_MODES.includes(normalized) ? normalized : 'system';
};

const getThemeMode = () => normalizeThemeMode(storage.getProperty('themeMode'));

const applyThemeMode = (mode = getThemeMode()) => {
  const nextMode = normalizeThemeMode(mode);
  nativeTheme.themeSource = nextMode;
  storage.setProperty('themeMode', nextMode);
  return nextMode;
};

const getStartAtLogin = () => !!storage.getProperty('startAtLogin');

const setStartAtLogin = (startAtLogin) => {
  const enabled = !!startAtLogin;
  storage.setProperty('startAtLogin', enabled);
  if (app.isPackaged) {
    try {
      app.setLoginItemSettings({ openAtLogin: enabled });
    } catch (e) {}
  }
  return enabled;
};

const getHideFromDock = () => !!storage.getProperty('hideFromDock');

const setHideFromDock = (hideFromDock) => {
  const enabled = !!hideFromDock;
  storage.setProperty('hideFromDock', enabled);
  if (isMac && app.dock) {
    if (enabled) {
      app.dock.hide();
    } else {
      app.dock.show();
    }
  }
  return enabled;
};

const getRulesOrder = () => {
  const value = storage.getProperty('rulesOrder');
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item, index, list) => typeof item === 'string' && item && list.indexOf(item) === index);
};

const setRulesOrder = (order) => {
  const nextOrder = Array.isArray(order)
    ? order.filter((item, index, list) => typeof item === 'string' && item && list.indexOf(item) === index)
    : [];
  storage.setProperty('rulesOrder', nextOrder);
  return nextOrder;
};

const getRequestFilters = () => {
  const value = storage.getProperty('requestFilters');
  console.log('[preferences] getRequestFilters:', value);
  return typeof value === 'string' ? value : '';
};

const setRequestFilters = (filters) => {
  const nextFilters = typeof filters === 'string' ? filters : '';
  console.log('[preferences] setRequestFilters:', nextFilters);
  storage.setProperty('requestFilters', nextFilters);
  return nextFilters;
};

const getSystemProxyEnabled = () => !!storage.getProperty('autoSetProxy');

const getPreferences = () => ({
  startAtLogin: getStartAtLogin(),
  hideFromDock: getHideFromDock(),
  themeMode: getThemeMode(),
  rulesOrder: getRulesOrder(),
  requestFilters: getRequestFilters(),
  systemProxyEnabled: getSystemProxyEnabled(),
});

module.exports = {
  applyThemeMode,
  getHideFromDock,
  getPreferences,
  getRequestFilters,
  getRulesOrder,
  getStartAtLogin,
  getSystemProxyEnabled,
  setHideFromDock,
  setRequestFilters,
  setRulesOrder,
  setStartAtLogin,
};
