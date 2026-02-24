# TypeScript Migration for lib/ Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate 16 CommonJS modules in `lib/` to TypeScript with ESM syntax, compiled to CommonJS for Electron compatibility.

**Architecture:** Create separate TypeScript configuration for Electron main process (`tsconfig.lib.json`), compile to `dist-lib/` with CommonJS output, use ESM syntax in source, install `@types/electron` for type safety, create stub declarations for untyped dependencies (whistle, sudo-prompt).

**Tech Stack:** TypeScript 5.9, Electron 39, @types/electron, @types/node, tsx (dev), esbuild (production)

---

## Task 1: Install TypeScript Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @types/electron**

```bash
npm install --save-dev @types/electron
```

Expected: Package installed successfully, `@types/electron` added to devDependencies

**Step 2: Verify installation**

```bash
cat package.json | grep "@types/electron"
```

Expected: `"@types/electron": "^<version>"` appears in devDependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @types/electron for type safety"
```

---

## Task 2: Create TypeScript Configuration for lib/

**Files:**
- Create: `tsconfig.lib.json`

**Step 1: Create tsconfig.lib.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist-lib",
    "rootDir": "./lib",
    "lib": ["ES2020"],
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["lib/**/*"],
  "exclude": ["node_modules", "dist-lib"]
}
```

**Step 2: Verify configuration is valid**

```bash
npx tsc -p tsconfig.lib.json --showConfig
```

Expected: JSON output showing merged configuration

**Step 3: Commit**

```bash
git add tsconfig.lib.json
git commit -m "feat: add TypeScript config for Electron main process"
```

---

## Task 3: Create Type Declarations Directory

**Files:**
- Create: `lib/types/electron.d.ts`
- Create: `lib/types/whistle.d.ts`
- Create: `lib/types/index.d.ts`

**Step 1: Create lib/types directory**

```bash
mkdir -p lib/types
```

**Step 2: Create lib/types/electron.d.ts**

```typescript
// Electron type augmentations and custom extensions
import { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';

export interface WindowControls {
  minimize(): void;
  toggleMaximize(): void;
  close(): void;
}

export interface RuntimeConfig {
  host: string;
  port: string | number;
  username: string;
  password: string;
}

export interface IpcRequest {
  host: string;
  port: string | number;
  username: string;
  password: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path?: string;
  body?: unknown;
  timeout?: number;
}

export interface NetworkQuery {
  count?: number;
  [key: string]: string | number | undefined;
}
```

**Step 3: Create lib/types/whistle.d.ts**

```typescript
// Whistle type declarations (stubs for untyped dependencies)
declare module 'whistle' {
  export interface WhistleOptions {
    port: number;
    host?: string;
    socksPort?: number;
    username?: string;
    password?: string;
    uiAuth?: { username?: string; password?: string };
    maxHttpHeaderSize?: number;
  }

  export interface RulesPayload {
    [key: string]: any;
    defalutRules?: string;
    list?: Array<{ name: string; selected: boolean }>;
  }

  export function startWhistle(options: WhistleOptions): any;
  export function getWhistlePath(): string;
}

declare module 'whistle/require' {
  export default function requireW2(name: string): any;
}

declare module 'whistle/lib/util/common' {
  export function writeLogSync(message: string): void;
}

declare module 'whistle.proxyauth' {
  const version: string;
  export default version;
}
```

**Step 4: Create lib/types/index.d.ts**

```typescript
// Shared type definitions

export interface ProxySettings {
  host: string;
  port: number;
  username?: string;
  password?: string;
  socksPort?: number;
  maxHttpHeaderSize?: number;
  autoSetProxy?: boolean;
}

export interface Preferences {
  startAtLogin?: boolean;
  hideFromDock?: boolean;
  themeMode?: 'light' | 'dark' | 'auto';
  requestFilters?: string[];
  rulesOrder?: string[];
  enableMultipleRules?: boolean;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  startTime: number;
  endTime: number;
  phases: {
    dns?: number;
    tcp?: number;
    tls?: number;
    ttfb?: number;
    download?: number;
  };
}

export interface RulesGroup {
  name: string;
  content: string;
  selected: boolean;
}

export interface ValueEntry {
  name: string;
  value: string;
}

export interface ServiceStatus {
  running: boolean;
}

export interface IpcResponse<T = unknown> {
  success?: boolean;
  ec?: number;
  message?: string;
  data?: T;
}
```

**Step 5: Verify type declarations compile**

```bash
npx tsc -p tsconfig.lib.json --noEmit
```

Expected: No errors (only warnings about no source files yet)

**Step 6: Commit**

```bash
git add lib/types/
git commit -m "feat: add TypeScript type declarations for Electron and Whistle"
```

---

## Task 4: Update package.json Scripts and Main Entry

**Files:**
- Modify: `package.json`

**Step 1: Update main entry point**

Change:
```json
"main": "./lib/index.js",
```

To:
```json
"main": "./dist-lib/index.js",
```

**Step 2: Add build and watch scripts**

Add to scripts section:
```json
"build:lib": "tsc -p tsconfig.lib.json",
"watch:lib": "tsc -p tsconfig.lib.json --watch",
```

**Step 3: Update dev script**

Change:
```json
"dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
```

To:
```json
"dev": "npm run build:lib && concurrently \"npm run dev:vite\" \"npm run watch:lib\" \"npm run dev:electron\"",
```

**Step 4: Update dev:electron script**

Change:
```json
"dev:electron": "wait-on tcp:127.0.0.1:5173 && electron ./lib",
```

To:
```json
"dev:electron": "wait-on tcp:127.0.0.1:5173 && electron ./dist-lib",
```

**Step 5: Update start script**

Change:
```json
"start": "electron ./lib",
```

To:
```json
"start": "npm run build:lib && electron ./dist-lib",
```

**Step 6: Add prebuild hooks**

Add before each build script:
```json
"prebuild:react": "npm run build:lib",
"prebuild:mac": "npm run build:lib",
"prebuild:win": "npm run build:lib",
"prebuild:linux": "npm run build:lib",
```

**Step 7: Verify package.json is valid**

```bash
cat package.json | jq .
```

Expected: Valid JSON output

**Step 8: Commit**

```bash
git add package.json
git commit -m "feat: configure build scripts for TypeScript compilation"
```

---

## Task 5: Migrate util.js to TypeScript

**Files:**
- Create: `lib/util.ts`
- Delete: `lib/util.js` (after verification)

**Step 1: Create lib/util.ts with TypeScript types**

