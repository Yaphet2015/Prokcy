// Must be at the top to ensure this process runs with Node.js environment
process.env.ELECTRON_RUN_AS_NODE = '1';

import path from 'path';
import fs from 'fs';
import net from 'net';
import whistleModule = require('whistle');
import {
  PROC_PATH_EXPORT,
  BASE_DIR,
  LOCALHOST,
  requireW2,
} from './util';

// Get the startWhistle function from the module
const startWhistle: typeof whistleModule & ((options?: any, callback?: any) => any) = whistleModule as any;

// Use PROC_PATH_EXPORT directly
const PROC_PATH = PROC_PATH_EXPORT;

const { getBypass } = requireW2('set-global-proxy') as {
  getBypass: (bypass: string) => string[];
};

const PROJECT_PLUGINS_PATH: string = path.join(__dirname, '../node_modules');
const WEB_PAGE: string = path.join(__dirname, '../public/open.html');
const SPECIAL_AUTH: string = `${Math.random()}`;
const CIDR_RE: RegExp = /^([(a-z\d:.]+)\/\d{1,2}$/i;

// Type definitions for Whistle proxy
interface RulesData {
  [key: string]: unknown;
  defalutRules?: string;
  list?: Array<{ name: string; selected: boolean }>;
}

interface RulesUtil {
  rules: {
    getConfig: () => RulesData;
    getDefault?: () => string;
    getAllData?: () => { list?: Array<{ name: string; selected: boolean }> };
    enableDefault?: () => void;
    disableDefault?: () => void;
    select: (name: string) => void;
    unselect: (name: string) => void;
    disableAllRules: (disable: boolean) => void;
    add: (name: string, content: string, type?: string) => void;
    parseRules: () => void;
    exists: (name: string) => boolean;
    remove: (name: string, type?: string) => void;
    rename: (name: string, newName: string, type?: string) => void;
    moveToTop: (name: string, type?: string) => void;
    enableBackRulesFirst?: (enable: boolean) => void;
  };
  properties: {
    setEnableCapture: (enable: boolean) => void;
  };
}

interface HttpsUtil {
  getRootCAFile: () => string;
}

interface WhistleProxy {
  rulesUtil: RulesUtil;
  httpsUtil: HttpsUtil;
  setShadowRules: (rules: string) => void;
  on: (event: string, callback: () => void) => void;
}

// Message types for IPC communication
type MessageType =
  | 'error'
  | 'options'
  | 'rules'
  | 'checkUpdate';

interface BaseMessage {
  type: MessageType;
}

interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

interface OptionsMessage extends BaseMessage {
  type: 'options';
  options: WhistleOptions;
  rules: RulesData;
}

interface RulesMessage extends BaseMessage {
  type: 'rules';
  rules: RulesData;
}

interface CheckUpdateMessage extends BaseMessage {
  type: 'checkUpdate';
}

type Message =
  | ErrorMessage
  | OptionsMessage
  | RulesMessage
  | CheckUpdateMessage;

// Message data types received from main process
interface ReceivedMessageData {
  type: string;
  name?: string;
  content?: string;
  newName?: string;
  names?: string[];
  settings?: ProxySettings;
}

interface ReceivedMessage {
  data: ReceivedMessageData;
}

// Whistle options
interface WhistleOptions {
  port?: number;
  host?: string;
  socksPort?: number;
  username?: string;
  password?: string;
  bypass?: string;
  reqCacheSize?: number;
  shadowRules?: string;
  useDefaultStorage?: boolean;
  baseDir?: string;
  projectPluginsPath?: string;
  specialAuth?: string;
  mode?: string;
  disableInstaller?: boolean;
  rootCAFile?: string;
}

// Proxy settings from UI
interface UIAuth {
  username?: string;
  password?: string;
}

interface ParsedOptions {
  port?: number;
  host?: string;
  socksPort?: number;
  username?: string;
  password?: string;
  bypass?: string;
  reqCacheSize?: number;
  requestListLimit?: number;
  maxHttpHeaderSize?: number;
  uiAuth?: UIAuth;
  useDefaultStorage?: boolean;
}

interface ProxySettings {
  username?: string;
  password?: string;
  bypass?: string;
}

const getRulesPayload = (proxy: WhistleProxy): RulesData => {
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
};

const isCIDR = (host: string): boolean => {
  const match = CIDR_RE.exec(host);
  if (!match) {
    return false;
  }
  return net.isIP(match[1]) !== 0;
};

const sendMsg = (data: Message): void => {
  if (process.parentPort) {
    process.parentPort.postMessage(data);
  }
};

// Extend process type for error handler
declare global {
  namespace NodeJS {
    interface Process {
      handleUncauthtWhistleErrorMessage?: (stack: string, err: Error) => void;
    }
  }
}

process.handleUncauthtWhistleErrorMessage = (stack: string, err: Error): void => {
  sendMsg({
    type: 'error',
    message: (err && err.message) || stack,
  });
};

const getBypassRules = (bypass: string | undefined): string => {
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
    if (host === '<local>') {
      host = LOCALHOST;
    } else if (/^\*\./.test(host)) {
      host = `*${host}`;
    }
    if (!result.includes(host)) {
      result.push(host);
    }
  });
  return result.length ? `disable://capture ${result.join(' ')}` : '';
};

