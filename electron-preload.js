const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getTheme: () => ipcRenderer.invoke('get-theme'),
});
