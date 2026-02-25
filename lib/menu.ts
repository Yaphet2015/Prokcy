import path from 'path';
import {
  app,
  Menu,
  Tray,
  shell,
  nativeImage,
  nativeTheme,
  MenuItemConstructorOptions,
  NativeImage,
} from 'electron';
import setContextMenu from 'electron-context-menu';
import installRootCAFile from 'whistle/bin/ca';
import { version } from '../package.json';
import {
  isEnabled, enableProxy, disableProxy, setEnabled, getTitle,
} from './proxy';
import { showMessageBox } from './dialog';
import {
  getJson, getString, requireW2, LOCALHOST, TRAY_ICON,
  sudoPromptExec as sudoPrompt,
  getArtifactName,
  isMac,
} from './util';
import { getOptions, sendMsg, getWin } from './context';
import { restart, showWindow } from './window';
import { getSettings } from './settings';
import {
  getHideFromDock,
  getStartAtLogin,
  setHideFromDock,
  setStartAtLogin,
  applyThemeMode,
} from './preferences';
import storage from './storage';

const { getServerProxy } = requireW2('set-global-proxy') as {
  getServerProxy: (
    callback: (
      err: Error | null,
      proxy: {
        http: { enabled: boolean; host: string; port: number };
        https: { enabled: boolean; host: string; port: number };
      } | null
    ) => void
  ) => void;
};

/**
 * Type for rules configuration from whistle
 */
export interface RulesConfig {
  disabled?: boolean;
  list?: Array<{
    name: string;
    selected: boolean;
  }>;
}

/**
 * Type for menu item options with optional icon
 */
interface MenuItemWithOptions extends MenuItemConstructorOptions {
  icon?: NativeImage;
}

/**
 * Update tray menus function reference
 */
let updateTrayMenus: (() => void) | null = null;

/**
 * Current rules configuration
 */
let rulesConfig: RulesConfig | null = null;

/**
 * Whether proxy is currently being set
 */
let isSettingProxy = false;

/**
 * Update checkbox function reference
 */
let updateCheckbox: ((menu: MenuItemWithOptions, checked: boolean) => void) | null = null;

/**
 * Proxy menu item reference
 */
let proxyMenu: MenuItemWithOptions;

/**
 * Current window title
 */
let curTitle: string | undefined;

/**
 * Constants
 */
const INTERVAL = 5000;
const REPO_URL = 'https://github.com/Yaphet2015/Prokcy';
let tray: Tray | null = null; // Prevent GC (https://github.com/amhoho/electron-cn-docs/blob/master/faq.md)
const ICON_SIZE = { width: 15 };
const SEPARATOR_MENU: MenuItemConstructorOptions = { type: 'separator' };
const PATH_SEP_RE = /[\\/]/;

/**
 * Get current theme prefix based on system appearance
 */
const getTheme = (): string => (nativeTheme.shouldUseDarkColors ? 'dark/' : '');

let theme = getTheme();

/**
 * Icon cache for theme-aware icons
 */
const iconCache: Record<string, NativeImage> = {};

/**
 * Get or create a cached icon
 */
