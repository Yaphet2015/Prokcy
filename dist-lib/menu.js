"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshProxyStatus = exports.updateRules = exports.create = void 0;
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const electron_context_menu_1 = __importDefault(require("electron-context-menu"));
const ca_1 = __importDefault(require("whistle/bin/ca"));
const package_json_1 = require("../package.json");
const proxy_1 = require("./proxy");
const dialog_1 = require("./dialog");
const util_1 = require("./util");
const context_1 = require("./context");
const window_1 = require("./window");
const settings_1 = require("./settings");
const preferences_1 = require("./preferences");
const storage_1 = __importDefault(require("./storage"));
const { getServerProxy } = (0, util_1.requireW2)('set-global-proxy');
/**
 * Update tray menus function reference
 */
let updateTrayMenus = null;
/**
 * Current rules configuration
 */
let rulesConfig = null;
/**
 * Whether proxy is currently being set
 */
let isSettingProxy = false;
/**
 * Update checkbox function reference
 */
let updateCheckbox = null;
/**
 * Proxy menu item reference
 */
let proxyMenu;
/**
 * Current window title
 */
let curTitle;
/**
 * Constants
 */
const INTERVAL = 5000;
const REPO_URL = 'https://github.com/Yaphet2015/Prokcy';
let tray = null; // Prevent GC (https://github.com/amhoho/electron-cn-docs/blob/master/faq.md)
const ICON_SIZE = { width: 15 };
const SEPARATOR_MENU = { type: 'separator' };
const PATH_SEP_RE = /[\\/]/;
/**
 * Get current theme prefix based on system appearance
 */
const getTheme = () => (electron_1.nativeTheme.shouldUseDarkColors ? 'dark/' : '');
let theme = getTheme();
/**
 * Icon cache for theme-aware icons
 */
const iconCache = {};
/**
 * Get or create a cached icon
 */
const getIcon = (name) => {
    if (!PATH_SEP_RE.test(name)) {
        name = path_1.default.join(__dirname, `../public/${theme}${name}`);
    }
    let icon = iconCache[name];
    if (!icon) {
        icon = electron_1.nativeImage.createFromPath(name).resize(ICON_SIZE);
        iconCache[name] = icon;
    }
    return icon;
};
/**
 * Create all icon objects
 */
const createIcons = () => ({
    settings: getIcon('settings.png'),
    uncheck: getIcon('uncheck.png'),
    checked: getIcon('checked.png'),
    cert: getIcon('cert.png'),
    update: getIcon('update.png'),
    network: getIcon('network.png'),
    rules: getIcon('rules.png'),
    values: getIcon('values.png'),
    plugins: getIcon('plugins.png'),
});
let icons = createIcons();
/**
 * Show the GitHub repository in browser
 */
const showRepo = () => {
    electron_1.shell.openExternal(REPO_URL);
};
/**
 * Show About dialog
 */
const showAboutDialog = () => {
    (0, dialog_1.showMessageBox)(`Prokcy v${package_json_1.version}\n\nA cross-platform desktop network debugging proxy tool.`, {
        title: 'About Prokcy',
        type: 'info',
        buttons: ['OK'],
    });
};
/**
 * Report an issue on GitHub
 */
const reportIssue = () => {
    electron_1.shell.openExternal('https://github.com/Yaphet2015/Prokcy/issues/new');
};
/**
 * View documentation
 */
const viewDocumentation = () => {
    electron_1.shell.openExternal('https://github.com/Yaphet2015/Prokcy#readme');
};
// Configure context menu
(0, electron_context_menu_1.default)({
    showSelectAll: true,
    showSaveImageAs: true,
    showLookUpSelection: false,
    showSearchWithGoogle: false,
    showLearnSpelling: false,
    showCopyLink: false,
    showInspectElement: false,
});
/**
 * Update window and tray title
 */
const updateTitle = () => {
    const title = (0, proxy_1.getTitle)();
    if (title === curTitle) {
        return;
    }
    curTitle = title;
    const win = (0, context_1.getWin)();
    if (win) {
        win.setTitle(curTitle);
    }
    if (tray) {
        tray.setToolTip(curTitle);
    }
};
/**
 * Hide from dock menu item (macOS only)
 */
const hideDockMenu = {
    label: 'Hide From Dock',
    icon: icons.uncheck,
    click() {
        updateHideFromDock(!(0, preferences_1.getHideFromDock)());
    },
};
/**
 * Update hide from dock state
 */
const updateHideFromDock = (hide) => {
    const actualHide = hide === undefined ? (0, preferences_1.getHideFromDock)() : hide;
    (0, preferences_1.setHideFromDock)(actualHide);
    if (updateCheckbox) {
        updateCheckbox(hideDockMenu, actualHide);
    }
};
updateHideFromDock();
/**
 * Main export: Create application menu and system tray
 */
