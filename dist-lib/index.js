"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./patch");
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
const electron_1 = require("electron");
const common_1 = require("whistle/lib/util/common");
const util_1 = require("./util");
const ctx = __importStar(require("./context"));
const dialog_1 = require("./dialog");
const window_1 = require("./window");
const preferences_1 = require("./preferences");
const fork_1 = __importDefault(require("./fork"));
const package_json_1 = require("../package.json");
// Set app name early so menu displays "Prokcy" instead of "Electron"
electron_1.app.setName('Prokcy');
process.env.PFORK_EXEC_PATH = process.execPath;
const quitApp = () => electron_1.app.quit();
const handleSquirrel = (uninstall) => {
    const updateDotExe = path_1.default.resolve(path_1.default.dirname(process.execPath), '..', 'update.exe');
    const target = path_1.default.basename(process.execPath);
    const name = uninstall ? '--removeShortcut' : '--createShortcut';
    const child = child_process_1.default.spawn(updateDotExe, [name, target], { detached: true });
    child.on('error', util_1.noop);
    child.on('close', quitApp);
};
const handleStartupEvent = () => {
    if (process.platform !== 'win32') {
        return false;
    }
    /* eslint-disable default-case */
    switch (process.argv[1]) {
        case '--squirrel-install':
        case '--squirrel-updated':
            handleSquirrel(false);
            return true;
        case '--squirrel-uninstall':
            handleSquirrel(true);
            return true;
        case '--squirrel-obsolete':
            quitApp();
            return true;
    }
    return false;
};
// Window tracking for macOS dock menu
let allWinList = [];
let allWinTitle = [];
const setAllWinList = (list) => {
    allWinList = list;
    allWinTitle = list.map(w => w.title);
    return false;
};
const compareWinList = (list) => {
    const len = list.length;
    if (list.length !== allWinList.length) {
        return setAllWinList(list);
    }
    for (let i = 0; i < len; i++) {
        const win = list[i];
        if (allWinList[i] !== win || allWinTitle[i] !== win.title) {
            return setAllWinList(list);
        }
    }
    return true;
};
const filterWin = (win) => 
// @ts-ignore - _isFindBar is a custom property
!win._isFindBar && (!win.isSettingsWin || win.isVisible());
const updateDock = () => {
    const list = electron_1.BrowserWindow.getAllWindows().filter(filterWin);
    if (compareWinList(list)) {
        return;
    }
    let focusedWin = electron_1.BrowserWindow.getFocusedWindow();
    const menus = electron_1.Menu.buildFromTemplate(allWinList.map((win) => ({
        label: win.title,
        type: 'checkbox',
        checked: focusedWin === win,
        click() {
            (0, util_1.showWin)(win);
            setImmediate(() => {
                focusedWin = electron_1.BrowserWindow.getFocusedWindow();
                allWinList.forEach((w, i) => {
                    menus.items[i].checked = w === focusedWin;
                });
            });
        },
    })));
    // app.dock is only available on macOS
    if (electron_1.app.dock) {
        electron_1.app.dock.setMenu(menus);
    }
};
// Initialize application
(() => {
    if (util_1.isMac) {
        if (electron_1.app.dock) {
            electron_1.app.dock.setIcon(util_1.DOCK_ICON);
        }
        electron_1.systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true);
        electron_1.systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true);
    }
    if (!electron_1.app.requestSingleInstanceLock()) {
        // Windows 里面通过伪协议重新唤起客户端会触发 will-quit 事件
        return util_1.isMac ? quitApp() : undefined;
    }
    const handleParams = (url) => {
        const dataUrl = (0, util_1.getDataUrl)(url);
        if (dataUrl) {
            ctx.setDataUrl(dataUrl);
        }
    };
    const lastArgv = process.argv && process.argv[process.argv.length - 1];
    handleParams(lastArgv);
    electron_1.app.on('second-instance', (_e, argv) => {
        (0, util_1.showWin)(ctx.getWin());
        const lastArg = argv && argv[argv.length - 1];
        handleParams(lastArg);
    });
    if (handleStartupEvent()) {
        return;
    }
    if (util_1.isMac) {
        electron_1.app.on('open-url', (_, url) => {
            (0, window_1.showWindow)();
            handleParams(url);
        });
        electron_1.app.on('web-contents-created', (_, win) => {
            win.on('page-title-updated', updateDock);
            // @ts-ignore - 'close' event exists but not in TypeScript definitions
            win.once('close', updateDock);
            win.on('ready-to-show', updateDock);
        });
        setInterval(updateDock, 160);
    }
    electron_1.app.on('browser-window-created', (_, _win) => {
        // Find-bar removed to avoid conflict with editor's built-in search
    });
    electron_1.app.whenReady().then(() => {
        electron_1.app.userAgentFallback = `${electron_1.app.userAgentFallback} Prokcy/${package_json_1.version}`;
        (0, preferences_1.applyThemeMode)();
        (0, window_1.createWindow)();
        (0, fork_1.default)();
        electron_1.app.on('whistleSettingsChanged', fork_1.default);
    });
})();
const handleGlobalException = async (err) => {
    const stack = (0, util_1.getErrorStack)(err);
    console.error(stack); // eslint-disable-line no-console
    (0, common_1.writeLogSync)(`\r\n${stack}\r\n`);
    let msg = (0, util_1.getErrorMsg)(err || 'An error occurred');
    const errorCode = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
    if (ctx.getOptions() || (typeof errorCode === 'string' && /^ERR_NETWORK/.test(errorCode)) ||
        (typeof msg === 'string' && /^net::/.test(msg))) {
        if (typeof errorCode === 'string' && /^UND_ERR_/.test(errorCode)) {
            ctx.execJsSafe(`window.showWhistleMessage(${JSON.stringify({ level: 'error', msg })});`);
        }
        return;
    }
    const handleCancel = () => electron_1.app.exit();
    // @ts-ignore - waitForExiting is a custom property on app
    electron_1.app.waitForExiting = (0, dialog_1.showMessageBox)(msg, {
        buttons: ['Feedback', 'Restart', 'Quit'],
        callback() {
            msg = encodeURIComponent(`[Bug]: ${msg}`);
            electron_1.shell.openExternal(`https://github.com/Yaphet2015/Prokcy/issues/new?title=${msg}`);
            handleCancel();
        },
        handleAction: window_1.restart,
        handleCancel,
    }).then(res => {
        // @ts-ignore - waitForExiting is a custom property on app
        electron_1.app.waitForExiting = null;
        return res === 1;
    });
};
process.on('unhandledRejection', handleGlobalException);
process.on('uncaughtException', handleGlobalException);
//# sourceMappingURL=index.js.map