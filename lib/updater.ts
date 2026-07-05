import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import storage from './storage';

type UpdatePhase = 'idle' | 'checking' | 'up-to-date' | 'downloading' | 'downloaded' | 'manual-download' | 'installing' | 'error';
type UpdateResultStatus = Exclude<UpdatePhase, 'idle'>;

interface UpdateResult {
  success: boolean;
  message: string;
  status?: UpdateResultStatus;
  version?: string;
  manualDownloadUrl?: string;
  homebrewCommand?: string;
}

interface UpdateStatus {
  phase: UpdatePhase;
  message: string;
  version?: string;
  progressPercent: number;
  downloadedFile?: string;
  manualDownloadUrl?: string;
  homebrewCommand?: string;
  checking: boolean;
  downloading: boolean;
  canInstall: boolean;
}

interface UpdateCheckOptions {
  silent?: boolean;
  source?: 'manual' | 'startup' | 'settings';
}

interface PersistedDownloadedUpdate {
  version: string;
  downloadedFile: string;
  downloadedAt: number;
}

const DOWNLOADED_UPDATE_KEY = 'downloadedUpdateInfo';
const MISSING_MAC_ZIP_MESSAGE = 'This macOS release is missing the auto-update ZIP artifact. Please download the latest DMG from GitHub Releases or install the next patch release.';
const GITHUB_RELEASES_URL = 'https://github.com/Yaphet2015/Prokcy/releases';
const HOMEBREW_UPDATE_COMMAND = 'brew upgrade --cask prokcy';
const INSTALL_HANDOFF_TIMEOUT_MS = Number(process.env.PROKCY_UPDATE_INSTALL_TIMEOUT_MS || 15000);
let checking = false;
let updaterInitialized = false;
let autoUpdaterRef: any | null = null;
let macInAppInstallSupported: boolean | null = null;
let installWatchdogTimer: NodeJS.Timeout | null = null;
let installWatchdogCleanup: (() => void) | null = null;
const statusEmitter = new EventEmitter();

const createSuccess = (
  message: string,
  status: UpdateResultStatus,
  version?: string,
  extra: Pick<UpdateResult, 'manualDownloadUrl' | 'homebrewCommand'> = {}
): UpdateResult => ({
  success: true,
  message,
  status,
  version,
  ...extra,
});

const createFailure = (message: string): UpdateResult => ({
  success: false,
  message,
  status: 'error',
});

const getUpdaterErrorMessage = (
  error: Error | unknown,
  fallback = 'Failed to check for updates.'
): string => {
  const code = (error as { code?: string } | null | undefined)?.code;
  const message = (error as Error | null | undefined)?.message || fallback;

  if (code === 'ERR_UPDATER_ZIP_FILE_NOT_FOUND' || /ZIP file not provided/i.test(message)) {
    return MISSING_MAC_ZIP_MESSAGE;
  }

  return message;
};

const getInstallHandoffTimeoutMs = (): number => (
  Number.isFinite(INSTALL_HANDOFF_TIMEOUT_MS) && INSTALL_HANDOFF_TIMEOUT_MS > 0
    ? INSTALL_HANDOFF_TIMEOUT_MS
    : 15000
);

const writeUpdateDiagnosticLog = (
  event: string,
  details: Record<string, unknown> = {}
): void => {
  try {
    // Resolve lazily so unit tests can stub the app data path.
    // eslint-disable-next-line global-require
    const { BASE_DIR } = require('./util') as { BASE_DIR: string };
    const logDir = path.join(BASE_DIR, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, 'updater.log'),
      `${JSON.stringify({
        at: new Date().toISOString(),
        event,
        ...details,
      })}\n`
    );
  } catch {
    // Diagnostic logging must never break update flow.
  }
};

const clearInstallWatchdog = (): void => {
  if (installWatchdogTimer) {
    clearTimeout(installWatchdogTimer);
    installWatchdogTimer = null;
  }
  const cleanup = installWatchdogCleanup;
  installWatchdogCleanup = null;
  cleanup?.();
};

