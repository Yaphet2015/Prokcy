const { ipcMain, nativeTheme } = require('electron');

let mainWindow = null;
let currentRules = null;
let serviceStatusCallbacks = [];

function initIpc(win) {
  mainWindow = win;

  // Send current theme on request
  ipcMain.handle('get-theme', () => {
    try {
      return {
        isDark: nativeTheme.shouldUseDarkColors,
      };
    } catch (error) {
      console.error('Failed to get theme:', error);
      return { isDark: false }; // Fallback
    }
  });

  // Get current rules
  ipcMain.handle('get-rules', () => currentRules);

  // Set rules content
  ipcMain.handle('set-rules', async (event, content) => {
    const { getChild } = require('./context');
    const child = getChild();
    if (child) {
      child.postMessage({
        type: 'setRulesContent',
        content,
      });
    }
    return { success: true };
  });

  // Enable/disable all rules
  ipcMain.handle('set-rules-enabled', async (event, enabled) => {
    const { getChild } = require('./context');
    const child = getChild();
    if (child) {
      child.postMessage({
        type: enabled ? 'enableAllRules' : 'disableAllRules',
      });
    }
    return { success: true };
  });

  // Get service status
  ipcMain.handle('get-service-status', () => {
    const { isRunning } = require('./context');
    return { running: isRunning() };
  });

  // Start whistle service
  ipcMain.handle('start-service', async () => {
    const { isRunning } = require('./context');
    if (isRunning()) {
      return { success: false, message: 'Service already running' };
    }
    const forkWhistle = require('./fork');
    forkWhistle();
    return { success: true };
  });

  // Stop whistle service
  ipcMain.handle('stop-service', async () => {
    const { isRunning, getChild } = require('./context');
    if (!isRunning()) {
      return { success: false, message: 'Service not running' };
    }
    const child = getChild();
    if (child) {
      child.kill();
    }
    const { setChild, setRunning } = require('./context');
    setChild(null);
    setRunning(false);
    notifyServiceStatus({ running: false });
    return { success: true };
  });

  // Notify renderer when theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', {
        isDark: nativeTheme.shouldUseDarkColors,
      });
    }
  });
}

// Update rules from Whistle utility process
function updateRules(rules) {
  currentRules = rules;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rules-updated', rules);
  }
}

// Notify renderer of service status changes
function notifyServiceStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('service-status-changed', status);
  }
}

module.exports = { initIpc, updateRules, notifyServiceStatus };
