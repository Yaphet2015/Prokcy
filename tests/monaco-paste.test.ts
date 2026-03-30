import test from 'node:test';
import assert from 'node:assert/strict';

type PasteModule = {
  shouldUseCustomMonacoPaste?: (input: {
    hasTextFocus: boolean;
    isReadOnly: boolean;
    eventTarget: unknown;
  }) => boolean;
  getCustomPasteText?: (input: {
    clipboardData?: { getData: (type: string) => string } | null;
    readFallbackText?: (() => string) | null;
  }) => string;
};

let pasteModulePromise: Promise<PasteModule> | null = null;

async function loadPasteModule(): Promise<PasteModule> {
  if (!pasteModulePromise) {
    pasteModulePromise = import('../src/shared/ui/monaco-paste.ts')
      .then((module) => module as PasteModule)
      .catch(() => ({}));
  }

  return pasteModulePromise;
}

function createTarget({
  tagName,
  classNames = [],
  contentEditable = false,
}: {
  tagName: string;
  classNames?: string[];
  contentEditable?: boolean;
}) {
  return {
    tagName,
    isContentEditable: contentEditable,
    classList: {
      contains: (className: string) => classNames.includes(className),
    },
    closest: (selector: string) => {
      if (selector === 'textarea.inputarea' && tagName === 'TEXTAREA' && classNames.includes('inputarea')) {
        return {};
      }
      return null;
    },
  };
}

test('should use custom Monaco paste when the editor text surface has focus', async () => {
  const { shouldUseCustomMonacoPaste } = await loadPasteModule();
  assert.equal(typeof shouldUseCustomMonacoPaste, 'function');

  const target = createTarget({
    tagName: 'TEXTAREA',
    classNames: ['inputarea'],
  });

  assert.equal(
    shouldUseCustomMonacoPaste?.({
      hasTextFocus: true,
      isReadOnly: false,
      eventTarget: target,
    }),
    true,
  );
});

test('should not use custom Monaco paste for find widget inputs', async () => {
  const { shouldUseCustomMonacoPaste } = await loadPasteModule();
  assert.equal(typeof shouldUseCustomMonacoPaste, 'function');

  const target = createTarget({
    tagName: 'INPUT',
  });

  assert.equal(
    shouldUseCustomMonacoPaste?.({
      hasTextFocus: false,
      isReadOnly: false,
      eventTarget: target,
    }),
    false,
  );
});

test('should not use custom Monaco paste for read-only editors', async () => {
  const { shouldUseCustomMonacoPaste } = await loadPasteModule();
  assert.equal(typeof shouldUseCustomMonacoPaste, 'function');

  const target = createTarget({
    tagName: 'TEXTAREA',
    classNames: ['inputarea'],
  });

  assert.equal(
    shouldUseCustomMonacoPaste?.({
      hasTextFocus: true,
      isReadOnly: true,
      eventTarget: target,
    }),
    false,
  );
});

test('getCustomPasteText prefers event clipboard text over fallback clipboard', async () => {
  const { getCustomPasteText } = await loadPasteModule();
  assert.equal(typeof getCustomPasteText, 'function');

  const text = getCustomPasteText?.({
    clipboardData: {
      getData: (type: string) => (type === 'text/plain' ? 'from-event' : ''),
    },
    readFallbackText: () => 'from-fallback',
  });

  assert.equal(text, 'from-event');
});

test('getCustomPasteText falls back to Electron clipboard text when needed', async () => {
  const { getCustomPasteText } = await loadPasteModule();
  assert.equal(typeof getCustomPasteText, 'function');

  const text = getCustomPasteText?.({
    clipboardData: null,
    readFallbackText: () => 'from-fallback',
  });

  assert.equal(text, 'from-fallback');
});