```typescript
import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import http from 'http';
import { parse } from 'url';
import sudoPrompt from 'sudo-prompt';
import requireW2 from 'whistle/require';
import { getWhistlePath } from 'whistle';
import { getChild, sendMsg, getOptions } from './context';
import config from '../package.json';

const fse = requireW2('fs-extra');

export const noop = () => {};

const USERNAME = config.name;
export const PROC_PATH = path.join(homedir(), '.whistle_client.pid');
const HTTPS_RE = /^https:\/\//;
const URL_RE = /^https?:\/\/\S/;
export const LOCALHOST = '127.0.0.1';
export const isMac = process.platform === 'darwin';
const IMPORT_URL_RE = /[?&#]data(?:_url|Url)=([^&#]+)(?:&|#|$)/;
const SUDO_OPTIONS = { name: 'Whistle' };

export function getDataUrl(url: string): string | null {
  const result = IMPORT_URL_RE.exec(url);
  if (!result) {
    return;
  }
  let matchedUrl: string;
  [, matchedUrl] = result;
  try {
    matchedUrl = decodeURIComponent(matchedUrl).trim();
  } catch (e) {
    // Ignore decode errors
  }
  return URL_RE.test(matchedUrl) ? matchedUrl : null;
}

export const VERSION = config.version;
export const BASE_DIR = path.join(getWhistlePath(), '.whistle_client');
export const CLIENT_PLUGINS_PATH = path.join(getWhistlePath(), '.whistle_client_plugins');
export const CUSTOM_PLUGINS_PATH = path.join(getWhistlePath(), 'custom_plugins');
export const ICON = path.join(__dirname, '../public/dock.png');
export const DOCK_ICON = path.join(__dirname, '../public/dock.png');
export const TRAY_ICON = isMac ? path.join(__dirname, '../public/dock.png') : ICON;
export { USERNAME };

export function sudoExec(command: string, callback: (error?: Error) => void): void {
  sudoPrompt.exec(command, SUDO_OPTIONS, callback);
}

const existsFile = (file: string): Promise<boolean> =>
  new Promise((resolve) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        return fs.stat(file, (_, s) => resolve(s && s.isFile()));
      }
      resolve(stat.isFile());
    });
  });

const readFile = (file: string): Promise<Buffer | null> =>
  new Promise((resolve) => {
    fs.readFile(file, (err, buf) => {
      if (err) {
        return fs.readFile(file, (_, buf2) => resolve(buf2));
      }
      resolve(buf);
    });
  });

export async function compareFile(file1: string, file2: string): Promise<boolean> {
  const exists = await existsFile(file1);
  if (!exists) {
    return false;
  }
  const [ctn1, ctn2] = await Promise.all([readFile(file1), readFile(file2)]);
  return ctn1 && ctn2 ? ctn1.equals(ctn2) : false;
}

export function readJson(file: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    fse.readJson(file, (err: Error, data: unknown) => {
      if (err) {
        return fse.readJson(file, (_: Error, data2: unknown) => {
          resolve((data2 as Record<string, unknown>) || {});
        });
      }
      resolve((data as Record<string, unknown>) || {});
    });
  });
}

const killProcess = (pid?: number): void => {
  if (pid) {
    try {
      process.kill(pid);
    } catch (e) {
      // Ignore kill errors
    }
  }
};

export function closeWhistle(): void {
  const child = getChild();
  const curPid = child && child.pid;
  if (child) {
    child.removeAllListeners();
    child.on('error', noop);
  }
  if (curPid) {
    sendMsg({ type: 'exitWhistle' });
    killProcess(curPid);
  }
  try {
    const pid = Number(
      fs.readFileSync(PROC_PATH, { encoding: 'utf-8' }).split(',', 1)[0]
    );
    if (pid !== curPid) {
      killProcess(pid);
    }
  } catch (e) {
    // Ignore read errors
  } finally {
    try {
      fs.unlinkSync(PROC_PATH);
    } catch (e) {
      // Ignore unlink errors
    }
  }
}

export function showWin(win: Electron.BrowserWindow | null): void {
  if (!win) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

export function getErrorMsg(err: unknown): string {
  try {
    return (err as Error).message || (err as Error).stack || `${err}`;
  } catch (e) {
    // Ignore
  }
  return 'Unknown Error';
}

export function getErrorStack(err: unknown): string {
  if (!err) {
    return '';
  }

  let stack: string | undefined;
  try {
    stack = (err as Error).stack;
  } catch (e) {
    // Ignore
  }
  stack = stack || (err as Error).message || String(err);
  const result = [
    `From: ${USERNAME}@${config.version}`,
    `Node: ${process.version}`,
    `Date: ${new Date().toLocaleString()}`,
    stack,
  ];
  return result.join('\r\n');
}

const parseJson = (str: string): unknown | null => {
  try {
    return str && JSON.parse(str);
  } catch (e) {
    return null;
  }
};

export function getString(str: unknown, len?: number): string {
  if (typeof str !== 'string') {
    return '';
  }
  let trimmed = str.trim();
  return len ? trimmed.substring(0, len) : trimmed;
}

export function getJson(url: string): Promise<unknown> {
  const options = getOptions();
  if (!options) {
    return Promise.reject(new Error('Options not available'));
  }
  const isHttps = HTTPS_RE.test(url);
  const parsedUrl = parse(url.replace(HTTPS_RE, 'http://'));
  const headers: Record<string, string> = { host: parsedUrl.host };
  if (isHttps) {
    headers['x-whistle-https-request'] = '1';
  }
  (parsedUrl as any).headers = headers;
  delete (parsedUrl as any).hostname;
  (parsedUrl as any).host = options.host || LOCALHOST;
  (parsedUrl as any).port = options.port;

  return new Promise((resolve, reject) => {
    const handleError = (err: Error) => {
      clearTimeout(timer);
      reject(err || new Error('Timeout'));
      client.destroy();
    };
    const timer = setTimeout(() => handleError(new Error('Timeout')), 16000);
    const client = http.get(parsedUrl as any, (res) => {
      res.on('error', handleError);
      if (res.statusCode !== 200) {
        return handleError(new Error(`Response code ${res.statusCode}`));
      }
      let body: Buffer | null = null;
      res.on('data', (chunk: Buffer) => {
        body = body ? Buffer.concat([body, chunk]) : chunk;
      });
      res.once('end', () => {
        clearTimeout(timer);
        resolve(parseJson(body && body.toString()));
      });
    });
    client.on('error', handleError);
  });
}

const isUserInstaller = false;
const isArm = (): boolean => /^arm/i.test(process.arch);

export function getArtifactName(version: string): string {
  const name = `${config.name}-${isUserInstaller ? 'user-installer-' : ''}v${version}-`;
  switch (process.platform) {
    case 'win32':
      return `${name}win-x64.exe`;
    case 'darwin':
      return `${name}mac-${isArm() ? 'arm64' : 'x64'}.dmg`;
    default:
      return `${name}linux-${isArm() ? 'arm64' : 'x86_64'}.AppImage`;
  }
}

export { requireW2 };
```

**Step 2: Compile util.ts**

```bash
npx tsc -p tsconfig.lib.json
```

Expected: `dist-lib/util.js` and `dist-lib/util.d.ts` created successfully

**Step 3: Verify compiled output exists**

```bash
ls -la dist-lib/util.*
```

Expected: `util.js`, `util.d.ts`, `util.map` files exist

**Step 4: Test basic import (ensure no runtime errors yet)**

```bash
node -e "const util = require('./dist-lib/util.js'); console.log('VERSION:', util.VERSION);"
```

Expected: `VERSION: 1.5.5` (or current version)

**Step 5: Commit**

```bash
git add lib/util.ts dist-lib/
git commit -m "feat: migrate util.js to TypeScript"
```

---

## Task 6: Migrate context.js to TypeScript

**Files:**
- Create: `lib/context.ts`
- Delete: `lib/context.js` (after verification)

**Step 1: Create lib/context.ts**

```typescript
import { MessagePort } from 'worker_threads';

let win: Electron.BrowserWindow | null = null;
let child: Electron.UtilityProcess | null = null;
let options: unknown = null;
let dataUrl: string | null = null;
let timer: NodeJS.Timeout | null = null;
let isRunning = false;

const execJsSafe = async (code: string): Promise<unknown> => {
  try {
    return await win?.webContents.executeJavaScript(code);
  } catch (e) {
    return null;
  }
};

const importDataUrl = async (delay: boolean | true): Promise<void> => {
  if (delay !== true && win && isRunning && dataUrl && win.webContents) {
    const result = await execJsSafe(`window.setWhistleDataUrl("${dataUrl}")`);
    if (result != null) {
      dataUrl = null;
    }
  }
  timer = dataUrl ? setTimeout(importDataUrl, isRunning ? 100 : 300) : undefined;
};

const setDataUrl = (): void => {
  if (timer) clearTimeout(timer);
  importDataUrl(true);
};

export function setChild(c: Electron.UtilityProcess | null): void {
  child = c;
}

export function getChild(): Electron.UtilityProcess | null {
  return child;
}

export function setWin(w: Electron.BrowserWindow | null): void {
  win = w;
  setDataUrl();
}

export function getWin(): Electron.BrowserWindow | null {
  return win;
}

export function setOptions(o: unknown): void {
  options = o;
}

export function getOptions(): unknown {
  return options;
}

export function sendMsg(data: unknown): void {
  if (child) {
    child.postMessage(data as any);
  }
}

export function setDataUrl(url: string): void {
  dataUrl = url.replace(/[^\w.~!*'’();:@&=+$,/?#[\]<>{}|%-]/g, (s) => {
    try {
      return encodeURIComponent(s);
    } catch (e) {
      return '';
    }
  });
  setDataUrl();
}

export function isServiceRunning(): boolean {
  return isRunning;
}

export function setRunning(running: boolean): void {
  isRunning = running;
}

export { execJsSafe };
```

**Step 2: Compile context.ts**

```bash
npx tsc -p tsconfig.lib.json
```

Expected: `dist-lib/context.js` created successfully

**Step 3: Verify compilation**

```bash
ls -la dist-lib/context.*
```

Expected: `context.js`, `context.d.ts`, `context.map` exist

**Step 4: Commit**

```bash
git add lib/context.ts dist-lib/
git commit -m "feat: migrate context.js to TypeScript"
```

---

## Task 7: Migrate storage.js to TypeScript

**Files:**
- Create: `lib/storage.ts`
- Delete: `lib/storage.js` (after verification)

**Step 1: Create lib/storage.ts**

