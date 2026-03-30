import test from 'node:test';
import assert from 'node:assert/strict';

type FeedbackModule = {
  getFileNavigationFeedbackMessage?: (result: {
    success?: boolean;
    code?: string;
    message?: string;
  }) => string | null;
};

let feedbackModulePromise: Promise<FeedbackModule> | null = null;

async function loadFeedbackModule(): Promise<FeedbackModule> {
  if (!feedbackModulePromise) {
    feedbackModulePromise = import('../src/features/rules/utils/fileNavigationFeedback.ts')
      .then((module) => module as FeedbackModule)
      .catch(() => ({}));
  }

  return feedbackModulePromise;
}

test('returns unsupported target message for non-local whistle file targets', async () => {
  const { getFileNavigationFeedbackMessage } = await loadFeedbackModule();
  assert.equal(typeof getFileNavigationFeedbackMessage, 'function');

  assert.equal(
    getFileNavigationFeedbackMessage?.({
      success: false,
      code: 'unsupported_target',
    }),
    'This Whistle file target is not a local file path.',
  );
});

test('returns file not found message for missing local files', async () => {
  const { getFileNavigationFeedbackMessage } = await loadFeedbackModule();
  assert.equal(typeof getFileNavigationFeedbackMessage, 'function');

  assert.equal(
    getFileNavigationFeedbackMessage?.({
      success: false,
      code: 'file_not_found',
      message: '/tmp/missing.js',
    }),
    'Local file not found: /tmp/missing.js',
  );
});

test('returns null for successful opens', async () => {
  const { getFileNavigationFeedbackMessage } = await loadFeedbackModule();
  assert.equal(typeof getFileNavigationFeedbackMessage, 'function');

  assert.equal(
    getFileNavigationFeedbackMessage?.({
      success: true,
      code: 'success',
    }) ?? null,
    null,
  );
});
