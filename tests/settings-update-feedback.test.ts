import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatCurrentVersion,
  getCheckUpdateFeedback,
  getManualUpdateGuidance,
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

test('manual download status does not show progress', () => {
  const progress = getUpdateProgressState({
    phase: 'manual-download',
    message: 'Update 1.2.3 is available. Install with Homebrew or download the DMG.',
    version: '1.2.3',
    progressPercent: 0,
    checking: false,
    downloading: false,
    canInstall: false,
    manualDownloadUrl: 'https://github.com/Yaphet2015/Prokcy/releases/download/v1.2.3/Prokcy-v1.2.3-mac-arm64.dmg',
    homebrewCommand: 'brew upgrade --cask prokcy',
  });

  assert.equal(progress.showProgress, false);
  assert.equal(progress.indeterminate, false);
  assert.equal(progress.showPercent, false);
});

test('manual update guidance exposes Homebrew command and download URL', () => {
  const guidance = getManualUpdateGuidance({
    phase: 'manual-download',
    message: 'Update 1.2.3 is available. Install with Homebrew or download the DMG.',
    version: '1.2.3',
    progressPercent: 0,
    checking: false,
    downloading: false,
    canInstall: false,
    manualDownloadUrl: 'https://github.com/Yaphet2015/Prokcy/releases/download/v1.2.3/Prokcy-v1.2.3-mac-arm64.dmg',
    homebrewCommand: 'brew upgrade --cask prokcy',
  });

  assert.equal(guidance.show, true);
  assert.equal(guidance.homebrewCommand, 'brew upgrade --cask prokcy');
  assert.match(guidance.manualDownloadUrl, /Prokcy-v1\.2\.3-mac-arm64\.dmg$/);
});

test('current version label uses the app version with a v prefix', () => {
  assert.equal(formatCurrentVersion('1.8.16'), 'v1.8.16');
  assert.equal(formatCurrentVersion('v1.8.16'), 'v1.8.16');
  assert.equal(formatCurrentVersion(''), '');
});
