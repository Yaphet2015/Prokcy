import type { UpdateCheckResult } from '../../types/electron';

export const getCheckUpdateFeedback = (result?: UpdateCheckResult): string => {
  if (!result?.success) {
    return '';
  }

  if (result.status === 'downloaded') {
    return result.message || 'Update downloaded and ready to install.';
  }

  if (result.status === 'up-to-date') {
    return result.message || 'Prokcy is up to date.';
  }

  return '';
};
