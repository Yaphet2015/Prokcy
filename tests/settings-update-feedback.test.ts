import test from 'node:test';
import assert from 'node:assert/strict';

import { getCheckUpdateFeedback } from '../src/features/settings/update-feedback';

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
