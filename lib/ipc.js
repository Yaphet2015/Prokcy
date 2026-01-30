const { ipcMain, nativeTheme } = require('electron');

let mainWindow = null;

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

  // Notify renderer when theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', {
        isDark: nativeTheme.shouldUseDarkColors,
      });
    }
  });
}

module.exports = { initIpc };
