import fs from 'fs';
import { EventEmitter } from 'events';
import storage from './storage';

interface UpdateResult {
  success: boolean;
  message: string;
  status?: 'checking' | 'up-to-date' | 'downloading' | 'downloaded' | 'installing' | 'error';
  version?: string;
}

interface UpdateStatus {
  phase: 'idle' | 'checking' | 'up-to-date' | 'downloading' | 'downloaded' | 'installing' | 'error';
  message: string;
  version?: string;
  progressPercent: number;
  downloadedFile?: string;
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
let checking = false;
let updaterInitialized = false;
let autoUpdaterRef: any | null = null;
const statusEmitter = new EventEmitter();

const createSuccess = (
  message: string,
  status: UpdateResult['status'],
  version?: string
): UpdateResult => ({
  success: true,
  message,
  status,
  version,
});

const createFailure = (message: string): UpdateResult => ({
  success: false,
  message,
  status: 'error',
});

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
  status = { ...status, ...patch };
  emitStatus();
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

  autoUpdaterRef.autoDownload = true;
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
    setDownloadedUpdate(info);
  });

  autoUpdaterRef.on('error', (error: Error | unknown) => {
    checking = false;
    const message = (error as Error)?.message || 'Failed to check for updates.';
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
    return createSuccess('Checking for updates...', 'checking');
  } catch (error) {
    checking = false;
    const message = (error as Error)?.message || 'Failed to check for updates.';
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
  const downloaded = ensureDownloadedUpdateValid();
  if (!downloaded) {
    return createFailure('No downloaded update available.');
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
