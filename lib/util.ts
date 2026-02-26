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

const fse = requireW2('fs-extra') as {
  readJson: (
    file: string,
    callback: (err: Error | null, data: Record<string, unknown>) => void
  ) => void;
};

// Constants
const USERNAME: string = config.name;
const PROC_PATH: string = path.join(homedir(), '.whistle_client.pid');
const HTTPS_RE = /^https:\/\//;
const URL_RE = /^https?:\/\/\S/;
const IMPORT_URL_RE = /[?&#]data(?:_url|Url)=([^&#]+)(?:&|#|$)/;
const SUDO_OPTIONS = { name: 'Whistle' };

// Internal helper functions
const noop = (): void => {};

const existsFile = (file: string): Promise<boolean> =>
  new Promise((resolve) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        return fs.stat(file, (_, s) => resolve(s != null && s.isFile()));
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

const killProcess = (pid: number): void => {
  if (pid) {
    try {
      process.kill(pid);
    } catch (e) {
      // Ignore errors when killing process
    }
  }
};

const parseJson = (str: string): unknown | null => {
  try {
    return str && JSON.parse(str);
  } catch (e) {
    return null;
  }
};

// Exported constants
export const isMac: boolean = process.platform === 'darwin';
export const LOCALHOST: string = '127.0.0.1';
export const VERSION: string = config.version;
export const BASE_DIR: string = path.join(getWhistlePath(), '.whistle_client');
export const ICON: string = path.join(__dirname, '../public/dock.png');
export const DOCK_ICON: string = path.join(__dirname, '../public/dock.png');
export const TRAY_ICON: string = isMac
  ? path.join(__dirname, '../public/dock.png')
  : ICON;
export const USERNAME_EXPORT = USERNAME;
export const PROC_PATH_EXPORT = PROC_PATH;

// Exported functions
export const getDataUrl = (url: string): string | null => {
  const result = IMPORT_URL_RE.exec(url);
  if (!result) {
    return null;
  }
  const [, matchedUrl] = result;
  try {
    const decodedUrl = decodeURIComponent(matchedUrl).trim();
    return URL_RE.test(decodedUrl) ? decodedUrl : null;
  } catch (e) {
    return null;
  }
};

export { noop };
export { requireW2 };

export const sudoPromptExec = (
  command: string,
  callback: (error?: Error) => void
): void => {
  sudoPrompt.exec(command, SUDO_OPTIONS, callback);
};

export const compareFile = async (
  file1: string,
  file2: string
): Promise<boolean> => {
  const exists = await existsFile(file1);
  if (!exists) {
    return false;
  }
  const [ctn1, ctn2] = await Promise.all([readFile(file1), readFile(file2)]);
  return ctn1 != null && ctn2 != null ? ctn1.equals(ctn2) : false;
};

export const readJson = (
  file: string
): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    fse.readJson(
      file,
      (
        err: Error | null,
        data: Record<string, unknown> | undefined
      ) => {
        if (err) {
          return fse.readJson(file, (_: Error | null, data2: unknown) => {
            resolve((data2 as Record<string, unknown>) || {});
          });
        }
        resolve(data || {});
      }
    );
  });

export const closeWhistle = (): void => {
  const child = getChild();
  const curPid = child?.pid;
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
      fs
        .readFileSync(PROC_PATH, { encoding: 'utf-8' })
        .split(',', 1)[0]
    );
    if (pid !== curPid) {
      killProcess(pid);
    }
  } catch (e) {
    // Ignore errors reading PID file
  } finally {
    try {
      fs.unlinkSync(PROC_PATH);
    } catch (e) {
      // Ignore errors deleting PID file
    }
  }
};

export const showWin = (win: Electron.BrowserWindow | null): void => {
  if (!win) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
};

export const getErrorMsg = (err: unknown): string => {
  try {
    const error = err as Error;
    return error.message || error.stack || `${error}`;
  } catch (e) {
    return 'Unknown Error';
  }
};

export const getErrorStack = (err: unknown): string => {
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
};

export const getString = (str: unknown, len?: number): string => {
  if (typeof str !== 'string') {
    return '';
  }
  const trimmed = str.trim();
  return len ? trimmed.substring(0, len) : trimmed;
};

export const getJson = (url: string): Promise<unknown> | undefined => {
  const options = getOptions();
  if (!options) {
    return;
  }
  const isHttps = HTTPS_RE.test(url);
  const parsedUrl = parse(url.replace(HTTPS_RE, 'http://'));
  const headers: Record<string, string> = { host: parsedUrl.host || '' };
  if (isHttps) {
    headers['x-whistle-https-request'] = '1';
  }

  const requestOptions: http.RequestOptions & { host: string; port: number | string } = {
    ...parsedUrl,
    headers,
    host: (options as { host?: string }).host || LOCALHOST,
    port: (options as { port?: number | string }).port || 8888,
  };

  return new Promise((resolve, reject) => {
    const handleError = (err?: Error) => {
      clearTimeout(timer);
      reject(err || new Error('Timeout'));
      if (client) {
        client.destroy();
      }
    };

    const timer = setTimeout(handleError, 16000);
    const client = http.get(requestOptions, (res) => {
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
        resolve(parseJson(body ? body.toString() : ''));
      });
    });
    client.on('error', handleError);
  });
};

const isUserInstaller = false;
const isArm = (): boolean => /^arm/i.test(process.arch);

export const getArtifactName = (version: string): string => {
  const name = `${config.name}-${isUserInstaller ? 'user-installer-' : ''}v${version}-`;
  switch (process.platform) {
    case 'win32':
      return `${name}win-x64.exe`;
    case 'darwin':
      return `${name}mac-${isArm() ? 'arm64' : 'x64'}.dmg`;
    default:
      return `${name}linux-${isArm() ? 'arm64' : 'x86_64'}.AppImage`;
  }
};