const getIcon = (name: string): NativeImage => {
  if (!PATH_SEP_RE.test(name)) {
    name = path.join(__dirname, `../public/${theme}${name}`);
  }
  let icon = iconCache[name];
  if (!icon) {
    icon = nativeImage.createFromPath(name).resize(ICON_SIZE);
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
const showRepo = (): void => {
  shell.openExternal(REPO_URL);
};

/**
 * Show About dialog
 */
const showAboutDialog = (): void => {
  showMessageBox(`Prokcy v${version}\n\nA cross-platform desktop network debugging proxy tool.`, {
    title: 'About Prokcy',
    type: 'info',
    buttons: ['OK'],
  });
};

/**
 * Report an issue on GitHub
 */
const reportIssue = (): void => {
  shell.openExternal('https://github.com/Yaphet2015/Prokcy/issues/new');
};

/**
 * View documentation
 */
const viewDocumentation = (): void => {
  shell.openExternal('https://github.com/Yaphet2015/Prokcy#readme');
};

// Configure context menu
setContextMenu({
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
const updateTitle = (): void => {
  const title = getTitle();
  if (title === curTitle) {
    return;
  }
  curTitle = title;
  const win = getWin();
  if (win) {
    win.setTitle(curTitle as string);
  }
  if (tray) {
    tray.setToolTip(curTitle as string);
  }
};

/**
 * Hide from dock menu item (macOS only)
 */
const hideDockMenu: MenuItemWithOptions = {
  label: 'Hide From Dock',
  icon: icons.uncheck,
  click() {
    updateHideFromDock(!getHideFromDock());
  },
};

/**
 * Update hide from dock state
 */
const updateHideFromDock = (hide?: boolean): void => {
  const actualHide = hide === undefined ? getHideFromDock() : hide;
  setHideFromDock(actualHide);
  if (updateCheckbox) {
    updateCheckbox(hideDockMenu, actualHide);
  }
};

updateHideFromDock();

/**
 * Main export: Create application menu and system tray
 */
export const create = async (): Promise<void> => {
  applyThemeMode();
  theme = getTheme();
  icons = createIcons();

  /**
   * Menu bar tray rules menu list
   */
  let trayRulesMenu: MenuItemConstructorOptions[] = [];

  let trayMenus: MenuItemConstructorOptions[] = [];

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
    const contextMenu = Menu.buildFromTemplate([...trayRulesMenu, ...trayMenus]);
    tray.setContextMenu(contextMenu);
  };

  let proxyAppMenuItem: (MenuItemConstructorOptions & { checked?: boolean }) | null = null;
  let startAppMenuItem: (MenuItemConstructorOptions & { checked?: boolean }) | null = null;
  let hideDockAppMenuItem: (MenuItemConstructorOptions & { checked?: boolean }) | null = null;
  let createAppMenus: (() => MenuItemConstructorOptions[]) | null = null;

  updateCheckbox = (menu: MenuItemWithOptions, checked: boolean) => {
    // Update tray menu item icon
    const icon = checked ? icons.checked : icons.uncheck;
    menu.icon = icon;

    // Update corresponding app menu item (for checkbox state)
    if (menu === proxyMenu && proxyAppMenuItem) {
      proxyAppMenuItem.checked = checked;
    } else if (menu.label === 'Start At Login' && startAppMenuItem) {
      startAppMenuItem.checked = checked;
    } else if (menu === hideDockMenu && hideDockAppMenuItem) {
      hideDockAppMenuItem.checked = checked;
    }

    // Rebuild app menu if createAppMenus is available
    if (createAppMenus) {
      const appMenu = Menu.buildFromTemplate(createAppMenus());
      Menu.setApplicationMenu(appMenu);
    }
    updateTrayMenus?.();
  };

  const updateProxyStatus = () => {
    if (updateCheckbox) {
      updateCheckbox(proxyMenu, isEnabled() === true);
    }
    storage.setProperty('autoSetProxy', isEnabled());
  };

  const enableSystemProxy = async () => {
    isSettingProxy = true;
    try {
      const settings = getSettings();
      await enableProxy({
        port: Number(settings.port) || 8899,
        host: settings.host || LOCALHOST,
        bypass: settings.bypass,
      });
      updateProxyStatus();
    } catch (e) {
      // Ignore errors
    }
    isSettingProxy = false;
    updateTitle();
  };

  const disableSystemProxy = async () => {
    try {
      await disableProxy();
      updateProxyStatus();
    } catch (e) {
      // Ignore errors
    }
    updateTitle();
  };

  const switchSystemProxy = () => {
    if (isEnabled()) {
      disableSystemProxy();
    } else {
      enableSystemProxy();
    }
  };

  const updateStartAtLogin = (startAtLogin?: boolean) => {
    const actualStartAtLogin = startAtLogin === undefined ? getStartAtLogin() : startAtLogin;
    setStartAtLogin(actualStartAtLogin);
    if (updateCheckbox) {
      updateCheckbox(startMenu as MenuItemWithOptions, actualStartAtLogin);
    }
  };

  const switchStartAtLogin = () => {
    updateStartAtLogin(!getStartAtLogin());
  };

  const installRootCA = async () => {
    try {
      const options = getOptions() as { rootCAFile: string };
      const useExceFunc = await installRootCAFile(options.rootCAFile, (cmd) => {
        sudoPrompt(cmd, (err) => {
          if (!err) {
            sendMsg({ type: 'enableCapture' });
          }
        });
      });
      if (!useExceFunc) {
        sendMsg({ type: 'enableCapture' });
      }
    } catch (e) {
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
      const pkg = await getJson('https://raw.githubusercontent.com/Yaphet2015/Prokcy/main/package.json');
      const newVersion = getString(pkg && (pkg as { version: string }).version);
      if (!newVersion) {
        showMessageBox('Network Error', checkUpdate);
        return;
      }
      if (version === newVersion) {
        showMessageBox('Prokcy is up to date', {
          title: '',
          type: 'info',
        });
        return;
      }
      showMessageBox(`Prokcy has new version ${newVersion}`, {
        type: 'info',
        title: '',
        buttons: ['Download', 'View CHANGELOG', 'Cancel'],
        callback() {
          shell.openExternal(`https://github.com/Yaphet2015/Prokcy/releases/download/v${newVersion}/${getArtifactName(newVersion)}`);
        },
        showSettings() {
          shell.openExternal('https://github.com/Yaphet2015/Prokcy/blob/main/CHANGELOG.md');
        },
        handleCancel() {},
      });
    } catch (e) {
      showMessageBox(e, checkUpdate);
    } finally {
      checking = false;
    }
  };

  // @ts-ignore - custom event for checking updates
  app.on('checkUpdateClient', checkUpdate);

  proxyMenu = {
    label: 'Set As System Proxy',
    icon: icons.uncheck,
    click: switchSystemProxy,
  };

  const startMenu: MenuItemWithOptions = {
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
      updateHideFromDock(!getHideFromDock());
    },
  };

  // Tray menu items (with icons)
  const createSystemMenus = (): MenuItemConstructorOptions[] => {
    const menus: MenuItemConstructorOptions[] = [
      {
        label: 'Settings',
        icon: icons.settings,
        accelerator: 'CommandOrControl+,',
        click: () => showWindow('Settings'),
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
    if (isMac) {
      menus.push(hideDockMenu);
    }
    return menus;
  };

  // Native macOS app menu (no icons, proper structure)
  createAppMenus = (): MenuItemConstructorOptions[] => {
    const appMenuItems: MenuItemConstructorOptions[] = [
      {
        label: `About ${app.getName()}`,
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
        click: () => showWindow('Settings'),
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

    if (isMac) {
      appMenuItems.push(hideDockAppMenuItem);
    }

    appMenuItems.push(
      SEPARATOR_MENU,
      {
        label: 'Restart',
        accelerator: 'CommandOrControl+Shift+R',
        click: restart,
      },
      {
        label: `Quit ${app.getName()}`,
        accelerator: 'CmdOrCtrl+Q',
        role: 'quit',
      },
    );

    const editMenu: MenuItemConstructorOptions = {
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
            const win = getWin();
            if (win) {
              win.webContents.send('menu-find');
            }
          },
        },
      ],
    };

    const viewMenu: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const win = getWin();
            if (win) {
              win.reload();
            }
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            const win = getWin();
            if (win) {
              win.webContents.toggleDevTools();
            }
          },
        },
        SEPARATOR_MENU,
        {
          label: 'Network',
          accelerator: 'CmdOrCtrl+1',
          click: () => showWindow('Network'),
        },
        {
          label: 'Rules',
          accelerator: 'CmdOrCtrl+2',
          click: () => showWindow('Rules'),
        },
        {
          label: 'Values',
          accelerator: 'CmdOrCtrl+3',
          click: () => showWindow('Values'),
        },
      ],
    };

    const windowMenu: MenuItemConstructorOptions = {
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

    const helpMenu: MenuItemConstructorOptions = {
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
        label: app.getName(),
        submenu: appMenuItems,
      },
      editMenu,
      viewMenu,
      windowMenu,
      helpMenu,
    ];
  };

  const createTrayMenus = (): MenuItemConstructorOptions[] => ([
    {
      label: 'Network',
      icon: icons.network,
      click() {
        showWindow('Network');
      },
    },
    {
      label: 'Rules',
      icon: icons.rules,
      click() {
        showWindow('Rules');
      },
    },
    {
      label: 'Values',
      icon: icons.values,
      click() {
        showWindow('Values');
      },
    },
    SEPARATOR_MENU,
    ...createSystemMenus(),
    SEPARATOR_MENU,
    {
      label: 'Restart',
      accelerator: 'CommandOrControl+Shift+R',
      click: restart,
    },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      role: 'quit',
    },
  ]);

  trayMenus = createTrayMenus();
  const trayIcon = getIcon(TRAY_ICON);
  trayIcon.setTemplateImage(true);
  tray = new Tray(trayIcon);
  if (process.platform === 'win32') {
    tray.on('click', () => showWindow());
  }
  updateStartAtLogin();
  updateHideFromDock();

  let autoSet = storage.getProperty('autoSetProxy') as boolean | undefined;
  if (autoSet) {
    await enableSystemProxy();
  } else {
    setEnabled(false);
  }
  updateTitle();

  const detectProxy = (): NodeJS.Timeout => {
    if (isSettingProxy || !isEnabled()) {
      autoSet = false;
      updateTitle();
      return setTimeout(detectProxy, INTERVAL);
    }
    getServerProxy(async (_, proxy) => {
      if (!isSettingProxy && proxy) {
        const settings = getSettings();
        const { http, https } = proxy;
        const { port } = settings;
        const host = settings.host || LOCALHOST;
        const numericPort = Number(port) || 8899;
        if (!http.enabled || !https.enabled || http.host !== host
          || https.host !== host || http.port !== numericPort
          || https.port !== numericPort) {
          if (autoSet) {
            await enableSystemProxy();
          } else {
            setEnabled(false);
            updateProxyStatus();
          }
        } else {
          autoSet = false;
        }
      } else if (autoSet) {
        await enableSystemProxy();
      }
      updateTitle();
      setTimeout(detectProxy, INTERVAL);
    });
    return setTimeout(detectProxy, INTERVAL);
  };

  setTimeout(detectProxy, autoSet ? 200 : INTERVAL);

  nativeTheme.on('updated', () => {
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

/**
 * Update rules configuration and refresh tray menu
 */
export const updateRules = (rulesConf: RulesConfig): void => {
  if (rulesConfig && rulesConf && JSON.stringify(rulesConfig) === JSON.stringify(rulesConf)) {
    return;
  }
  rulesConfig = rulesConf;
  if (updateTrayMenus) {
    updateTrayMenus();
  }
};

/**
 * Refresh proxy status in menu
 */
export const refreshProxyStatus = (): void => {
  if (updateCheckbox) {
    updateCheckbox(proxyMenu, isEnabled() === true);
    if (updateTrayMenus) {
      updateTrayMenus();
    }
  }
};
