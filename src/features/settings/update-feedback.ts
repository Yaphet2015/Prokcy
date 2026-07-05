import type { UpdateCheckResult, UpdateStatusResult } from '../../types/electron';

interface UpdateProgressState {
  showProgress: boolean;
  progressPercent: number;
  indeterminate: boolean;
  showPercent: boolean;
}

interface ManualUpdateGuidance {
  show: boolean;
  message: string;
  manualDownloadUrl?: string;
  homebrewCommand?: string;
}

export const getCheckUpdateFeedback = (result?: UpdateCheckResult): string => {
  if (!result?.success) {
    return '';
  }

  if (result.status === 'downloaded') {
    return result.message || 'Update downloaded and ready to install.';
  }

  if (result.status === 'manual-download') {
    return result.message || 'Install this update with Homebrew or download the latest DMG.';
  }

  if (result.status === 'up-to-date') {
    return result.message || 'Prokcy is up to date.';
  }

  return '';
};

export const getUpdateProgressState = (
  status?: UpdateStatusResult | null
): UpdateProgressState => {
  if (!status) {
    return {
      showProgress: false,
      progressPercent: 0,
      indeterminate: false,
      showPercent: false,
    };
  }

  if (status.downloading || status.phase === 'downloading') {
    return {
      showProgress: true,
      progressPercent: Math.max(0, Math.min(100, Math.round(status.progressPercent || 0))),
      indeterminate: false,
      showPercent: true,
    };
  }

  if (status.canInstall) {
    return {
      showProgress: true,
      progressPercent: 100,
      indeterminate: false,
      showPercent: true,
    };
  }

  if (status.phase === 'installing') {
    return {
      showProgress: true,
      progressPercent: 100,
      indeterminate: true,
      showPercent: false,
    };
  }

  if (status.checking || status.phase === 'checking') {
    return {
      showProgress: true,
      progressPercent: 10,
      indeterminate: true,
      showPercent: false,
    };
  }

  return {
    showProgress: false,
    progressPercent: 0,
    indeterminate: false,
    showPercent: false,
  };
};

export const getManualUpdateGuidance = (
  status?: UpdateStatusResult | null
): ManualUpdateGuidance => {
  if (!status || status.phase !== 'manual-download') {
    return {
      show: false,
      message: '',
    };
  }

  return {
    show: true,
    message: status.message || 'Install this update with Homebrew or download the latest DMG.',
    manualDownloadUrl: status.manualDownloadUrl,
    homebrewCommand: status.homebrewCommand,
  };
};