const getShadowRules = (settings: ProxySettings | undefined): string => {
  const { username, password, bypass } = settings || {};
  const auth = username || password ? `* whistle.proxyauth://${username}:${password}` : '';
  return `${auth}\n${getBypassRules(bypass)}`.trim();
};

const parseJSON = (str: string): Record<string, unknown> => {
  if (str) {
    try {
      const decoded = decodeURIComponent(str);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  return {};
};

const parseOptions = (): WhistleOptions => {
  const options = parseJSON(process.argv[2] || '{}') as ParsedOptions;
  const uiAuth = options.uiAuth || {};
  process.env.PFORK_MAX_HTTP_HEADER_SIZE = String((options.maxHttpHeaderSize || 0) * 1024);

  return {
    port: options.port,
    host: options.host,
    socksPort: options.socksPort,
    username: uiAuth.username,
    password: uiAuth.password,
    bypass: options.bypass,
    reqCacheSize: options.requestListLimit,
    shadowRules: getShadowRules(options),
    useDefaultStorage: options.useDefaultStorage,
  };
};

const newOptions = parseOptions();
const baseDir = newOptions.useDefaultStorage ? '' : BASE_DIR;

const baseOptions: WhistleOptions = {
  baseDir,
  projectPluginsPath: PROJECT_PLUGINS_PATH,
  specialAuth: SPECIAL_AUTH,
  mode: 'client|disableUpdateTips|disableAuthUI|enableMultipleRules',
  ...newOptions,
  disableInstaller: true,
};

const proxy = startWhistle({
  ...baseOptions,
  handleUpdate(_: unknown, res: { json: (data: { ec: number }) => void }): void {
    sendMsg({ type: 'checkUpdate' });
    res.json({ ec: 0 });
  },
  handleWebReq(_: unknown, res: { sendFile: (path: string) => void }): void {
    res.sendFile(WEB_PAGE);
  },
}, () => {
  // Keep priority intuitive: top rules first, lower rules as fallback.
  if (typeof proxy.rulesUtil.rules.enableBackRulesFirst === 'function') {
    proxy.rulesUtil.rules.enableBackRulesFirst(false);
  }

  sendMsg({
    type: 'options',
    options: {
      ...baseOptions,
      rootCAFile: proxy.httpsUtil.getRootCAFile(),
    },
    rules: getRulesPayload(proxy),
  });

  const host = baseOptions.host || LOCALHOST;
  const { port } = baseOptions;
  try {
    fs.writeFileSync(PROC_PATH, `${process.pid},${host},${port},${SPECIAL_AUTH}`);
  } catch (e) {
    // Ignore errors writing PID file
  }

  let timer: NodeJS.Timeout | undefined;
  let changeTimer: NodeJS.Timeout | undefined;

  const updateRules = (): void => {
    if (changeTimer) {
      return;
    }
    if (timer) {
      clearTimeout(timer);
    }
    sendMsg({
      type: 'rules',
      rules: getRulesPayload(proxy),
    });
    timer = setTimeout(updateRules, 3000);
  };

  timer = setTimeout(updateRules, 3000);

  const updateImmediately = (): void => {
    if (!changeTimer) {
      changeTimer = setTimeout(() => {
        changeTimer = undefined;
        updateRules();
      }, 30);
    }
  };

  proxy.on('rulesDataChange', updateImmediately);
});

// Message handler from main process
process.parentPort?.on('message', (data: unknown) => {
  const msg = data as ReceivedMessage;
  const msgData = msg && msg.data;
  if (!msgData) {
    return;
  }

  const { type } = msgData;
  const ruleName = typeof msgData.name === 'string' ? msgData.name.trim() : '';
  const isDefaultRuleGroup = ruleName.toLowerCase() === 'default';

  if (type === 'selectRules') {
    if (isDefaultRuleGroup) {
      if (typeof proxy.rulesUtil.rules.enableDefault === 'function') {
        proxy.rulesUtil.rules.enableDefault();
      }
      return;
    }
    proxy.rulesUtil.rules.select(ruleName);
    return;
  }

  if (type === 'unselectRules') {
    if (isDefaultRuleGroup) {
      if (typeof proxy.rulesUtil.rules.disableDefault === 'function') {
        proxy.rulesUtil.rules.disableDefault();
      }
      return;
    }
    proxy.rulesUtil.rules.unselect(ruleName);
    return;
  }

  if (type === 'disableAllRules') {
    return proxy.rulesUtil.rules.disableAllRules(true);
  }

  if (type === 'enableAllRules') {
    return proxy.rulesUtil.rules.disableAllRules(false);
  }

  if (type === 'setRulesContent') {
    const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
    if (!name) {
      return { success: false, message: 'Invalid group name' };
    }
    proxy.rulesUtil.rules.add(name, msgData.content || '');
    // Explicitly trigger rules reload after add()
    proxy.rulesUtil.rules.parseRules();
    return { success: true };
  }

  if (type === 'enableCapture') {
    return proxy.rulesUtil.properties.setEnableCapture(true);
  }

  if (type === 'setShadowRules') {
    return proxy.setShadowRules(getShadowRules(msgData.settings));
  }

  // Create new rules group
  if (type === 'createRulesGroup') {
    const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
    if (!name) {
      return { success: false, message: 'Invalid group name' };
    }
    // Check if group already exists
    if (proxy.rulesUtil.rules.exists(name)) {
      return { success: false, message: 'Group already exists' };
    }
    const content = typeof msgData.content === 'string' ? msgData.content : '';
    proxy.rulesUtil.rules.add(name, content, 'client');
    proxy.rulesUtil.rules.parseRules();
    return { success: true };
  }

  // Delete a rules group
  if (type === 'deleteRulesGroup') {
    const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
    if (!name) {
      return { success: false, message: 'Invalid group name' };
    }
    if (!proxy.rulesUtil.rules.exists(name)) {
      return { success: false, message: 'Group does not exist' };
    }
    proxy.rulesUtil.rules.remove(name, 'client');
    proxy.rulesUtil.rules.parseRules();
    return { success: true };
  }

  // Rename a rules group
  if (type === 'renameRulesGroup') {
    const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
    const newName = typeof msgData.newName === 'string' ? msgData.newName.trim() : '';
    if (!name || !newName) {
      return { success: false, message: 'Invalid names' };
    }
    if (!proxy.rulesUtil.rules.exists(name)) {
      return { success: false, message: 'Group does not exist' };
    }
    if (proxy.rulesUtil.rules.exists(newName)) {
      return { success: false, message: 'A group with this name already exists' };
    }
    proxy.rulesUtil.rules.rename(name, newName, 'client');
    proxy.rulesUtil.rules.parseRules();
    return { success: true };
  }

  // Reorder rules groups - persist list order
  if (type === 'reorderRulesGroups') {
    const names = Array.isArray(msgData.names)
      ? msgData.names.filter((name) => typeof name === 'string' && name)
      : [];
    if (!names.length) {
      return { success: false, message: 'Invalid group order' };
    }

    // Default is managed separately by Whistle and is always at the top in getAllData().
    // Reorder only custom groups by moving them to top from tail to head.
    const targetNames = names.filter((name) => name !== 'Default' && proxy.rulesUtil.rules.exists(name));
    for (let i = targetNames.length - 1; i >= 0; i -= 1) {
      proxy.rulesUtil.rules.moveToTop(targetNames[i], 'client');
    }
    proxy.rulesUtil.rules.parseRules();
    return { success: true };
  }

  if (type === 'exitWhistle') {
    return process.exit();
  }
});