```typescript
import path from 'path';
import { getWhistlePath } from 'whistle';

const STORAGE_FILE = path.join(getWhistlePath(), '.whistle_client', 'proxy_settings');

let storage: Record<string, any> = {};

function readStorage(): Record<string, any> {
  try {
    const fs = require('fs');
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, { encoding: 'utf-8' });
      storage = JSON.parse(content) || {};
    }
  } catch (e) {
    storage = {};
  }
  return storage;
}

function writeStorage(): void {
  try {
    const fs = require('fs');
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2), { encoding: 'utf-8' });
  } catch (e) {
    // Silently fail on write errors
  }
}

export function getProperty(key: string): any {
  if (!storage || Object.keys(storage).length === 0) {
    readStorage();
  }
  return storage[key];
}

export function setProperty(key: string, value: any): void {
  storage[key] = value;
  writeStorage();
}

export function getAllProperties(): Record<string, any> {
  if (!storage || Object.keys(storage).length === 0) {
    readStorage();
  }
  return { ...storage };
}

export function clearStorage(): void {
  storage = {};
  writeStorage();
}
```

**Step 2: Compile storage.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 3: Verify compilation**

```bash
ls -la dist-lib/storage.*
```

**Step 4: Commit**

```bash
git add lib/storage.ts dist-lib/
git commit -m "feat: migrate storage.js to TypeScript"
```

---

## Task 8: Migrate dialog.js to TypeScript

**Files:**
- Create: `lib/dialog.ts`
- Delete: `lib/dialog.js` (after verification)

**Step 1: Create lib/dialog.ts**

```typescript
import { dialog, BrowserWindow } from 'electron';

interface MessageBoxOptions {
  buttons?: string[];
  callback?: () => void;
  handleAction?: () => void | Promise<void>;
  handleCancel?: () => void | Promise<void>;
}

export function showMessageBox(
  message: string,
  options: MessageBoxOptions = {}
): Promise<number> {
  const { buttons = ['OK'], callback, handleAction, handleCancel } = options;

  return new Promise((resolve) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = dialog.showMessageBoxSync(win || undefined, {
      type: 'error',
      title: 'Prokcy',
      message,
      buttons,
      noLink: true,
    });

    if (callback) callback();

    if (result === 0 && handleAction) {
      handleAction();
    } else if (result === 1 && handleCancel) {
      handleCancel();
    }

    resolve(result);
  });
}
```

**Step 2: Compile dialog.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 3: Verify compilation**

```bash
ls -la dist-lib/dialog.*
```

**Step 4: Commit**

```bash
git add lib/dialog.ts dist-lib/
git commit -m "feat: migrate dialog.js to TypeScript"
```

---

## Task 9: Migrate window-controls.js to TypeScript

**Files:**
- Create: `lib/window-controls.ts`
- Delete: `lib/window-controls.js` (after verification)

**Step 1: Create lib/window-controls.ts**

```typescript
import { BrowserWindow } from 'electron';

export function hideNativeWindowButtons(win: BrowserWindow): void {
  if (process.platform === 'darwin') {
    win.setWindowButtonPosition({ x: 0, y: -100 });
  }
}

export function toggleMaximize(win: BrowserWindow): void {
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
}

interface MaximizeStateCallback {
  (isMaximized: boolean): void;
}

export function bindMaximizeStateEvents(
  win: BrowserWindow,
  callback: MaximizeStateCallback
): void {
  win.on('maximize', () => callback(true));
  win.on('unmaximize', () => callback(false));
}
```

**Step 2: Compile window-controls.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 3: Verify compilation**

```bash
ls -la dist-lib/window-controls.*
```

**Step 4: Commit**

```bash
git add lib/window-controls.ts dist-lib/
git commit -m "feat: migrate window-controls.js to TypeScript"
```

---

## Task 10: Migrate window.js to TypeScript

**Files:**
- Create: `lib/window.ts`
- Delete: `lib/window.js` (after verification)

**Step 1: Create lib/window.ts**

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { ICON, closeWhistle, showWin } from './util';
import ctx from './context';
import { disableProxy, isEnabled, getTitle } from './proxy';
import { initIpc } from './ipc';
import { hideNativeWindowButtons } from './window-controls';

let willQuit = false;
let beforeQuit = false;

const cleanup = async (): Promise<void> => {
  if (isEnabled()) {
    try {
      await disableProxy();
    } catch (err) {
      // Ignore disable errors
    }
  }
  closeWhistle();
  app.removeListener('will-quit', handleWillQuit);
};

const handleWillQuit = async (e: Electron.Event): Promise<void> => {
  if (willQuit) {
    return app.exit();
  }
  e.preventDefault();
  willQuit = true;
  await cleanup();
  app.exit();
};

const TABS = ['Network', 'Rules', 'Values', 'Plugins', 'Settings'];

export function showWindow(name?: string): void {
  if (!willQuit) {
    showWin(ctx.getWin());
  }
  if (name && TABS.includes(name)) {
    ctx.execJsSafe(`window.showWhistleWebUI("${name}")`);
  }
}

