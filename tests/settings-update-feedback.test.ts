import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCheckUpdateFeedback,
  getUpdateProgressState,
} from '../src/features/settings/update-feedback';

test('does not keep one-shot feedback for checking status', () => {
  const feedback = getCheckUpdateFeedback({
    success: true,
    message: 'Checking for updates...',
    status: 'checking',
  });

  assert.equal(feedback, '');
});

test('returns ready-to-install feedback for downloaded status', () => {
  const feedback = getCheckUpdateFeedback({
    success: true,
    message: 'Update 1.2.3 is downloaded and ready to install.',
    status: 'downloaded',
  });

  assert.match(feedback, /ready to install/i);
});

test('returns indeterminate progress state while installing', () => {
  const progress = getUpdateProgressState({
    phase: 'installing',
    message: 'Installing update 1.2.3...',
    progressPercent: 100,
    checking: false,
    downloading: false,
    canInstall: false,
  });

  assert.equal(progress.showProgress, true);
  assert.equal(progress.indeterminate, true);
  assert.equal(progress.showPercent, false);
  assert.equal(progress.progressPercent, 100);
});