let status: UpdateStatus = {
  phase: 'idle',
  message: '',
  progressPercent: 0,
  checking: false,
  downloading: false,
  canInstall: false,
};

const emitStatus = (): void => {
  statusEmitter.emit('change', { ...status });
};

const updateStatus = (patch: Partial<UpdateStatus>): void => {
  const previousPhase = status.phase;
  if (patch.phase && patch.phase !== 'installing') {
    clearInstallWatchdog();
  }
  status = { ...status, ...patch };
  if (status.phase !== previousPhase) {
    writeUpdateDiagnosticLog('status-change', {
      previousPhase,
      phase: status.phase,
      version: status.version,
      message: status.message,
    });
  }
  emitStatus();
};

const getMacDownloadArch = (): 'arm64' | 'x64' => (
  process.arch === 'x64' ? 'x64' : 'arm64'
);

const getManualDownloadUrl = (version?: string): string => {
  if (!version) {
    return `${GITHUB_RELEASES_URL}/latest`;
  }
  const arch = getMacDownloadArch();
  return `${GITHUB_RELEASES_URL}/download/v${version}/Prokcy-v${version}-mac-${arch}.dmg`;
};

const getManualUpdateMessage = (version?: string): string => (
  version
    ? `Update ${version} is available. On unsigned macOS builds, install it with Homebrew or download the DMG.`
    : 'A Prokcy update is available. On unsigned macOS builds, install it with Homebrew or download the DMG.'
);

const setManualDownloadUpdate = (version?: string): void => {
  clearDownloadedUpdate();
  updateStatus({
    phase: 'manual-download',
    message: getManualUpdateMessage(version),
    version,
    progressPercent: 0,
    downloadedFile: undefined,
    manualDownloadUrl: getManualDownloadUrl(version),
    homebrewCommand: HOMEBREW_UPDATE_COMMAND,
    checking: false,
    downloading: false,
    canInstall: false,
  });
  writeUpdateDiagnosticLog('manual-download-fallback', {
    version,
    homebrewCommand: HOMEBREW_UPDATE_COMMAND,
    manualDownloadUrl: getManualDownloadUrl(version),
  });
};

const createResultFromStatus = (fallbackMessage = 'Checking for updates...'): UpdateResult => {
  if (status.phase === 'error') {
    return createFailure(status.message || 'Failed to check for updates.');
  }
  if (status.phase === 'idle') {
    return createSuccess(fallbackMessage, 'checking', status.version);
  }
  return createSuccess(
    status.message || fallbackMessage,
    status.phase,
    status.version,
    {
      manualDownloadUrl: status.manualDownloadUrl,
      homebrewCommand: status.homebrewCommand,
    },
  );
};

const isDeveloperIdSignedMacBuild = (): boolean => {
  try {
    // eslint-disable-next-line global-require
    const { spawnSync } = require('node:child_process') as typeof import('node:child_process');
    const result = spawnSync('codesign', ['-dv', '--verbose=4', process.execPath], {
      encoding: 'utf8',
    });
    const details = `${result.stdout || ''}\n${result.stderr || ''}`;
    return /Authority=Developer ID Application:/i.test(details);
  } catch {
    return false;
  }
};

const canInstallUpdatesInApp = (): boolean => {
  if (process.platform !== 'darwin') {
    return true;
  }
  if (macInAppInstallSupported == null) {
    macInAppInstallSupported = isDeveloperIdSignedMacBuild();
    writeUpdateDiagnosticLog('mac-in-app-install-capability', {
      supported: macInAppInstallSupported,
    });
  }
  return macInAppInstallSupported;
};

