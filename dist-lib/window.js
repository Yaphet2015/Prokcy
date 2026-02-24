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
exports.restart = exports.willQuitActive = exports.createWindow = exports.showWindow = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const util_1 = require("./util");
const ctx = __importStar(require("./context"));
const window_controls_1 = require("./window-controls");
const proxy = require('./proxy');
const { initIpc } = require('./ipc');
// Application state
let willQuit;
let beforeQuit;
/**
 * Cleanup function to disable proxy and close whistle service
 * Called before application exit
 */
const cleanup = async () => {
    if (proxy.isEnabled()) {
        try {
            await proxy.disableProxy();
        }
        catch (err) {
            // Silently ignore cleanup errors
        }
    }
    (0, util_1.closeWhistle)();
    electron_1.app.removeListener('will-quit', handleWillQuit); // eslint-disable-line
};
/**
 * Handle the will-quit event from Electron
 * Ensures cleanup is performed before exiting
 */
const handleWillQuit = async (e) => {
    if (willQuit) {
        return electron_1.app.exit();
    }
    e.preventDefault();
    willQuit = true;
    await cleanup();
    electron_1.app.exit();
};
const TABS = ['Network', 'Rules', 'Values', 'Plugins', 'Settings'];
/**
 * Show the main window and optionally navigate to a specific tab
 * @param name - Optional tab name to navigate to
 */
const showWindow = (name) => {
    if (!willQuit) {
        (0, util_1.showWin)(ctx.getWin());
    }
    if (name && TABS.includes(name)) {
        ctx.execJsSafe(`window.showWhistleWebUI("${name}")`);
    }
};
exports.showWindow = showWindow;
/**
 * Create and configure the main BrowserWindow
 * Sets up window lifecycle events and loads the React app
 */
const createWindow = () => {
    const win = new electron_1.BrowserWindow({
        title: proxy.getTitle(),
        frame: false,
        ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' } : {}),
        backgroundColor: '#111111',
        fullscreen: false,
        fullscreenable: true,
        icon: util_1.ICON,
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            spellcheck: false,
            webviewTag: true,
            preload: path_1.default.join(__dirname, '../electron-preload.js'),
        },
    });
    (0, window_controls_1.hideNativeWindowButtons)(win);
    // Override find in page to use custom CodeMirror editor search
    // @ts-expect-error - onBeforeFindInPage is not in Electron type definitions
    win.onBeforeFindInPage = function (keyword, opts) {
        const prev = !!opts && !opts.forward;
        const escapedKeyword = String(keyword).replace(/"/g, '\\"');
        return ctx.execJsSafe(`window.__findWhistleCodeMirrorEditor_("${escapedKeyword}", ${prev});`);
    };
    ctx.setWin(win);
    win.setMenu(null);
    win.maximize();
    // Show window when ready
    win.on('ready-to-show', () => (0, util_1.showWin)(win));
    // Handle window close event
    win.on('close', (e) => {
        if (beforeQuit) {
            return;
        }
        beforeQuit = false;
        e.preventDefault();
        win.hide();
    });
    // Update title when page title changes
    win.webContents.once('page-title-updated', () => {
        win.setTitle(proxy.getTitle());
    });
    // Load React app
    const isDev = !electron_1.app.isPackaged;
    if (isDev) {
        win.loadURL('http://127.0.0.1:5173');
        win.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        win.loadFile(path_1.default.join(__dirname, '../dist-react/index.html'));
    }
    // Initialize IPC handlers
    initIpc(win);
};
exports.createWindow = createWindow;
// Register application event handlers
electron_1.app.on('before-quit', () => {
    beforeQuit = true;
});
electron_1.app.on('activate', () => (0, exports.showWindow)());
electron_1.app.on('will-quit', handleWillQuit);
/**
 * Check if the application is in the process of quitting
 * @returns true if willQuit flag is set
 */
const willQuitActive = () => !!willQuit;
exports.willQuitActive = willQuitActive;
/**
 * Restart the application
 * Cleans up current instance and relaunches
 */
const restart = async () => {
    willQuit = true;
    await cleanup();
    electron_1.app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
    electron_1.app.exit();
};
exports.restart = restart;
//# sourceMappingURL=window.js.map