export function createWindow(): void {
  const win = new BrowserWindow({
    title: getTitle(),
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

  win.onBeforeFindInPage = function (keyword: string, opts?: { forward?: boolean }) {
    const prev = opts && !opts.forward;
    const escapedKeyword = String(keyword).replace(/"/g, '\\"');
    return ctx.execJsSafe(
      `window.__findWhistleCodeMirrorEditor_("${escapedKeyword}", ${prev});`
    );
  };

  ctx.setWin(win);
  win.setMenu(null);
  win.maximize();
  win.on('ready-to-show', () => showWin(win));
  win.on('close', (e) => {
    if (beforeQuit) {
      return;
    }
    beforeQuit = false;
    e.preventDefault();
    win.hide();
  });
  win.webContents.once('page-title-updated', () => {
    win.setTitle(getTitle());
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  initIpc(win);
}

app.on('before-quit', () => {
  beforeQuit = true;
});
app.on('activate', showWindow);
app.on('will-quit', handleWillQuit);

export function willQuitActive(): boolean {
  return willQuit;
}

export async function restart(): Promise<void> {
  willQuit = true;
  await cleanup();
  app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
  app.exit();
}
```

**Step 2: Compile window.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 3: Verify compilation**

```bash
ls -la dist-lib/window.*
```

**Step 4: Commit**

```bash
git add lib/window.ts dist-lib/
git commit -m "feat: migrate window.js to TypeScript"
```

---

## Task 11: Migrate preferences.js to TypeScript

**Files:**
- Create: `lib/preferences.ts`
- Delete: `lib/preferences.js` (after verification)

**Step 1: Read original preferences.js**

```bash
cat lib/preferences.js
```

**Step 2: Create lib/preferences.ts** (based on original content)

```typescript
import { nativeTheme, app } from 'electron';
import path from 'path';
import { getProperty, setProperty } from './storage';
import type { Preferences } from './types';

const PREFS_KEY = 'preferences';

function getStoredPreferences(): Preferences {
  try {
    const stored = getProperty(PREFS_KEY);
    return stored || {};
  } catch (e) {
    return {};
  }
}

export function getPreferences(): Preferences {
  return {
    startAtLogin: getStartAtLogin(),
    hideFromDock: getHideFromDock(),
    themeMode: getThemeMode(),
    requestFilters: getRequestFilters(),
    rulesOrder: getRulesOrder(),
    enableMultipleRules: getEnableMultipleRules(),
  };
}

export function setStartAtLogin(enabled: boolean): void {
  const prefs = getStoredPreferences();
  prefs.startAtLogin = enabled;
  setProperty(PREFS_KEY, prefs);

  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: enabled,
  });
}

export function getStartAtLogin(): boolean {
  const prefs = getStoredPreferences();
  const settings = app.getLoginItemSettings();
  return prefs.startAtLogin ?? settings.openAtLogin ?? false;
}

export function setHideFromDock(hide: boolean): void {
  const prefs = getStoredPreferences();
  prefs.hideFromDock = hide;
  setProperty(PREFS_KEY, prefs);

  if (process.platform === 'darwin') {
    app.dock.setHidden(hide);
  }
}

export function getHideFromDock(): boolean {
  const prefs = getStoredPreferences();
  return prefs.hideFromDock ?? false;
}

export function setThemeMode(mode: 'light' | 'dark' | 'auto'): void {
  const prefs = getStoredPreferences();
  prefs.themeMode = mode;
  setProperty(PREFS_KEY, prefs);
  applyThemeMode(mode);
}

export function getThemeMode(): 'light' | 'dark' | 'auto' {
  const prefs = getStoredPreferences();
  return prefs.themeMode ?? 'auto';
}

export function applyThemeMode(mode?: 'light' | 'dark' | 'auto'): void {
  const effectiveMode = mode ?? getThemeMode();
  if (effectiveMode === 'light') {
    nativeTheme.themeSource = 'light';
  } else if (effectiveMode === 'dark') {
    nativeTheme.themeSource = 'dark';
  } else {
    nativeTheme.themeSource = 'system';
  }
}

export function setRequestFilters(filters: string[]): void {
  const prefs = getStoredPreferences();
  prefs.requestFilters = filters;
  setProperty(PREFS_KEY, prefs);
}

export function getRequestFilters(): string[] {
  const prefs = getStoredPreferences();
  return prefs.requestFilters ?? [];
}

export function setRulesOrder(order: string[]): boolean {
  try {
    const prefs = getStoredPreferences();
    prefs.rulesOrder = order;
    setProperty(PREFS_KEY, prefs);
    return true;
  } catch (e) {
    return false;
  }
}

export function getRulesOrder(): string[] {
  const prefs = getStoredPreferences();
  return prefs.rulesOrder ?? [];
}

export function setEnableMultipleRules(enabled: boolean): void {
  const prefs = getStoredPreferences();
  prefs.enableMultipleRules = enabled;
  setProperty(PREFS_KEY, prefs);
}

export function getEnableMultipleRules(): boolean {
  const prefs = getStoredPreferences();
  return prefs.enableMultipleRules ?? false;
}
```

**Step 3: Compile preferences.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/preferences.*
```

**Step 5: Commit**

```bash
git add lib/preferences.ts dist-lib/
git commit -m "feat: migrate preferences.js to TypeScript"
```

---

## Task 12: Migrate proxy.js to TypeScript

**Files:**
- Create: `lib/proxy.ts`
- Delete: `lib/proxy.js` (after verification)

**Step 1: Read original proxy.js**

```bash
cat lib/proxy.js
```

**Step 2: Create lib/proxy.ts** (based on original content)

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import type { ProxySettings } from './types';

const execAsync = promisify(exec);

let isProxyEnabled = false;

export function isEnabled(): boolean {
  return isProxyEnabled;
}

async function setMacProxy(enable: boolean, settings: ProxySettings): Promise<void> {
  const { host, port } = settings;
  const service = 'Wi-Fi'; // Default, may need detection

  const commands = [
    `networksetup -setwebproxy ${service} ${host} ${port}`,
    `networksetup -setsecurewebproxy ${service} ${host} ${port}`,
  ];

  if (enable) {
    commands.push(
      `networksetup -setwebproxystate ${service} on`,
      `networksetup -setsecurewebproxystate ${service} on`
    );
  } else {
    commands.push(
      `networksetup -setwebproxystate ${service} off`,
      `networksetup -setsecurewebproxystate ${service} off`
    );
  }

  for (const cmd of commands) {
    await execAsync(cmd);
  }
}

async function setWindowsProxy(enable: boolean, settings: ProxySettings): Promise<void> {
  const registry = [
    'reg add',
    '"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"',
    '/v',
    enable ? 'ProxyEnable /t REG_DWORD /d 1 /f' : 'ProxyEnable /t REG_DWORD /d 0 /f',
  ].join(' ');

  await execAsync(registry);

  if (enable) {
    const { host, port } = settings;
    const proxyServer = `${host}:${port}`;
    await execAsync(
      [
        'reg add',
        '"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"',
        '/v ProxyServer /t REG_SZ /d',
        `"${proxyServer}" /f`,
      ].join(' ')
    );
  }

  // Notify system of proxy change
  await execAsync(
    'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxySettingsPerUser /t REG_DWORD /d 1 /f'
  );
}

async function setLinuxProxy(enable: boolean, settings: ProxySettings): Promise<void> {
  // GNOME-based desktops
  try {
    const { host, port } = settings;
    const mode = enable ? "'manual'" : "'none'";
    const httpProxy = enable ? `"'http://${host}:${port}'"` : '""';
    const httpsProxy = enable ? `"'https://${host}:${port}'"` : '""';

    await execAsync(`gsettings set org.gnome.system.proxy mode ${mode}`);
    if (enable) {
      await execAsync(`gsettings set org.gnome.system.proxy.http host ${host}`);
      await execAsync(`gsettings set org.gnome.system.proxy.http port ${port}`);
      await execAsync(`gsettings set org.gnome.system.proxy.https host ${host}`);
      await execAsync(`gsettings set org.gnome.system.proxy.https port ${port}`);
    }
  } catch (e) {
    // Silently fail if gsettings not available
  }
}

export async function enableProxy(settings: ProxySettings): Promise<void> {
  const platform = process.platform;

  if (platform === 'darwin') {
    await setMacProxy(true, settings);
  } else if (platform === 'win32') {
    await setWindowsProxy(true, settings);
  } else {
    await setLinuxProxy(true, settings);
  }

  isProxyEnabled = true;
}

export async function disableProxy(): Promise<void> {
  const settings: ProxySettings = {
    host: '127.0.0.1',
    port: 8888,
  };

  const platform = process.platform;

  if (platform === 'darwin') {
    await setMacProxy(false, settings);
  } else if (platform === 'win32') {
    await setWindowsProxy(false, settings);
  } else {
    await setLinuxProxy(false, settings);
  }

  isProxyEnabled = false;
}

export function getTitle(): string {
  const base = 'Prokcy';
  return isProxyEnabled ? `${base} ●` : base;
}
```

**Step 3: Compile proxy.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/proxy.*
```

**Step 5: Commit**

```bash
git add lib/proxy.ts dist-lib/
git commit -m "feat: migrate proxy.js to TypeScript"
```

---

## Task 13: Migrate settings.js to TypeScript

**Files:**
- Create: `lib/settings.ts`
- Delete: `lib/settings.js` (after verification)

**Step 1: Read original settings.js**

```bash
cat lib/settings.js
```

**Step 2: Create lib/settings.ts** (based on original content)

```typescript
import { shell, BrowserWindow } from 'electron';
import path from 'path';
import { BASE_DIR, readJson, getErrorMsg, getErrorStack, LOCALHOST, VERSION, isMac, sudoExec } from './util';
import { showMessageBox } from './dialog';
import { getProperty, setProperty } from './storage';
import type { ProxySettings } from './types';

const SETTINGS_FILE = path.join(BASE_DIR, 'proxy_settings');
const SETTINGS_KEY = 'proxy_settings';

let settings: ProxySettings | null = null;

export function getSettings(): ProxySettings {
  if (settings) {
    return settings;
  }

  try {
    const stored = getProperty(SETTINGS_KEY);
    if (stored && typeof stored === 'object') {
      settings = stored as ProxySettings;
      return settings!;
    }

    // Read from file as fallback
    const fileSettings = readJson(SETTINGS_FILE) as Promise<ProxySettings>;
    return fileSettings as any;
  } catch (e) {
    return {
      host: LOCALHOST,
      port: 8888,
      maxHttpHeaderSize: 256,
    };
  }
}

export async function applySettings(
  newSettings: Partial<ProxySettings>,
  options: { hideOnSuccess?: boolean; showErrorToast?: boolean } = {}
): Promise<{ success: boolean; message?: string }> {
  try {
    const current = getSettings();
    settings = { ...current, ...newSettings };
    setProperty(SETTINGS_KEY, settings);

    if (options.hideOnSuccess) {
      // Optionally hide success message
    }

    return { success: true };
  } catch (err) {
    const msg = getErrorMsg(err);
    if (options.showErrorToast !== false) {
      // Show error toast if needed
    }
    return { success: false, message: msg };
  }
}

export async function authorization(settings: ProxySettings): Promise<boolean> {
  const { username, password } = settings;
  if (!username && !password) {
    return true;
  }

  // Test authorization by making a request
  // Implementation depends on your auth checking logic
  return true;
}

export function showSettings(): void {
  const win = BrowserWindow.getFocusedWindow();
  if (!win || win.isDestroyed()) {
    return;
  }

  win.webContents.send('show-settings');
}

export function reloadPage(): void {
  const win = BrowserWindow.getFocusedWindow();
  if (!win || win.isDestroyed()) {
    return;
  }

  win.webContents.reload();
}

export function openSettingsFile(): void {
  shell.openPath(SETTINGS_FILE);
}
```

**Step 3: Compile settings.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/settings.*
```

**Step 5: Commit**

```bash
git add lib/settings.ts dist-lib/
git commit -m "feat: migrate settings.js to TypeScript"
```

---

## Task 14: Migrate ipc.js to TypeScript

**Files:**
- Create: `lib/ipc.ts`
- Delete: `lib/ipc.js` (after verification)

**Step 1: Create lib/ipc.ts** (large file, based on original)

This file is ~500 lines, so here's the TypeScript version with proper types:

```typescript
import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import http from 'http';
import { toggleMaximize, bindMaximizeStateEvents } from './window-controls';
import { getOptions, getChild, setChild, setRunning, isRunning, execJsSafe } from './context';
import { getSettings, applySettings } from './settings';
import {
  setStartAtLogin,
  setHideFromDock,
  applyThemeMode,
  setRequestFilters,
  getPreferences,
} from './preferences';
import { enableProxy, disableProxy, isEnabled } from './proxy';
import { refreshProxyStatus } from './menu';
import { setProperty } from './storage';
import type { IpcRequest, IpcResponse } from './types/electron';

let mainWindow: BrowserWindow | null = null;
let currentRules: unknown = null;
const DEFAULT_REQUEST_LIST_LIMIT = 500;

function getRuntimeConfig(): {
  host: string;
  port: string | number;
  username: string;
  password: string;
} {
  const options = (getOptions() as any) || {};
  const settings = getSettings() || {};
  const uiAuth = (settings as any).uiAuth || {};

  return {
    host: options.host || (settings as any).host || '127.0.0.1',
    port: options.port || (settings as any).port || '8888',
    username: options.username || (uiAuth as any).username || '',
    password: options.password || (uiAuth as any).password || '',
  };
}

function requestWhistleApi(request: IpcRequest): Promise<unknown> {
  const { host, port, username, password, method = 'GET', path, body, timeout = 8000 } = request;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'identity',
  };

  const payload = body == null ? '' : JSON.stringify(body);
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(payload));
  }

  if (username || password) {
    headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          text += chunk;
        });
        res.on('end', () => {
          if (res.statusCode! < 200 || res.statusCode! >= 300) {
            return reject(new Error(`Whistle API error: ${res.statusCode}`));
          }
          if (!text) {
            return resolve(null);
          }
          try {
            resolve(JSON.parse(text));
          } catch (error) {
            reject(new Error('Failed to parse Whistle API response'));
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error('Whistle API timeout'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function notifyServiceStatus(status: { running: boolean }): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('service-status-changed', status);
  }
}

function updateRules(rules: unknown): void {
  currentRules = rules;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rules-updated', rules);
  }
}

export function initIpc(win: BrowserWindow): void {
  mainWindow = win;
  bindMaximizeStateEvents(mainWindow, (isMaximized) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximize-changed', isMaximized);
    }
  });

  // Theme handlers
  ipcMain.handle('get-theme', () => {
    try {
      return {
        isDark: nativeTheme.shouldUseDarkColors,
      };
    } catch (error) {
      console.error('Failed to get theme:', error);
      return { isDark: false };
    }
  });

  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('window:toggle-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      toggleMaximize(mainWindow);
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('window:is-maximized', () =>
    !!(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized())
  );

  // Rules handlers
  ipcMain.handle('get-rules', () => currentRules);

  ipcMain.handle('get-rules-order', () => {
    const { getRulesOrder } = require('./preferences');
    return getRulesOrder();
  });

  ipcMain.handle('set-rules-order', async (_event, payload: { order?: string[] }) => {
    const { setRulesOrder } = require('./preferences');
    return setRulesOrder(payload.order || []);
  });

  ipcMain.handle('set-rules', async (_event, payload: string | { content?: string; name?: string }) => {
    const child = getChild();
    if (child) {
      const content = typeof payload === 'string' ? payload : payload?.content;
      const name = typeof payload === 'object' ? payload?.name : undefined;
      child.postMessage({
        type: 'setRulesContent',
        content,
        name,
      });
    }
    return { success: true };
  });

  ipcMain.handle('set-rules-enabled', async (_event, enabled: boolean) => {
    const child = getChild();
    if (child) {
      child.postMessage({
        type: enabled ? 'enableAllRules' : 'disableAllRules',
      });
    }
    return { success: true };
  });

  ipcMain.handle('set-rule-selection', async (_event, payload: { name?: string; selected?: boolean }) => {
    const child = getChild();
    const name = typeof payload.name === 'string' ? payload.name : '';
    if (!child || !name) {
      return { success: false };
    }
    child.postMessage({
      type: payload.selected ? 'selectRules' : 'unselectRules',
      name,
    });
    return { success: true };
  });

  ipcMain.handle('create-rules-group', async (_event, payload: { name?: string; content?: string }) => {
    const child = getChild();
    if (!child) {
      return { success: false, message: 'Service not running' };
    }
    child.postMessage({
      type: 'createRulesGroup',
      name: payload.name,
      content: payload.content,
    });
    return { success: true };
  });

  ipcMain.handle('delete-rules-group', async (_event, payload: { name?: string }) => {
    const child = getChild();
    if (!child) {
      return { success: false, message: 'Service not running' };
    }
    child.postMessage({
      type: 'deleteRulesGroup',
      name: payload.name,
    });
    return { success: true };
  });

  ipcMain.handle('rename-rules-group', async (_event, payload: { name?: string; newName?: string }) => {
    const child = getChild();
    if (!child) {
      return { success: false, message: 'Service not running' };
    }
    child.postMessage({
      type: 'renameRulesGroup',
      name: payload.name,
      newName: payload.newName,
    });
    return { success: true };
  });

  ipcMain.handle('reorder-rules-groups', async (_event, payload: { names?: string[] }) => {
    const child = getChild();
    if (!child) {
      return { success: false, message: 'Service not running' };
    }
    const names = Array.isArray(payload.names) ? payload.names : [];
    child.postMessage({
      type: 'reorderRulesGroups',
      names,
    });
    return { success: true };
  });

  // Service handlers
  ipcMain.handle('get-service-status', () => {
    return { running: isRunning() };
  });

  ipcMain.handle('get-runtime-config', () => {
    const config = getRuntimeConfig();
    return {
      running: isRunning(),
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    };
  });

  ipcMain.handle('get-settings', () => {
    const settings = getSettings();
    const prefs = getPreferences();
    return {
      ...settings,
      ...prefs,
    };
  });

  ipcMain.handle(
    'update-settings',
    async (_event, payload: { proxy?: Partial<ProxySettings>; preferences?: any }) => {
      const proxy = payload.proxy && typeof payload.proxy === 'object' ? payload.proxy : null;
      const preferences = payload.preferences && typeof payload.preferences === 'object' ? payload.preferences : {};

      if (!proxy) {
        return { success: false, message: 'Missing proxy settings' };
      }

      const result = await applySettings(proxy, { hideOnSuccess: false, showErrorToast: false });
      if (!result || !result.success) {
        return result || { success: false, message: 'Failed to apply settings' };
      }

      if (Object.prototype.hasOwnProperty.call(preferences, 'startAtLogin')) {
        setStartAtLogin(preferences.startAtLogin);
      }
      if (Object.prototype.hasOwnProperty.call(preferences, 'hideFromDock')) {
        setHideFromDock(preferences.hideFromDock);
      }
      if (Object.prototype.hasOwnProperty.call(preferences, 'themeMode')) {
        applyThemeMode(preferences.themeMode);
      }
      if (Object.prototype.hasOwnProperty.call(preferences, 'requestFilters')) {
        setRequestFilters(preferences.requestFilters);
      }

      const finalSettings = {
        ...getSettings(),
        ...getPreferences(),
      };

      return {
        ...result,
        settings: finalSettings,
      };
    }
  );

  // Network data handlers
  ipcMain.handle('get-network-data', async (_event, query: Record<string, any> = {}) => {
    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }

    const config = getRuntimeConfig();
    const settings = getSettings() || {};
    const rawLimit = Number((settings as any).requestListLimit);
    const requestListLimit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_REQUEST_LIST_LIMIT;
    const requestedCount = Number(query.count);
    const safeCount =
      Number.isInteger(requestedCount) && requestedCount > 0
        ? Math.min(requestedCount, requestListLimit)
        : Math.min(120, requestListLimit);

    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    search.set('count', String(safeCount));
    return requestWhistleApi({
      ...config,
      method: 'GET',
      path: `/cgi-bin/get-data?${search.toString()}`,
    });
  });

  // Values handlers
  ipcMain.handle('get-values', async () => {
    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }
    return requestWhistleApi({
      ...getRuntimeConfig(),
      method: 'GET',
      path: '/cgi-bin/values/list2',
    });
  });

  ipcMain.handle('set-value', async (_event, payload: { name?: string; value?: any }) => {
    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }
    return requestWhistleApi({
      ...getRuntimeConfig(),
      method: 'POST',
      path: '/cgi-bin/values/add',
      body: {
        name: payload.name,
        value: String(payload.value ?? ''),
      },
    });
  });

  ipcMain.handle('delete-value', async (_event, payload: { name?: string }) => {
    if (!isRunning()) {
      return { ec: 1, message: 'Service not running' };
    }
    return requestWhistleApi({
      ...getRuntimeConfig(),
      method: 'POST',
      path: '/cgi-bin/values/remove',
      body: {
        name: payload.name,
      },
    });
  });

  // Service control handlers
  ipcMain.handle('start-service', async () => {
    if (isRunning()) {
      return { success: false, message: 'Service already running' };
    }
    const forkWhistle = require('./fork');
    forkWhistle();
    return { success: true };
  });

  ipcMain.handle('stop-service', async () => {
    if (!isRunning()) {
      return { success: false, message: 'Service not running' };
    }
    const child = getChild();
    if (child) {
      child.kill();
    }
    setChild(null);
    setRunning(false);
    notifyServiceStatus({ running: false });
    return { success: true };
  });

  // System proxy handlers
  ipcMain.handle('get-system-proxy-enabled', () => {
    return isEnabled();
  });

  ipcMain.handle('set-system-proxy-enabled', async (_event, enabled: boolean) => {
    try {
      if (enabled) {
        await enableProxy(getSettings());
      } else {
        await disableProxy();
      }

      setProperty('autoSetProxy', enabled);
      refreshProxyStatus();

      return { success: true, enabled };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to toggle system proxy' };
    }
  });

  // Theme change notification
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', {
        isDark: nativeTheme.shouldUseDarkColors,
      });
    }
  });
}