const startInstallWatchdog = (downloaded: PersistedDownloadedUpdate): void => {
  clearInstallWatchdog();

  try {
    // eslint-disable-next-line global-require
    const { app } = require('electron') as typeof import('electron');
    const onBeforeQuit = (): void => {
      clearInstallWatchdog();
    };
    if (typeof app.once === 'function') {
      app.once('before-quit', onBeforeQuit);
      installWatchdogCleanup = () => {
        if (typeof app.off === 'function') {
          app.off('before-quit', onBeforeQuit);
        } else if (typeof app.removeListener === 'function') {
          app.removeListener('before-quit', onBeforeQuit);
        }
      };
    }
  } catch {
    // Watchdog timeout still provides recovery even without app events.
  }

  installWatchdogTimer = setTimeout(() => {
    installWatchdogTimer = null;
    const cleanup = installWatchdogCleanup;
    installWatchdogCleanup = null;
    cleanup?.();
    if (status.phase !== 'installing' || status.version !== downloaded.version) {
      return;
    }
    const message = 'Update installation did not start. Try Install again or download the latest release manually.';
    writeUpdateDiagnosticLog('install-handoff-timeout', {
      version: downloaded.version,
      downloadedFile: downloaded.downloadedFile,
      timeoutMs: getInstallHandoffTimeoutMs(),
    });
    updateStatus({
      phase: 'error',
      message,
      version: downloaded.version,
      progressPercent: 100,
      downloadedFile: downloaded.downloadedFile,
      checking: false,
      downloading: false,
      canInstall: true,
    });
  }, getInstallHandoffTimeoutMs());
  installWatchdogTimer.unref?.();
};

const saveDownloadedUpdate = (downloaded: PersistedDownloadedUpdate | null): void => {
  storage.setProperty(DOWNLOADED_UPDATE_KEY, downloaded);
};

const readDownloadedUpdate = (): PersistedDownloadedUpdate | null => {
  const raw = storage.getProperty(DOWNLOADED_UPDATE_KEY) as PersistedDownloadedUpdate | null | undefined;
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const version = typeof raw.version === 'string' ? raw.version : '';
  const downloadedFile = typeof raw.downloadedFile === 'string' ? raw.downloadedFile : '';
  const downloadedAt = typeof raw.downloadedAt === 'number' ? raw.downloadedAt : 0;

  if (!version || !downloadedFile || !downloadedAt) {
    return null;
  }
  if (!fs.existsSync(downloadedFile)) {
    return null;
  }

  return {
    version,
    downloadedFile,
    downloadedAt,
  };
};

const clearDownloadedUpdate = (): void => {
  saveDownloadedUpdate(null);
};

const ensureDownloadedUpdateValid = (): PersistedDownloadedUpdate | null => {
  const downloaded = readDownloadedUpdate();
  if (!downloaded) {
    if (status.canInstall || status.phase === 'downloaded' || status.phase === 'installing') {
      updateStatus({
        canInstall: false,
        downloadedFile: undefined,
        progressPercent: status.downloading ? status.progressPercent : 0,
        phase: status.downloading ? 'downloading' : 'idle',
      });
    }
    clearDownloadedUpdate();
    return null;
  }
  return downloaded;
};

const restoreDownloadedState = (): void => {
  const downloaded = ensureDownloadedUpdateValid();
  if (!downloaded) {
    return;
  }

  try {
    // eslint-disable-next-line global-require
    const { app } = require('electron') as typeof import('electron');
    const currentVersion = typeof app.getVersion === 'function' ? app.getVersion() : '';
    if (currentVersion && currentVersion === downloaded.version) {
      clearDownloadedUpdate();
      return;
    }
  } catch {
    // ignore version check error
  }

  if (!canInstallUpdatesInApp()) {
    setManualDownloadUpdate(downloaded.version);
    return;
  }

  updateStatus({
    phase: 'downloaded',
    message: `Update ${downloaded.version} downloaded. Ready to install.`,
    version: downloaded.version,
    progressPercent: 100,
    downloadedFile: downloaded.downloadedFile,
    checking: false,
    downloading: false,
    canInstall: true,
  });
};

