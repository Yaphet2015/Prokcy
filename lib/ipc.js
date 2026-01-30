const { ipcMain, nativeTheme } = require('electron');

let mainWindow = null;

function initIpc(win) {
  mainWindow = win;

  // Send current theme on request
  ipcMain.handle('get-theme', () => {
    return {
      isDark: nativeTheme.shouldUseDarkColors,
    };
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
