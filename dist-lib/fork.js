"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const plugins_1 = require("./plugins");
const settings_1 = require("./settings");
const util_1 = require("./util");
const window_1 = require("./window");
const context_1 = require("./context");
const dialog_1 = require("./dialog");
const menu_1 = require("./menu");
const ipc_1 = require("./ipc");
const SCRIPT = path_1.default.join(__dirname, 'whistle.js');
let initing = true;
let hasError;
/**
 * Handle errors from the Whistle utility process
 * Shows error dialog and offers retry option
 *
 * @param err - Error code or message from the failed process
 */
const handleWhistleError = async (err) => {
    if ((0, window_1.willQuitActive)() || hasError) {
        return;
    }
    const win = (0, context_1.getWin)();
    if (!win || win.isDestroyed()) {
        return;
    }
    hasError = true;
    (0, context_1.setRunning)(false);
    (0, ipc_1.notifyServiceStatus)({ running: false });
    const errorMessage = (err !== 1 && err) || 'Failed to start, please try again';
    await (0, dialog_1.showMessageBox)(errorMessage, forkWhistle, settings_1.showSettingsWindow);
    hasError = false;
};
/**
 * Fork the Whistle utility process
 * Starts the Whistle proxy server in a separate utility process
 *
 * @param restart - Whether to restart an existing instance (closes current first)
 */
const forkWhistle = (restart) => {
    if (restart) {
        (0, util_1.closeWhistle)();
    }
    let options;
    const settings = (0, settings_1.getSettings)();
    const execArgv = ['--max-semi-space-size=64', '--tls-min-v1.0'];
    execArgv.push(`--max-http-header-size=${settings.maxHttpHeaderSize * 1024}`);
    const args = [encodeURIComponent(JSON.stringify(settings))];
    const child = electron_1.utilityProcess.fork(SCRIPT, args, { execArgv });
    (0, context_1.setChild)(child);
    child.on('error', (err) => {
        if (child !== (0, context_1.getChild)()) {
            return;
        }
        handleWhistleError(err);
    });
    child.once('exit', (code) => {
        if (child !== (0, context_1.getChild)()) {
            return;
        }
        handleWhistleError(code);
    });
    child.on('message', async (data) => {
        const type = data?.type;
        if (type === 'error') {
            return handleWhistleError(data.message);
        }
        if (type === 'rules') {
            (0, menu_1.updateRules)(data.rules);
            (0, ipc_1.updateRules)(data.rules);
            return;
        }
        if (type === 'install') {
            return (0, plugins_1.install)(data.plugins);
        }
        if (type === 'checkUpdate') {
            return electron_1.app.emit('checkUpdateClient');
        }
        if (type === 'getRegistryList') {
            return electron_1.app.emit('getRegistryList', data.list);
        }
        if (type !== 'options') {
            return;
        }
        // Handle 'options' message - initialization complete
        options = data.options;
        (0, menu_1.updateRules)(data.rules);
        (0, ipc_1.updateRules)(data.rules);
        (0, context_1.setRunning)(true);
        (0, ipc_1.notifyServiceStatus)({ running: true });
        (0, context_1.setOptions)(options);
        const win = (0, context_1.getWin)();
        if (!win) {
            return;
        }
        const proxyRules = `http://${options.host || util_1.LOCALHOST}:${options.port}`;
        await win.webContents.session.setProxy({ proxyRules });
        if (initing) {
            initing = false;
            (0, menu_1.create)();
        }
        else {
            (0, settings_1.reloadPage)();
        }
    });
};
exports.default = forkWhistle;
//# sourceMappingURL=fork.js.map