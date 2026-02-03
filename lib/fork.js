const { utilityProcess, app } = require('electron');
const path = require('path');
const { install } = require('./plugins');
const {
  getSettings, showSettings, authorization, reloadPage,
} = require('./settings');
const { closeWhistle, LOCALHOST, VERSION } = require('./util');
const { willQuit } = require('./window');
const {
  setChild, setOptions, getWin, setRunning, getChild,
} = require('./context');
const { showMessageBox } = require('./dialog');
const { create: createMenu, updateRules: updateMenuRules } = require('./menu');
const { updateRules: updateIpcRules } = require('./ipc');

const SCRIPT = path.join(__dirname, 'whistle.js');
let initing = true;
let hasError;
const { notifyServiceStatus } = require('./ipc');

const handleWhistleError = async (err) => {
  if (willQuit() || hasError) {
    return;
  }
  const win = getWin();
  if (!win || win.isDestroyed()) {
    return;
  }
  hasError = true;
  setRunning(false);
  notifyServiceStatus({ running: false });
  err = (err !== 1 && err) || 'Failed to start, please try again';
  await showMessageBox(err, forkWhistle, showSettings); // eslint-disable-line
  hasError = false;
};

const forkWhistle = (restart) => {
  if (restart) {
    closeWhistle();
  }
  let options;
  const settings = getSettings();
  const execArgv = ['--max-semi-space-size=64', '--tls-min-v1.0'];
  execArgv.push(`--max-http-header-size=${settings.maxHttpHeaderSize * 1024}`);
  const args = [encodeURIComponent(JSON.stringify(settings))];
  const child = utilityProcess.fork(SCRIPT, args, { execArgv });
  setChild(child);
  child.on('error', (err) => {
    if (child !== getChild()) {
      return;
    }
    handleWhistleError(err);
  });
  child.once('exit', (code) => {
    if (child !== getChild()) {
      return;
    }
    handleWhistleError(code);
  });
  child.on('message', async (data) => {
    const type = data && data.type;
    if (type === 'error') {
      return handleWhistleError(data.message);
    }
    if (type === 'rules') {
      updateMenuRules(data.rules);
      updateIpcRules(data.rules);
      return;
    }
    if (type === 'install') {
      return install(data.plugins);
    }
    if (type === 'checkUpdate') {
      return app.emit('checkUpdateClient');
    }
    if (type === 'getRegistryList') {
      return app.emit('getRegistryList', data.list);
    }
    if (type !== 'options') {
      return;
    }
    options = data.options;
    updateMenuRules(data.rules);
    updateIpcRules(data.rules);
    setRunning(true);
    notifyServiceStatus({ running: true });
    setOptions(options);
    const win = getWin();
    const proxyRules = `http://${options.host || LOCALHOST}:${options.port}`;
    await win.webContents.session.setProxy({ proxyRules });
    if (initing) {
      initing = false;
      createMenu();
    } else {
      reloadPage();
    }
  });
};

module.exports = forkWhistle;
