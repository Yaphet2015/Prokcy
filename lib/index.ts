import './patch';
import path from 'path';
import cp from 'child_process';
import {
  app, BrowserWindow, Menu, shell, systemPreferences,
  Event as ElectronEvent, WebContents,
} from 'electron';
import { writeLogSync } from 'whistle/lib/util/common';
import {
  noop, DOCK_ICON, showWin, getErrorStack, getErrorMsg, isMac, getDataUrl,
} from './util';
import * as ctx from './context';
import { showMessageBox } from './dialog';
import { createWindow, restart, showWindow } from './window';
import { applyThemeMode } from './preferences';
import forkWhistle from './fork';
import { checkForUpdates } from './updater';
import { version } from '../package.json';

// Set app name early so menu displays "Prokcy" instead of "Electron"
app.setName('Prokcy');

process.env.PFORK_EXEC_PATH = process.execPath;

const quitApp = (): void => app.quit();
const DOCK_UPDATE_THROTTLE_MS = 200;
const DOCK_UPDATE_FALLBACK_MS = 1000;

const handleSquirrel = (uninstall: boolean): void => {
  const updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'update.exe');
  const target = path.basename(process.execPath);
  const name = uninstall ? '--removeShortcut' : '--createShortcut';
  const child = cp.spawn(updateDotExe, [name, target], { detached: true });
  child.on('error', noop);
  child.on('close', quitApp);
};

const handleStartupEvent = (): boolean => {
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
let allWinList: BrowserWindow[] = [];
let allWinTitle: string[] = [];

const setAllWinList = (list: BrowserWindow[]): false => {
  allWinList = list;
  allWinTitle = list.map(w => w.title);
  return false;
};

const compareWinList = (list: BrowserWindow[]): boolean => {
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

const filterWin = (win: BrowserWindow): boolean =>
  // @ts-ignore - _isFindBar is a custom property
  !win._isFindBar && (!win.isSettingsWin || win.isVisible());

const updateDock = (): void => {
  const list = BrowserWindow.getAllWindows().filter(filterWin);
  if (compareWinList(list)) {
    return;
  }
  let focusedWin: BrowserWindow | null = BrowserWindow.getFocusedWindow();
  const menus = Menu.buildFromTemplate(allWinList.map((win) => ({
    label: win.title,
    type: 'checkbox',
    checked: focusedWin === win,
    click() {
      showWin(win);
      setImmediate(() => {
        focusedWin = BrowserWindow.getFocusedWindow();
        allWinList.forEach((w, i) => {
          menus.items[i].checked = w === focusedWin;
        });
      });
    },
  })));
  // app.dock is only available on macOS
  if (app.dock) {
    app.dock.setMenu(menus);
  }
};

let dockUpdateTimer: NodeJS.Timeout | null = null;
const scheduleDockUpdate = (): void => {
  if (dockUpdateTimer) {
    return;
  }
  dockUpdateTimer = setTimeout(() => {
    dockUpdateTimer = null;
    updateDock();
  }, DOCK_UPDATE_THROTTLE_MS);
};

// Initialize application
(() => {
  if (isMac) {
    if (app.dock) {
      app.dock.setIcon(DOCK_ICON);
    }
    systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true);
    systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true);
  }

  if (!app.requestSingleInstanceLock()) {
    // Windows 里面通过伪协议重新唤起客户端会触发 will-quit 事件
    return isMac ? quitApp() : undefined;
  }

  const handleParams = (url: string): void => {
    const dataUrl = getDataUrl(url);
    if (dataUrl) {
      ctx.setDataUrl(dataUrl);
    }
  };

  const lastArgv = process.argv && process.argv[process.argv.length - 1];
  handleParams(lastArgv);

  app.on('second-instance', (_e: ElectronEvent, argv: string[]) => {
    showWin(ctx.getWin());
    const lastArg = argv && argv[argv.length - 1];
    handleParams(lastArg);
  });

  if (handleStartupEvent()) {
    return;
  }

  if (isMac) {
    app.on('open-url', (_: ElectronEvent, url: string) => {
      showWindow();
      handleParams(url);
    });

    app.on('web-contents-created', (_: ElectronEvent, win: WebContents) => {
      win.on('page-title-updated', scheduleDockUpdate);
      // @ts-ignore - 'close' event exists but not in TypeScript definitions
      win.once('close', scheduleDockUpdate);
      // @ts-ignore - 'ready-to-show' event exists but not in WebContents type definitions
      win.on('ready-to-show', scheduleDockUpdate);
    });

    setInterval(scheduleDockUpdate, DOCK_UPDATE_FALLBACK_MS);
  }

  app.on('browser-window-created', (_: ElectronEvent, _win: BrowserWindow) => {
    // Find-bar removed to avoid conflict with editor's built-in search
  });

  app.whenReady().then(() => {
    app.userAgentFallback = `${app.userAgentFallback} Prokcy/${version}`;
    applyThemeMode();
    createWindow();
    void checkForUpdates({ silent: true, source: 'startup' });
    forkWhistle();
    // @ts-ignore - custom event for whistle settings changes
    app.on('whistleSettingsChanged', forkWhistle);
  });
})();

const handleGlobalException = async (err: unknown): Promise<void> => {
  const stack = getErrorStack(err);
  console.error(stack); // eslint-disable-line no-console
  writeLogSync(`\r\n${stack}\r\n`);

  let msg = getErrorMsg(err || 'An error occurred');
  const errorCode = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined;

  if (ctx.getOptions() || (typeof errorCode === 'string' && /^ERR_NETWORK/.test(errorCode)) ||
      (typeof msg === 'string' && /^net::/.test(msg))) {
    if (typeof errorCode === 'string' && /^UND_ERR_/.test(errorCode)) {
      ctx.execJsSafe(`window.showWhistleMessage(${JSON.stringify({ level: 'error', msg })});`);
    }
    return;
  }

  const handleCancel = (): void => app.exit();

  // @ts-ignore - waitForExiting is a custom property on app
  app.waitForExiting = showMessageBox(msg, {
    buttons: ['Feedback', 'Restart', 'Quit'],
    callback() {
      msg = encodeURIComponent(`[Bug]: ${msg}`);
      shell.openExternal(`https://github.com/Yaphet2015/Prokcy/issues/new?title=${msg}`);
      handleCancel();
    },
    handleAction: restart,
    handleCancel,
  }).then(res => {
    // @ts-ignore - waitForExiting is a custom property on app
    app.waitForExiting = null;
    return res === 1;
  });
};

process.on('unhandledRejection', handleGlobalException);
process.on('uncaughtException', handleGlobalException);