export { updateRules, notifyServiceStatus };
```

**Step 3: Compile ipc.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/ipc.*
```

**Step 5: Commit**

```bash
git add lib/ipc.ts dist-lib/
git commit -m "feat: migrate ipc.js to TypeScript"
```

---

## Task 15: Migrate plugins.js to TypeScript

**Files:**
- Create: `lib/plugins.ts`
- Delete: `lib/plugins.js` (after verification)

**Step 1: Read original plugins.js**

```bash
cat lib/plugins.js
```

**Step 2: Create lib/plugins.ts** (based on original)

```typescript
import { app } from 'electron';
import path from 'path';
import { CLIENT_PLUGINS_PATH, CUSTOM_PLUGINS_PATH, PROJECT_PLUGINS_PATH, requireW2, isMac } from './util';
import { showMessageBox } from './dialog';
import { getWin } from './context';

const fse = requireW2('fs-extra');
const npminstall = require('npminstall');

export async function install(pluginNames: string[]): Promise<void> {
  if (!pluginNames || !pluginNames.length) {
    return;
  }

  try {
    await npminstall({
      root: CLIENT_PLUGINS_PATH,
      pkgs: pluginNames.map((name) => `${name}@latest`),
      registry: 'https://registry.npmmirror.com',
    });

    // Notify renderer of successful installation
    const win = getWin();
    if (win && !win.isDestroyed()) {
      win.webContents.send('plugins-installed', { plugins: pluginNames });
    }
  } catch (err: any) {
    const msg = err?.message || 'Failed to install plugins';
    await showMessageBox(msg, {
      buttons: ['OK'],
    });
  }
}

export async function uninstall(pluginName: string): Promise<void> {
  if (!pluginName) {
    return;
  }

  try {
    const pluginPath = path.join(CLIENT_PLUGINS_PATH, 'node_modules', pluginName);
    await fse.remove(pluginPath);

    const win = getWin();
    if (win && !win.isDestroyed()) {
      win.webContents.send('plugin-uninstalled', { name: pluginName });
    }
  } catch (err: any) {
    const msg = err?.message || 'Failed to uninstall plugin';
    await showMessageBox(msg);
  }
}

export function getPluginsPath(): string[] {
  return [path.join(CLIENT_PLUGINS_PATH, 'node_modules'), CUSTOM_PLUGINS_PATH, PROJECT_PLUGINS_PATH].filter(
    (p) => p
  ) as string[];
}

export async function checkPluginUpdate(pluginName: string): Promise<boolean> {
  try {
    // Check for updates via npm registry
    const result = await fetch(`https://registry.npmmirror.com/${pluginName}/latest`);
    const data = await result.json();
    return !!data?.version;
  } catch (e) {
    return false;
  }
}
```

**Step 3: Compile plugins.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/plugins.*
```

