import test from 'node:test';
import assert from 'node:assert/strict';

type PasteModule = {
  CUSTOM_MONACO_PASTE_COMMAND_CONTEXT?: string;
  isFindWidgetTarget?: (eventTarget: unknown) => boolean;
  shouldUseCustomMonacoPaste?: (input: {
    hasTextFocus: boolean;
    isReadOnly: boolean;
    eventTarget: unknown;
  }) => boolean;
  getCustomPasteText?: (input: {
    clipboardData?: { getData: (type: string) => string } | null;
    readFallbackText?: (() => string) | null;
  }) => string;
  readMonacoClipboardText?: (input: {
    readElectronClipboardText?: (() => Promise<string>) | null;
    navigatorClipboard?: { readText: () => Promise<string> } | null;
    readFallbackText?: (() => string) | null;
  }) => Promise<string>;
  pasteMonacoClipboardText?: (input: {
    readClipboardText: () => Promise<string>;
    editorTrigger: (
      source: string,
      handler: string,
      payload: {
        text: string;
        pasteOnNewLine: boolean;
        multicursorText: null;
      },
    ) => void;
  }) => Promise<boolean>;
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
  closestMatches = [],
}: {
  tagName: string;
  classNames?: string[];
  contentEditable?: boolean;
  closestMatches?: string[];
}) {
  return {
    tagName,
    isContentEditable: contentEditable,
    classList: {
      contains: (className: string) => classNames.includes(className),
    },
    closest: (selector: string) => {
      if (closestMatches.includes(selector)) {
        return {};
      }

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

test('should not use custom Monaco paste for Monaco find widget textareas', async () => {
  const { shouldUseCustomMonacoPaste } = await loadPasteModule();
  assert.equal(typeof shouldUseCustomMonacoPaste, 'function');

  const target = createTarget({
    tagName: 'TEXTAREA',
    classNames: ['inputarea'],
    closestMatches: ['.monaco-findInput'],
  });

  assert.equal(
    shouldUseCustomMonacoPaste?.({
      hasTextFocus: true,
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

test('readMonacoClipboardText prefers preload Electron clipboard API', async () => {
  const { readMonacoClipboardText } = await loadPasteModule();
  assert.equal(typeof readMonacoClipboardText, 'function');

  const text = await readMonacoClipboardText?.({
    readElectronClipboardText: async () => 'from-electron',
    navigatorClipboard: {
      readText: async () => 'from-navigator',
    },
    readFallbackText: () => 'from-fallback',
  });

  assert.equal(text, 'from-electron');
});

test('custom Monaco paste command excludes find and replace widget focus', async () => {
  const { CUSTOM_MONACO_PASTE_COMMAND_CONTEXT } = await loadPasteModule();

  assert.equal(
    CUSTOM_MONACO_PASTE_COMMAND_CONTEXT,
    'editorTextFocus && !findInputFocussed && !replaceInputFocussed',
  );
});

test('pasteMonacoClipboardText triggers Monaco paste with clipboard text', async () => {
  const { pasteMonacoClipboardText } = await loadPasteModule();
  assert.equal(typeof pasteMonacoClipboardText, 'function');

  const calls: Array<{
    source: string;
    handler: string;
    payload: { text: string; pasteOnNewLine: boolean; multicursorText: null };
  }> = [];

  const inserted = await pasteMonacoClipboardText?.({
    readClipboardText: async () => 'pasted-content',
    editorTrigger: (source, handler, payload) => {
      calls.push({ source, handler, payload });
    },
  });

  assert.equal(inserted, true);
  assert.deepEqual(calls, [{
    source: 'keyboard',
    handler: 'paste',
    payload: {
      text: 'pasted-content',
      pasteOnNewLine: false,
      multicursorText: null,
    },
  }]);
});

test('isFindWidgetTarget returns true for elements inside .monaco-findInput', async () => {
  const { isFindWidgetTarget } = await loadPasteModule();
  assert.equal(typeof isFindWidgetTarget, 'function');

  const target = createTarget({
    tagName: 'INPUT',
    closestMatches: ['.monaco-findInput'],
  });

  assert.equal(isFindWidgetTarget?.(target), true);
});

test('isFindWidgetTarget returns false for regular editor textarea', async () => {
  const { isFindWidgetTarget } = await loadPasteModule();
  assert.equal(typeof isFindWidgetTarget, 'function');

  const target = createTarget({
    tagName: 'TEXTAREA',
    classNames: ['inputarea'],
  });

  assert.equal(isFindWidgetTarget?.(target), false);
});
