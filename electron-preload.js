const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getTheme: () => ipcRenderer.invoke('get-theme'),
  getRules: () => ipcRenderer.invoke('get-rules'),
  setRules: (content) => ipcRenderer.invoke('set-rules', content),
  setRulesEnabled: (enabled) => ipcRenderer.invoke('set-rules-enabled', enabled),
  getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
  startService: () => ipcRenderer.invoke('start-service'),
  stopService: () => ipcRenderer.invoke('stop-service'),
  onRulesUpdated: (callback) => {
    const listener = (event, rules) => callback(rules);
    ipcRenderer.on('rules-updated', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('rules-updated', listener);
  },
  onServiceStatusChanged: (callback) => {
    const listener = (event, status) => callback(status);
    ipcRenderer.on('service-status-changed', listener);
    return () => ipcRenderer.removeListener('service-status-changed', listener);
  },
});