const setDownloadedUpdate = (info: { version?: string; downloadedFile?: string }): void => {
  const version = typeof info.version === 'string' ? info.version : '';
  const downloadedFile = typeof info.downloadedFile === 'string' ? info.downloadedFile : '';

  if (!version || !downloadedFile || !fs.existsSync(downloadedFile)) {
    updateStatus({
      phase: 'error',
      message: 'Update downloaded, but installer file was not found.',
      checking: false,
      downloading: false,
      canInstall: false,
      downloadedFile: undefined,
      progressPercent: 0,
    });
    clearDownloadedUpdate();
    return;
  }

  const persisted: PersistedDownloadedUpdate = {
    version,
    downloadedFile,
    downloadedAt: Date.now(),
  };

  saveDownloadedUpdate(persisted);
  updateStatus({
    phase: 'downloaded',
    message: `Update ${version} downloaded. Ready to install.`,
    version,
    progressPercent: 100,
    downloadedFile,
    checking: false,
    downloading: false,
    canInstall: true,
  });
};

const ensureAutoUpdater = (): any | null => {
  // Resolve dependencies lazily so tests can stub per invocation.
  // eslint-disable-next-line global-require
  const { app } = require('electron') as typeof import('electron');
  if (!app.isPackaged) {
    return null;
  }

  // eslint-disable-next-line global-require
  const { autoUpdater } = require('electron-updater') as { autoUpdater: any };
  autoUpdaterRef = autoUpdaterRef || autoUpdater;

  if (updaterInitialized) {
    return autoUpdaterRef;
  }

  autoUpdaterRef.autoDownload = canInstallUpdatesInApp();
  autoUpdaterRef.autoInstallOnAppQuit = false;

  autoUpdaterRef.on('checking-for-update', () => {
    checking = true;
    updateStatus({
      phase: 'checking',
      message: 'Checking for updates...',
      checking: true,
      downloading: false,
      progressPercent: 0,
    });
  });

  autoUpdaterRef.on('update-not-available', () => {
    checking = false;
    updateStatus({
      phase: 'up-to-date',
      message: 'Prokcy is up to date.',
      checking: false,
      downloading: false,
      progressPercent: 0,
    });
  });

  autoUpdaterRef.on('update-available', (info: { version?: string } = {}) => {
    const version = typeof info.version === 'string' ? info.version : status.version;
    checking = false;
    clearDownloadedUpdate();
    if (!canInstallUpdatesInApp()) {
      setManualDownloadUpdate(version);
      return;
    }
    updateStatus({
      phase: 'downloading',
      message: version
        ? `Update ${version} found. Downloading...`
        : 'New update found. Downloading...',
      version,
      checking: false,
      downloading: true,
      canInstall: false,
      downloadedFile: undefined,
      progressPercent: 0,
    });
  });

  autoUpdaterRef.on('download-progress', (progress: { percent?: number } = {}) => {
    const rawPercent = typeof progress.percent === 'number' ? progress.percent : 0;
    const progressPercent = Math.max(0, Math.min(100, Math.round(rawPercent)));
    updateStatus({
      phase: 'downloading',
      checking: false,
      downloading: true,
      progressPercent,
      canInstall: false,
    });
  });

  autoUpdaterRef.on('update-downloaded', (info: { version?: string; downloadedFile?: string } = {}) => {
    checking = false;
    if (!canInstallUpdatesInApp()) {
      setManualDownloadUpdate(info.version || status.version);
      return;
    }
    setDownloadedUpdate(info);
  });

  autoUpdaterRef.on('error', (error: Error | unknown) => {
    checking = false;
    const message = getUpdaterErrorMessage(error);
    updateStatus({
      phase: 'error',
      message,
      checking: false,
      downloading: false,
    });
  });

  updaterInitialized = true;
  return autoUpdaterRef;
};

