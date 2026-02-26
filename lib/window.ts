import { app, BrowserWindow, Event } from 'electron';
import path from 'path';
import { ICON, closeWhistle, showWin } from './util';
import * as ctx from './context';
import { hideNativeWindowButtons } from './window-controls';

// Type imports for modules not yet migrated to TypeScript
type ProxyModule = {
  disableProxy: () => Promise<void>;
  isEnabled: () => boolean | undefined;
  getTitle: () => string;
};

type IpcModule = {
  initIpc: (win: BrowserWindow) => void;
};

const proxy = require('./proxy') as ProxyModule;
const { initIpc } = require('./ipc') as IpcModule;

// Application state
let willQuit: boolean | undefined;
let beforeQuit: boolean | undefined;

/**
 * Cleanup function to disable proxy and close whistle service
 * Called before application exit
 */
const cleanup = async (): Promise<void> => {
  if (proxy.isEnabled()) {
    try {
      await proxy.disableProxy();
    } catch (err) {
      // Silently ignore cleanup errors
    }
  }
  closeWhistle();
  app.removeListener('will-quit', handleWillQuit); // eslint-disable-line
};

/**
 * Handle the will-quit event from Electron
 * Ensures cleanup is performed before exiting
 */
const handleWillQuit = async (e: Event): Promise<void> => {
  if (willQuit) {
    return app.exit();
  }
  e.preventDefault();
  willQuit = true;
  await cleanup();
  app.exit();
};

// Valid tab names for navigation
type TabName = 'Network' | 'Rules' | 'Values' | 'Settings';
const TABS: TabName[] = ['Network', 'Rules', 'Values', 'Settings'];

/**
 * Show the main window and optionally navigate to a specific tab
 * @param name - Optional tab name to navigate to
 */
export const showWindow = (name?: TabName): void => {
  if (!willQuit) {
    showWin(ctx.getWin());
  }
  if (name && TABS.includes(name)) {
    ctx.execJsSafe(`window.showWhistleWebUI("${name}")`);
  }
};

/**
 * Create and configure the main BrowserWindow
 * Sets up window lifecycle events and loads the React app
 */
export const createWindow = (): void => {
  const win = new BrowserWindow({
    title: proxy.getTitle(),
    frame: false,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' } : {}),
    backgroundColor: '#111111',
    fullscreen: false,
    fullscreenable: true,
    icon: ICON,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false,
      webviewTag: true,
      preload: path.join(__dirname, '../electron-preload.js'),
    },
  });

  hideNativeWindowButtons(win);

  // Override find in page to use custom CodeMirror editor search
  // @ts-expect-error - onBeforeFindInPage is not in Electron type definitions
  win.onBeforeFindInPage = function (keyword: string, opts: { forward?: boolean }) {
    const prev = !!opts && !opts.forward;
    const escapedKeyword = String(keyword).replace(/"/g, '\\"');
    return ctx.execJsSafe(`window.__findWhistleCodeMirrorEditor_("${escapedKeyword}", ${prev});`);
  };

  ctx.setWin(win);
  win.setMenu(null);
  win.maximize();

  // Show window when ready
  win.on('ready-to-show', () => showWin(win));

  // Handle window close event
  win.on('close', (e: Event) => {
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
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  // Initialize IPC handlers
  initIpc(win);
};

// Register application event handlers
app.on('before-quit', () => {
  beforeQuit = true;
});

app.on('activate', () => showWindow());
app.on('will-quit', handleWillQuit);

/**
 * Check if the application is in the process of quitting
 * @returns true if willQuit flag is set
 */
export const willQuitActive = (): boolean => !!willQuit;

/**
 * Restart the application
 * Cleans up current instance and relaunches
 */
export const restart = async (): Promise<void> => {
  willQuit = true;
  await cleanup();
  app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
  app.exit();
};