const create = async () => {
    (0, preferences_1.applyThemeMode)();
    theme = getTheme();
    icons = createIcons();
    /**
     * Menu bar tray rules menu list
     */
    let trayRulesMenu = [];
    let trayMenus = [];
    updateTrayMenus = () => {
        if (!tray) {
            return;
        }
        if (rulesConfig) {
            trayRulesMenu = [];
            // Disabled rules selection code - kept for reference
            // const { disabled } = rulesConfig;
            // if (!disabled) {
            //   rulesConfig.list?.forEach((rule) => {
            //     trayRulesMenu.push({
            //       label: rule.name,
            //       icon: rule.selected ? icons.checked : icons.uncheck,
            //       click: () => {
            //         sendMsg({
            //           type: rule.selected ? 'unselectRules' : 'selectRules',
            //           name: rule.name,
            //         });
            //       },
            //     });
            //   });
            //
            //   if (trayRulesMenu.length) {
            //     trayRulesMenu.push(SEPARATOR_MENU);
            //   }
            // }
        }
        const contextMenu = electron_1.Menu.buildFromTemplate([...trayRulesMenu, ...trayMenus]);
        tray.setContextMenu(contextMenu);
    };
    let proxyAppMenuItem = null;
    let startAppMenuItem = null;
    let hideDockAppMenuItem = null;
    let createAppMenus = null;
    updateCheckbox = (menu, checked) => {
        // Update tray menu item icon
        const icon = checked ? icons.checked : icons.uncheck;
        menu.icon = icon;
        // Update corresponding app menu item (for checkbox state)
        if (menu === proxyMenu && proxyAppMenuItem) {
            proxyAppMenuItem.checked = checked;
        }
        else if (menu.label === 'Start At Login' && startAppMenuItem) {
            startAppMenuItem.checked = checked;
        }
        else if (menu === hideDockMenu && hideDockAppMenuItem) {
            hideDockAppMenuItem.checked = checked;
        }
        // Rebuild app menu if createAppMenus is available
        if (createAppMenus) {
            const appMenu = electron_1.Menu.buildFromTemplate(createAppMenus());
            electron_1.Menu.setApplicationMenu(appMenu);
        }
        updateTrayMenus?.();
    };
    const updateProxyStatus = () => {
        if (updateCheckbox) {
            updateCheckbox(proxyMenu, (0, proxy_1.isEnabled)() === true);
        }
        storage_1.default.setProperty('autoSetProxy', (0, proxy_1.isEnabled)());
    };
    const enableSystemProxy = async () => {
        isSettingProxy = true;
        try {
            const settings = (0, settings_1.getSettings)();
            await (0, proxy_1.enableProxy)({
                port: Number(settings.port) || 8899,
                host: settings.host || util_1.LOCALHOST,
                bypass: settings.bypass,
            });
            updateProxyStatus();
        }
        catch (e) {
            // Ignore errors
        }
        isSettingProxy = false;
        updateTitle();
    };
    const disableSystemProxy = async () => {
        try {
            await (0, proxy_1.disableProxy)();
            updateProxyStatus();
        }
        catch (e) {
            // Ignore errors
        }
        updateTitle();
    };
    const switchSystemProxy = () => {
        if ((0, proxy_1.isEnabled)()) {
            disableSystemProxy();
        }
        else {
            enableSystemProxy();
        }
    };
    const updateStartAtLogin = (startAtLogin) => {
        const actualStartAtLogin = startAtLogin === undefined ? (0, preferences_1.getStartAtLogin)() : startAtLogin;
        (0, preferences_1.setStartAtLogin)(actualStartAtLogin);
        if (updateCheckbox) {
            updateCheckbox(startMenu, actualStartAtLogin);
        }
    };
    const switchStartAtLogin = () => {
        updateStartAtLogin(!(0, preferences_1.getStartAtLogin)());
    };
    const installRootCA = async () => {
        try {
            const options = (0, context_1.getOptions)();
            const useExceFunc = await (0, ca_1.default)(options.rootCAFile, (cmd) => {
                (0, util_1.sudoPromptExec)(cmd, (err) => {
                    if (!err) {
                        (0, context_1.sendMsg)({ type: 'enableCapture' });
                    }
                });
            });
            if (!useExceFunc) {
                (0, context_1.sendMsg)({ type: 'enableCapture' });
            }
        }
        catch (e) {
            // Ignore errors
        }
    };
    let checking = false;
    const checkUpdate = async () => {
        if (checking) {
            return;
        }
        checking = true;
        try {
            const pkg = await (0, util_1.getJson)('https://raw.githubusercontent.com/Yaphet2015/Prokcy/main/package.json');
            const newVersion = (0, util_1.getString)(pkg && pkg.version);
            if (!newVersion) {
                (0, dialog_1.showMessageBox)('Network Error', checkUpdate);
                return;
            }
            if (package_json_1.version === newVersion) {
                (0, dialog_1.showMessageBox)('Prokcy is up to date', {
                    title: '',
                    type: 'info',
                });
                return;
            }
            (0, dialog_1.showMessageBox)(`Prokcy has new version ${newVersion}`, {
                type: 'info',
                title: '',
                buttons: ['Download', 'View CHANGELOG', 'Cancel'],
                callback() {
                    electron_1.shell.openExternal(`https://github.com/Yaphet2015/Prokcy/releases/download/v${newVersion}/${(0, util_1.getArtifactName)(newVersion)}`);
                },
                showSettings() {
                    electron_1.shell.openExternal('https://github.com/Yaphet2015/Prokcy/blob/main/CHANGELOG.md');
                },
                handleCancel() { },
            });
        }
        catch (e) {
            (0, dialog_1.showMessageBox)(e, checkUpdate);
        }
        finally {
            checking = false;
        }
    };
    electron_1.app.on('checkUpdateClient', checkUpdate);
    proxyMenu = {
        label: 'Set As System Proxy',
        icon: icons.uncheck,
        click: switchSystemProxy,
    };
    const startMenu = {
        label: 'Start At Login',
        icon: icons.uncheck,
        click: switchStartAtLogin,
    };
    // Menu item references for checkbox updates (app menu - no icons)
    proxyAppMenuItem = {
        label: 'Set As System Proxy',
        click: switchSystemProxy,
    };
    startAppMenuItem = {
        label: 'Start At Login',
        click: switchStartAtLogin,
    };
    hideDockAppMenuItem = {
        label: 'Hide From Dock',
        click() {
            updateHideFromDock(!(0, preferences_1.getHideFromDock)());
        },
    };
    // Tray menu items (with icons)
    const createSystemMenus = () => {
        const menus = [
            {
                label: 'Settings',
                icon: icons.settings,
                accelerator: 'CommandOrControl+,',
                click: () => (0, window_1.showWindow)('Settings'),
            },
            {
                label: 'Install Root CA',
                icon: icons.cert,
                click: installRootCA,
            },
            {
                label: 'Check Update',
                icon: icons.update,
                click: checkUpdate,
            },
            SEPARATOR_MENU,
            proxyMenu,
            startMenu,
        ];
        if (util_1.isMac) {
            menus.push(hideDockMenu);
        }
        return menus;
    };
    // Native macOS app menu (no icons, proper structure)
    createAppMenus = () => {
        const appMenuItems = [
            {
                label: `About ${electron_1.app.getName()}`,
                click: showAboutDialog,
            },
            {
                label: 'Check for Updates...',
                click: checkUpdate,
            },
            SEPARATOR_MENU,
            {
                label: 'Preferences...',
                accelerator: 'CommandOrControl+,',
                click: () => (0, window_1.showWindow)('Settings'),
            },
            SEPARATOR_MENU,
            {
                label: 'Install Root CA',
                click: installRootCA,
            },
            proxyAppMenuItem,
            SEPARATOR_MENU,
            startAppMenuItem,
        ];
        if (util_1.isMac) {
            appMenuItems.push(hideDockAppMenuItem);
        }
        appMenuItems.push(SEPARATOR_MENU, {
            label: 'Restart',
            accelerator: 'CommandOrControl+Shift+R',
            click: window_1.restart,
        }, {
            label: `Quit ${electron_1.app.getName()}`,
            accelerator: 'CmdOrCtrl+Q',
            role: 'quit',
        });
        const editMenu = {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo',
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo',
                },
                SEPARATOR_MENU,
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut',
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy',
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste',
                },
                {
                    label: 'Select All',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectAll',
                },
                SEPARATOR_MENU,
                {
                    label: 'Find...',
                    accelerator: 'CmdOrCtrl+F',
                    click: () => {
                        const win = (0, context_1.getWin)();
                        if (win) {
                            win.webContents.send('menu-find');
                        }
                    },
                },
            ],
        };
        const viewMenu = {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        const win = (0, context_1.getWin)();
                        if (win) {
                            win.reload();
                        }
                    },
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        const win = (0, context_1.getWin)();
                        if (win) {
                            win.webContents.toggleDevTools();
                        }
                    },
                },
                SEPARATOR_MENU,
                {
                    label: 'Network',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => (0, window_1.showWindow)('Network'),
                },
                {
                    label: 'Rules',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => (0, window_1.showWindow)('Rules'),
                },
                {
                    label: 'Values',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => (0, window_1.showWindow)('Values'),
                },
            ],
        };
        const windowMenu = {
            label: 'Window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize',
                },
                {
                    label: 'Zoom',
                    role: 'zoom',
                },
                SEPARATOR_MENU,
                {
                    label: 'Bring All to Front',
                    role: 'front',
                },
            ],
        };
        const helpMenu = {
            label: 'Help',
            submenu: [
                {
                    label: 'Prokcy Documentation',
                    click: viewDocumentation,
                },
                {
                    label: 'View on GitHub',
                    click: showRepo,
                },
                SEPARATOR_MENU,
                {
                    label: 'Report an Issue',
                    click: reportIssue,
                },
            ],
        };
        return [
            {
                label: electron_1.app.getName(),
                submenu: appMenuItems,
            },
            editMenu,
            viewMenu,
            windowMenu,
            helpMenu,
        ];
    };
    const createTrayMenus = () => ([
        {
            label: 'Network',
            icon: icons.network,
            click() {
                (0, window_1.showWindow)('Network');
            },
        },
        {
            label: 'Rules',
            icon: icons.rules,
            click() {
                (0, window_1.showWindow)('Rules');
            },
        },
        {
            label: 'Values',
            icon: icons.values,
            click() {
                (0, window_1.showWindow)('Values');
            },
        },
        SEPARATOR_MENU,
        ...createSystemMenus(),
        SEPARATOR_MENU,
        {
            label: 'Restart',
            accelerator: 'CommandOrControl+Shift+R',
            click: window_1.restart,
        },
        {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            role: 'quit',
        },
    ]);
    trayMenus = createTrayMenus();
    const trayIcon = getIcon(util_1.TRAY_ICON);
    trayIcon.setTemplateImage(true);
    tray = new electron_1.Tray(trayIcon);
    if (process.platform === 'win32') {
        tray.on('click', () => (0, window_1.showWindow)());
    }
    updateStartAtLogin();
    updateHideFromDock();
    let autoSet = storage_1.default.getProperty('autoSetProxy');
    if (autoSet) {
        await enableSystemProxy();
    }
    else {
        (0, proxy_1.setEnabled)(false);
    }
    updateTitle();
    const detectProxy = () => {
        if (isSettingProxy || !(0, proxy_1.isEnabled)()) {
            autoSet = false;
            updateTitle();
            return setTimeout(detectProxy, INTERVAL);
        }
        getServerProxy(async (_, proxy) => {
            if (!isSettingProxy && proxy) {
                const settings = (0, settings_1.getSettings)();
                const { http, https } = proxy;
                const { port } = settings;
                const host = settings.host || util_1.LOCALHOST;
                const numericPort = Number(port) || 8899;
                if (!http.enabled || !https.enabled || http.host !== host
                    || https.host !== host || http.port !== numericPort
                    || https.port !== numericPort) {
                    if (autoSet) {
                        await enableSystemProxy();
                    }
                    else {
                        (0, proxy_1.setEnabled)(false);
                        updateProxyStatus();
                    }
                }
                else {
                    autoSet = false;
                }
            }
            else if (autoSet) {
                await enableSystemProxy();
            }
            updateTitle();
            setTimeout(detectProxy, INTERVAL);
        });
        return setTimeout(detectProxy, INTERVAL);
    };
    setTimeout(detectProxy, autoSet ? 200 : INTERVAL);
    electron_1.nativeTheme.on('updated', () => {
        const curTheme = getTheme();
        if (theme === curTheme) {
            return;
        }
        theme = curTheme;
        icons = createIcons();
        trayMenus = createTrayMenus();
        updateStartAtLogin();
        updateHideFromDock();
        updateProxyStatus();
        if (updateTrayMenus) {
            updateTrayMenus();
        }
    });
};
exports.create = create;
/**
 * Update rules configuration and refresh tray menu
 */
const updateRules = (rulesConf) => {
    if (rulesConfig && rulesConf && JSON.stringify(rulesConfig) === JSON.stringify(rulesConf)) {
        return;
    }
    rulesConfig = rulesConf;
    if (updateTrayMenus) {
        updateTrayMenus();
    }
};
exports.updateRules = updateRules;
/**
 * Refresh proxy status in menu
 */
const refreshProxyStatus = () => {
    if (updateCheckbox) {
        updateCheckbox(proxyMenu, (0, proxy_1.isEnabled)() === true);
        if (updateTrayMenus) {
            updateTrayMenus();
        }
    }
};
exports.refreshProxyStatus = refreshProxyStatus;
//# sourceMappingURL=menu.js.map