export const checkForUpdates = async (options: UpdateCheckOptions = {}): Promise<UpdateResult> => {
  const source = options.source || 'manual';
  const isAutomaticCheck = source !== 'manual';

  if (status.phase === 'installing') {
    return createSuccess(status.message || 'Installing update...', 'installing', status.version);
  }

  if (status.phase === 'manual-download') {
    return createResultFromStatus();
  }

  if (status.phase === 'downloading') {
    return createSuccess(status.message || 'Downloading update...', 'downloading', status.version);
  }

  if (checking) {
    if (isAutomaticCheck) {
      return createSuccess(status.message || 'Checking for updates...', 'checking', status.version);
    }
    return createFailure('Update check is already checking in progress.');
  }

  const existing = ensureDownloadedUpdateValid();
  if (existing) {
    if (!canInstallUpdatesInApp()) {
      setManualDownloadUpdate(existing.version);
      return createResultFromStatus();
    }
    return createSuccess(
      `Update ${existing.version} is downloaded and ready to install.`,
      'downloaded',
      existing.version,
    );
  }

  const updater = ensureAutoUpdater();
  if (!updater) {
    return createFailure('Auto update is only available in packaged builds.');
  }

  checking = true;
  updateStatus({
    phase: 'checking',
    message: 'Checking for updates...',
    checking: true,
    downloading: false,
    progressPercent: 0,
  });

  try {
    await updater.checkForUpdates();
    return createResultFromStatus();
  } catch (error) {
    checking = false;
    const message = getUpdaterErrorMessage(error);
    updateStatus({
      phase: 'error',
      message,
      checking: false,
      downloading: false,
    });
    return createFailure(message);
  }
};

export const getUpdateStatus = (): UpdateStatus => {
  const downloaded = ensureDownloadedUpdateValid();
  if (downloaded && status.phase === 'idle') {
    if (!canInstallUpdatesInApp()) {
      setManualDownloadUpdate(downloaded.version);
      return { ...status };
    }
    updateStatus({
      phase: 'downloaded',
      message: `Update ${downloaded.version} downloaded. Ready to install.`,
      version: downloaded.version,
      progressPercent: 100,
      downloadedFile: downloaded.downloadedFile,
      checking: false,
      downloading: false,
      canInstall: true,
    });
  }
  return { ...status };
};

export const installDownloadedUpdate = async (): Promise<UpdateResult> => {
  if (status.phase === 'manual-download') {
    return createResultFromStatus();
  }

  const downloaded = ensureDownloadedUpdateValid();
  if (!downloaded) {
    return createFailure('No downloaded update available.');
  }

  if (!canInstallUpdatesInApp()) {
    setManualDownloadUpdate(downloaded.version);
    return createResultFromStatus();
  }

  const updater = ensureAutoUpdater();
  if (!updater) {
    return createFailure('Auto update is only available in packaged builds.');
  }

  try {
    updateStatus({
      phase: 'installing',
      message: `Installing update ${downloaded.version}...`,
      version: downloaded.version,
      progressPercent: 100,
      downloadedFile: downloaded.downloadedFile,
      checking: false,
      downloading: false,
      canInstall: false,
    });
    startInstallWatchdog(downloaded);
    updater.quitAndInstall();
    return createSuccess(
      `Installing update ${downloaded.version}...`,
      'installing',
      downloaded.version,
    );
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to start update installation.';
    updateStatus({
      phase: 'downloaded',
      message: `Update ${downloaded.version} downloaded. Ready to install.`,
      version: downloaded.version,
      progressPercent: 100,
      downloadedFile: downloaded.downloadedFile,
      checking: false,
      downloading: false,
      canInstall: true,
    });
    return createFailure(message);
  }
};

export const onUpdateStatusChanged = (listener: (next: UpdateStatus) => void): (() => void) => {
  const wrapped = (next: UpdateStatus): void => {
    listener(next);
  };
  statusEmitter.on('change', wrapped);
  listener(getUpdateStatus());
  return () => {
    statusEmitter.off('change', wrapped);
  };
};

restoreDownloadedState();

export type { UpdateCheckOptions, UpdateResult, UpdateStatus };
