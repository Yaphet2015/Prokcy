const { contextBridge, ipcRenderer } = require('electron');

const electronApi = {
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onThemeChanged: (callback) => {
    const listener = (event, theme) => callback(theme);
    ipcRenderer.on('theme-changed', listener);
    return () => ipcRenderer.removeListener('theme-changed', listener);
  },
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (payload) => ipcRenderer.invoke('update-settings', payload),
  getRules: () => ipcRenderer.invoke('get-rules'),
  getRulesOrder: () => ipcRenderer.invoke('get-rules-order'),
  setRulesOrder: (order) => ipcRenderer.invoke('set-rules-order', { order }),
  setRules: (content, name) => ipcRenderer.invoke('set-rules', { content, name }),
  setRulesEnabled: (enabled) => ipcRenderer.invoke('set-rules-enabled', enabled),
  setRuleSelection: (name, selected) => ipcRenderer.invoke('set-rule-selection', { name, selected }),
  createRulesGroup: (name, content) => ipcRenderer.invoke('create-rules-group', { name, content }),
  deleteRulesGroup: (name) => ipcRenderer.invoke('delete-rules-group', { name }),
  renameRulesGroup: (name, newName) => ipcRenderer.invoke('rename-rules-group', { name, newName }),
  reorderRulesGroups: (names) => ipcRenderer.invoke('reorder-rules-groups', { names }),
  getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
  getRuntimeConfig: () => ipcRenderer.invoke('get-runtime-config'),
  getNetworkData: (query) => ipcRenderer.invoke('get-network-data', query),
  getValues: () => ipcRenderer.invoke('get-values'),
  setValue: (name, value) => ipcRenderer.invoke('set-value', { name, value }),
  deleteValue: (name) => ipcRenderer.invoke('delete-value', { name }),
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
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronApi);
} else {
  window.electron = electronApi;
}