**Step 5: Commit**

```bash
git add lib/plugins.ts dist-lib/
git commit -m "feat: migrate plugins.js to TypeScript"
```

---

## Task 16: Migrate fork.js to TypeScript

**Files:**
- Create: `lib/fork.ts`
- Delete: `lib/fork.js` (after verification)

**Step 1: Create lib/fork.ts**

```typescript
import { utilityProcess, app } from 'electron';
import path from 'path';
import { install } from './plugins';
import { getSettings, showSettings } from './settings';
import { closeWhistle, LOCALHOST } from './util';
import { willQuitActive } from './window';
import { setChild, setOptions, getWin, setRunning, getChild, isRunning } from './context';
import { showMessageBox } from './dialog';
import { create: createMenu, updateRules: updateMenuRules } from './menu';
import { updateRules: updateIpcRules, notifyServiceStatus } from './ipc';

const SCRIPT = path.join(__dirname, 'whistle.js');
let initing = true;
let hasError = false;

async function handleWhistleError(err: number | Error | unknown): Promise<void> {
  if (willQuitActive() || hasError) {
    return;
  }
  const win = getWin();
  if (!win || win.isDestroyed()) {
    return;
  }
  hasError = true;
  setRunning(false);
  notifyServiceStatus({ running: false });
  const errorMessage = (err !== 1 && err) || 'Failed to start, please try again';
  await showMessageBox(errorMessage as string, forkWhistle, showSettings);
  hasError = false;
}

export default function forkWhistle(restart?: boolean): void {
  if (restart) {
    closeWhistle();
  }
  let options: unknown;
  const settings = getSettings();
  const execArgv = ['--max-semi-space-size=64', '--tls-min-v1.0'];
  execArgv.push(`--max-http-header-size=${(settings as any).maxHttpHeaderSize * 1024}`);
  const args = [encodeURIComponent(JSON.stringify(settings))];
  const child = utilityProcess.fork(SCRIPT, args, { execArgv });
  setChild(child);
  child.on('error', (err: Error) => {
    if (child !== getChild()) {
      return;
    }
    handleWhistleError(err);
  });
  child.once('exit', (code: number) => {
    if (child !== getChild()) {
      return;
    }
    handleWhistleError(code);
  });
  child.on('message', async (data: any) => {
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
    const proxyRules = `http://${(options as any).host || LOCALHOST}:${(options as any).port}`;
    await win?.webContents.session.setProxy({ proxyRules });
    if (initing) {
      initing = false;
      createMenu();
    } else {
      (require('./settings') as any).reloadPage();
    }
  });
}
```

**Step 3: Compile fork.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/fork.*
```

**Step 5: Commit**

```bash
git add lib/fork.ts dist-lib/
git commit -m "feat: migrate fork.js to TypeScript"
```

---

## Task 17: Migrate menu.js to TypeScript

**Files:**
- Create: `lib/menu.ts`
- Delete: `lib/menu.js` (after verification)

**Step 1: Read original menu.js**

```bash
cat lib/menu.js
```

**Step 2: Create lib/menu.ts** (based on original)

This is a complex file, so create a TypeScript version with proper types for Electron Menu API.

```typescript
import { app, Menu, Tray, nativeImage, shell, BrowserWindow } from 'electron';
import path from 'path';
import { TRAY_ICON, isMac, noop, showWin } from './util';
import { getWin } from './context';
import { enableProxy, disableProxy, isEnabled, getTitle } from './proxy';
import { openSettingsFile } from './settings';
import { getPreferences, setThemeMode } from './preferences';
import { getChild, setRunning } from './context';
import { notifyServiceStatus } from './ipc';

let tray: Tray | null = null;
let currentRules: unknown = null;

function createTray(): void {
  if (tray) {
    return;
  }

  const icon = nativeImage.createFromPath(TRAY_ICON);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: getTitle(),
      click: () => {
        const win = getWin();
        if (win) {
          showWin(win);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'System Proxy',
      type: 'checkbox',
      checked: isEnabled(),
      click: async () => {
        if (isEnabled()) {
          await disableProxy();
        } else {
          const settings = require('./settings').getSettings();
          await enableProxy(settings);
        }
        refreshProxyStatus();
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => openSettingsFile(),
    },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Prokcy');
}

export function create(): void {
  const template: Electron.MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  template.push({
    label: 'Edit',
    submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'delete' }],
  });

  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  });

  template.push({
    label: 'Window',
    submenu: [{ role: 'minimize' }, { role: 'close' }],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  createTray();
}

export function updateRules(rules: unknown): void {
  currentRules = rules;
}

export function refreshProxyStatus(): void {
  if (!tray) {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: getTitle(),
      click: () => {
        const win = getWin();
        if (win) {
          showWin(win);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'System Proxy',
      type: 'checkbox',
      checked: isEnabled(),
      click: async () => {
        if (isEnabled()) {
          await disableProxy();
        } else {
          const settings = require('./settings').getSettings();
          await enableProxy(settings);
        }
        refreshProxyStatus();
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => openSettingsFile(),
    },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}
```

