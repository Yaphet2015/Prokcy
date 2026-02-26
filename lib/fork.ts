import { utilityProcess, app } from 'electron';
import path from 'path';
import {
  getSettings,
  showSettingsWindow,
  reloadPage,
} from './settings';
import { closeWhistle, LOCALHOST } from './util';
import { willQuitActive } from './window';
import {
  setChild,
  setOptions,
  getWin,
  setRunning,
  getChild,
} from './context';
import { showMessageBox } from './dialog';
import { create, updateRules, type RulesConfig } from './menu';
import { updateRules as updateIpcRules, notifyServiceStatus } from './ipc';

const SCRIPT = path.join(__dirname, 'whistle.js');
let initing = true;
let hasError: boolean;

/**
 * Message types from the Whistle utility process
 */
type MessageType =
  | 'error'
  | 'rules'
  | 'checkUpdate'
  | 'options';

/**
 * Base message structure from utility process
 */
interface BaseMessage {
  type: MessageType;
}

/**
 * Error message from utility process
 */
interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

/**
 * Rules update message from utility process
 */
interface RulesMessage extends BaseMessage {
  type: 'rules';
  rules: RulesConfig;
}

/**
 * Check update message from utility process
 */
interface CheckUpdateMessage extends BaseMessage {
  type: 'checkUpdate';
}

/**
 * Options message from utility process (initialization complete)
 */
interface OptionsMessage extends BaseMessage {
  type: 'options';
  options: WhistleOptions;
  rules: RulesConfig;
}

/**
 * Union type of all possible messages from utility process
 */
type UtilityProcessMessage =
  | ErrorMessage
  | RulesMessage
  | CheckUpdateMessage
  | OptionsMessage;

/**
 * Whistle options received from utility process
 */
interface WhistleOptions {
  host?: string;
  port: number;
  [key: string]: unknown;
}

/**
 * Handle errors from the Whistle utility process
 * Shows error dialog and offers retry option
 *
 * @param err - Error code or message from the failed process
 */
const handleWhistleError = async (err: number | Error | unknown): Promise<void> => {
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
  await showMessageBox(errorMessage, forkWhistle, showSettingsWindow);
  hasError = false;
};

/**
 * Fork the Whistle utility process
 * Starts the Whistle proxy server in a separate utility process
 *
 * @param restart - Whether to restart an existing instance (closes current first)
 */
const forkWhistle = (restart?: boolean): void => {
  if (restart) {
    closeWhistle();
  }
  let options: WhistleOptions | undefined;
  const settings = getSettings();
  const execArgv = ['--max-semi-space-size=64', '--tls-min-v1.0'];
  execArgv.push(`--max-http-header-size=${settings.maxHttpHeaderSize * 1024}`);
  const args = [encodeURIComponent(JSON.stringify(settings))];
  const child = utilityProcess.fork(SCRIPT, args, { execArgv });
  setChild(child);

  child.on('error' as any, (err: Error) => {
    if (child !== getChild()) {
      return;
    }
    handleWhistleError(err);
  });

  child.once('exit' as any, (code: number | null) => {
    if (child !== getChild()) {
      return;
    }
    handleWhistleError(code);
  });

  child.on('message', async (data: UtilityProcessMessage) => {
    const type = data?.type;

    if (type === 'error') {
      return handleWhistleError((data as ErrorMessage).message);
    }

    if (type === 'rules') {
      updateRules((data as RulesMessage).rules);
      updateIpcRules((data as RulesMessage).rules);
      return;
    }

    if (type === 'checkUpdate') {
      return app.emit('checkUpdateClient');
    }

    if (type !== 'options') {
      return;
    }

    // Handle 'options' message - initialization complete
    options = (data as OptionsMessage).options;
    updateRules((data as OptionsMessage).rules);
    updateIpcRules((data as OptionsMessage).rules);
    setRunning(true);
    notifyServiceStatus({ running: true });
    setOptions(options);

    const win = getWin();
    if (!win) {
      return;
    }
    const proxyRules = `http://${options.host || LOCALHOST}:${options.port}`;
    await win.webContents.session.setProxy({ proxyRules });

    if (initing) {
      initing = false;
      create();
    } else {
      reloadPage();
    }
  });
};

export default forkWhistle;