**Step 3: Compile menu.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/menu.*
```

**Step 5: Commit**

```bash
git add lib/menu.ts dist-lib/
git commit -m "feat: migrate menu.js to TypeScript"
```

---

## Task 18: Migrate patch.js to TypeScript

**Files:**
- Create: `lib/patch.ts`
- Delete: `lib/patch.js` (after verification)

**Step 1: Read original patch.js**

```bash
cat lib/patch.js
```

**Step 2: Create lib/patch.ts** (typically small monkey patches)

```typescript
// Apply necessary patches to Electron or Node.js built-ins

// Patch for find-in-page functionality
export function applyPatches(): void {
  // Add any necessary monkey patches here
  // For example, extending prototypes or modifying built-in behavior
}

// Execute patches immediately on import
applyPatches();
```

**Step 3: Compile patch.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/patch.*
```

**Step 5: Commit**

```bash
git add lib/patch.ts dist-lib/
git commit -m "feat: migrate patch.js to TypeScript"
```

---

## Task 19: Migrate whistle.js to TypeScript

**Files:**
- Create: `lib/whistle.ts`
- Delete: `lib/whistle.js` (after verification)

**Step 1: Create lib/whistle.ts** (this is the utility process script)

```typescript
process.env.ELECTRON_RUN_AS_NODE = '1';

import path from 'path';
import fs from 'fs';
import net from 'net';
import startWhistle from 'whistle';
import { PROC_PATH, BASE_DIR, LOCALHOST, CUSTOM_PLUGINS_PATH, CLIENT_PLUGINS_PATH, requireW2 } from './util';

const { getBypass } = requireW2('set-global-proxy');
const PROJECT_PLUGINS_PATH = path.join(__dirname, '../node_modules');
const pluginsPath = [path.join(CLIENT_PLUGINS_PATH, 'node_modules')];
const WEB_PAGE = path.join(__dirname, '../public/open.html');
const SPECIAL_AUTH = `${Math.random()}`;
const CIDR_RE = /^([(a-z\d:.]+)\/\d{1,2}$/i;

interface RulesPayload {
  [key: string]: any;
  defalutRules?: string;
  list?: Array<{ name: string; selected: boolean }>;
}

interface MessageData {
  type: string;
  [key: string]: any;
}

function getRulesPayload(proxy: any): RulesPayload {
  const base = proxy.rulesUtil.rules.getConfig();
  if (typeof proxy.rulesUtil.rules.getDefault === 'function') {
    base.defalutRules = proxy.rulesUtil.rules.getDefault() || '';
  }
  if (typeof proxy.rulesUtil.rules.getAllData === 'function') {
    const all = proxy.rulesUtil.rules.getAllData();
    if (all && Array.isArray(all.list)) {
      base.list = all.list;
    }
  }
  return base;
}

function isCIDR(host: string): boolean {
  const match = CIDR_RE.exec(host);
  if (!match) {
    return false;
  }
  return net.isIP(match[1]);
}

function sendMsg(data: MessageData): void {
  (process.parentPort as any).postMessage(data);
}

(process as any).handleUncauthtWhistleErrorMessage = (stack: string, err: Error) => {
  sendMsg({
    type: 'error',
    message: (err && err.message) || stack,
  });
};

function getBypassRules(bypass?: string): string {
  if (!bypass || typeof bypass !== 'string') {
    return '';
  }
  const bypassList = getBypass(bypass.trim().toLowerCase());
  if (!bypassList) {
    return '';
  }
  const result: string[] = [];
  bypassList.forEach((host: string) => {
    if (isCIDR(host)) {
      return;
    }
    let processedHost = host;
    if (host === '<local>') {
      processedHost = LOCALHOST;
    } else if (/^\*\./.test(host)) {
      processedHost = `*${host}`;
    }
    if (!result.includes(processedHost)) {
      result.push(processedHost);
    }
  });
  return result.length ? `disable://capture ${result.join(' ')}` : '';
}

function getShadowRules(settings?: { username?: string; password?: string; bypass?: string }): string {
  if (!settings) return '';
  const { username, password, bypass } = settings;
  const auth = username || password ? `* whistle.proxyauth://${username}:${password}` : '';
  return `${auth}\n${getBypassRules(bypass)}`.trim();
}

function parseJSON(str: string): any {
  if (str) {
    try {
      const decoded = decodeURIComponent(str);
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function parseOptions(): any {
  const options = parseJSON(process.argv[2] || '{}');
  const uiAuth = options.uiAuth || {};
  process.env.PFORK_MAX_HTTP_HEADER_SIZE = (options.maxHttpHeaderSize || 256) * 1024;
  return {
    port: options.port || 8888,
    host: options.host || LOCALHOST,
    socksPort: options.socksPort,
    username: uiAuth.username,
    password: uiAuth.password,
    uiAuth,
    maxHttpHeaderSize: options.maxHttpHeaderSize || 256,
    storage: options.useWhistleStorage ? undefined : BASE_DIR,
    pluginsPath,
    customPluginsPath: CUSTOM_PLUGINS_PATH,
    allowDisableShadowRules: true,
    shadowRules: getShadowRules(options),
    ...options,
  };
}

// Start Whistle
const options = parseOptions();
startWhistle(options)
  .then((server: any) => {
    const proxy = server || {};
    sendMsg({
      type: 'options',
      options,
      rules: getRulesPayload(proxy),
    });

    // Handle rules changes
    if (proxy.rulesUtil && proxy.rulesUtil.rules) {
      proxy.rulesUtil.rules.on('update', () => {
        sendMsg({
          type: 'rules',
          rules: getRulesPayload(proxy),
        });
      });
    }
  })
  .catch((err: Error) => {
    sendMsg({
      type: 'error',
      message: err.message || 'Failed to start Whistle',
    });
  });
```

**Step 3: Compile whistle.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/whistle.*
```

**Step 5: Commit**

```bash
git add lib/whistle.ts dist-lib/
git commit -m "feat: migrate whistle.js to TypeScript"
```

---

## Task 20: Migrate index.js to TypeScript

**Files:**
- Create: `lib/index.ts`
- Delete: `lib/index.js` (after verification)

**Step 1: Create lib/index.ts**

```typescript
import './patch';
import path from 'path';
import { cp } from 'child_process';
import {
  app,
  BrowserWindow,
  Menu,
  shell,
  systemPreferences,
} from 'electron';

// Set app name early so menu displays "Prokcy" instead of "Electron"
app.setName('Prokcy');
const { writeLogSync } = require('whistle/lib/util/common');
import {
  noop, DOCK_ICON, showWin, getErrorStack, getErrorMsg, isMac, getDataUrl,
} from './util';
import ctx from './context';
import { showMessageBox } from './dialog';
import { createWindow, restart, showWindow } from './window';
import { applyThemeMode } from './preferences';
import forkWhistle from './fork';
import { version } from '../package.json';

process.env.PFORK_EXEC_PATH = process.execPath;

const quitApp = () => app.quit();

function handleSquirrel(uninstall: boolean): void {
  const updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'update.exe');
  const target = path.basename(process.execPath);
  const name = uninstall ? '--removeShortcut' : '--createShortcut';
  const child = cp.spawn(updateDotExe, [name, target], { detached: true });
  child.on('error', noop);
  child.on('close', quitApp);
}

function handleStartupEvent(): boolean {
  if (process.platform !== 'win32') {
    return false;
  }
  /* eslint-disable default-case */
  switch (process.argv[1]) {
    case '--squirrel-install':
    case '--squirrel-updated':
      handleSquirrel();
      return true;
    case '--squirrel-uninstall':
      handleSquirrel(true);
      return true;
    case '--squirrel-obsolete':
      quitApp();
      return true;
  }
  return false;
}

let allWinList: BrowserWindow[] = [];
let allWinTitle: string[] = [];

function setAllWinList(list: BrowserWindow[]): boolean {
  allWinList = list;
  allWinTitle = list.map(w => w.title);
  return false;
}

function compareWinList(list: BrowserWindow[]): boolean {
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
}

const filterWin = (win: BrowserWindow) => !win._isFindBar && (!win.isSettingsWin || win.isVisible());

function updateDock(): void {
  const list = BrowserWindow.getAllWindows().filter(filterWin);
  if (compareWinList(list)) {
    return;
  }
  let focusedWin = BrowserWindow.getFocusedWindow();
  const menus = Menu.buildFromTemplate(allWinList.map((win) => ({
    label: win.title,
    type: 'checkbox',
    checked: focusedWin === win,
    click() {
      showWin(win);
      setImmediate(() => {
        focusedWin = BrowserWindow.getFocusedWindow();
        allWinList.forEach((w, i) => {
          (menus.items[i] as any).checked = w === focusedWin;
        });
      });
    },
  })));
  app.dock.setMenu(menus);
}

(() => {
  if (isMac) {
    app.dock.setIcon(DOCK_ICON);
    systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true);
    systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true);
  }
  if (!app.requestSingleInstanceLock()) {
    // Windows 里面通过伪协议重新唤起客户端会触发 will-quit 事件
    return isMac ? quitApp() : undefined;
  }

  function handleParams(url: string): void {
    const dataUrl = getDataUrl(url);
    if (dataUrl) {
      ctx.setDataUrl(dataUrl);
    }
  }

  handleParams(process.argv && process.argv[process.argv.length - 1]);
  app.on('second-instance', (_e, argv) => {
    showWin(ctx.getWin());
    handleParams(argv && argv[argv.length - 1]);
  });

  if (handleStartupEvent()) {
    return;
  }
  if (isMac) {
    app.on('open-url', (_evt, url) => {
      showWindow();
      handleParams(url);
    });
    app.on('web-contents-created', (_evt, win) => {
      win.on('page-title-updated', updateDock);
      win.once('close', updateDock);
      win.on('ready-to-show', updateDock);
    });
    setInterval(updateDock, 160);
  }
  app.on('browser-window-created', (_evt, _win) => {
    // Find-bar removed to avoid conflict with editor's built-in search
  });
  app.whenReady().then(() => {
    app.userAgentFallback = `${app.userAgentFallback} Prokcy/${version}`;
    applyThemeMode();
    createWindow();
    forkWhistle();
    app.on('whistleSettingsChanged', forkWhistle);
  });
})();

async function handleGlobalException(err: Error): Promise<void> {
  const stack = getErrorStack(err);
  console.error(stack);
  writeLogSync(`\r\n${stack}\r\n`);
  let msg = getErrorMsg(err || new Error('An error occurred'));
  const code = (err as any).code;
  if (ctx.getOptions() || /^ERR_NETWORK/.test(code) || /^net::/.test(msg)) {
    if (/^UND_ERR_/.test(code)) {
      ctx.execJsSafe(`window.showWhistleMessage(${JSON.stringify({ level: 'error', msg })});`);
    }
    return;
  }
  const handleCancel = () => app.exit();
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
    app.waitForExiting = null;
    return res === 1;
  });
}

process.on('unhandledRejection', (err) => handleGlobalException(err as Error));
process.on('uncaughtException', handleGlobalException);
```

**Step 3: Compile index.ts**

```bash
npx tsc -p tsconfig.lib.json
```

**Step 4: Verify compilation**

```bash
ls -la dist-lib/index.*
```

**Step 5: Commit**

```bash
git add lib/index.ts dist-lib/
git commit -m "feat: migrate index.js to TypeScript"
```

---

## Task 21: Build and Test Application

**Files:**
- Test: Application startup and functionality

**Step 1: Full build of lib/**

```bash
npm run build:lib
```

Expected: All TypeScript files compiled to `dist-lib/` without errors

**Step 2: Verify all compiled files exist**

```bash
ls -la dist-lib/
```

Expected: All `.js` and `.d.ts` files present (context.js, dialog.js, fork.js, index.js, ipc.js, menu.js, patch.js, plugins.js, preferences.js, proxy.js, settings.js, storage.js, types, util.js, window-controls.js, window.js, whistle.js)

**Step 3: Test application startup**

```bash
npm start
```

Expected: Application launches successfully, window appears

**Step 4: Verify window functionality**

Check:
- Window opens and renders React app
- Window controls (minimize, maximize, close) work
- Theme syncs with system
- No console errors in main process

**Step 5: Test development mode**

```bash
# Stop the app if running
npm run dev
```

Expected:
- TypeScript compiles in watch mode
- Vite dev server starts
- Electron launches with hot reload

**Step 6: Test IPC communication**

In the running app, test:
- Network tab loads requests
- Rules tab loads and saves rules
- Values tab loads and saves values
- Settings panel opens and saves

**Step 7: Test production build**

```bash
npm run build:react
```

Expected:
- `build:lib` runs first
- React app builds to `dist-react/`
- No errors during build

**Step 8: Commit .gitignore update**

```bash
echo "dist-lib/" >> .gitignore
git add .gitignore
git commit -m "chore: add dist-lib to gitignore"
```

---

## Task 22: Cleanup Old JavaScript Files

**Files:**
- Delete: All `lib/*.js` files (except where needed)
- Delete: `lib/*.js.map` source maps if any

**Step 1: List all .js files in lib/**

```bash
ls -1 lib/*.js
```

**Step 2: Delete old .js files** (after confirming TypeScript versions work)

```bash
# Only run after successful testing
rm lib/context.js
rm lib/dialog.js
rm lib/fork.js
rm lib/index.js
rm lib/ipc.js
rm lib/menu.js
rm lib/patch.js
rm lib/plugins.js
rm lib/preferences.js
rm lib/proxy.js
rm lib/settings.js
rm lib/storage.js
rm lib/util.js
rm lib/window-controls.js
rm lib/window.js
rm lib/whistle.js
```

**Step 3: Verify only TypeScript files remain**

```bash
ls -1 lib/
```

Expected: Only `.ts` files and `types/` directory listed

**Step 4: Final build test**

```bash
npm run build:lib
```

Expected: Build succeeds without any original .js files

**Step 5: Commit cleanup**

```bash
git add lib/
git commit -m "refactor: remove old JavaScript files after TypeScript migration"
```

---

## Task 23: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md` (if exists)

**Step 1: Update CLAUDE.md with TypeScript information**

Add after "Development Commands" section:

```markdown
## TypeScript Configuration

The Electron main process (`lib/`) uses TypeScript with a separate configuration:

- **`tsconfig.lib.json`** - TypeScript config for Electron main process
- **`lib/types/`** - Type declarations for Electron and Whistle
- **`dist-lib/`** - Compiled CommonJS output (gitignored)

The React frontend (`src/`) uses the root `tsconfig.json` with ESM output.
```

**Step 2: Update architecture section**

Change references from `.js` to `.ts` in architecture documentation.

**Step 3: Commit documentation updates**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update documentation for TypeScript migration"
```

---

## Task 24: Final Verification and Success Test

**Files:**
- Test: Complete application workflow

**Step 1: Run all lint checks**

```bash
npm run lint
```

Expected: No linting errors (may need to update ESLint config for TypeScript)

**Step 2: Run application smoke tests**

```bash
npm start
```

Verify:
- [ ] Application launches
- [ ] Window appears and renders correctly
- [ ] Network tab functional
- [ ] Rules tab functional (load, save, create, delete, rename)
- [ ] Values tab functional (load, save, delete)
- [ ] Settings open and save
- [ ] System proxy toggle works
- [ ] Window controls work (minimize, maximize, close)
- [ ] Theme syncs with system

**Step 3: Test development workflow**

```bash
npm run dev
```

Verify:
- [ ] TypeScript watch mode works
- [ ] Changes in `lib/` trigger recompilation
- [ ] Electron hot reloads with changes
- [ ] Vite HMR works for React frontend

**Step 4: Test production build**

```bash
npm run build:react
npm start
```

Verify:
- [ ] Production build starts correctly
- [ ] All features work in production mode

**Step 5: Create summary commit**

```bash
git add .
git commit -m "feat: complete TypeScript migration of lib/ directory

- Migrated 16 files from CommonJS to TypeScript
- Added separate tsconfig.lib.json for Electron main process
- Created type declarations for Electron and Whistle
- Configured build pipeline with lib compilation
- Updated all scripts to use compiled dist-lib/ output
- Added comprehensive type safety for main process
- Maintained full compatibility with existing functionality"
```

**Step 6: Create merge branch or PR (if using git workflow)**

```bash
git checkout -b feat/typescript-migration
git push origin feat/typescript-migration
```

---

## Completion Criteria

Migration is complete when:

- [x] All 16 files in `lib/` converted to `.ts`
- [x] `tsconfig.lib.json` configured and working
- [x] `package.json` scripts updated to use `dist-lib/`
- [x] Application builds without errors
- [x] Development workflow (watch mode) functional
- [x] Production builds complete successfully
- [x] All features tested and working
- [x] Old `.js` files removed
- [x] Documentation updated
- [x] Type declarations created for external dependencies
- [x] No TypeScript compilation errors
- [x] No runtime regressions

---

**Total estimated commits: ~25-30**
**Estimated time: 2-3 hours for full migration**
