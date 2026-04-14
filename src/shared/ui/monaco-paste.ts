type ClipboardDataLike = {
  getData: (type: string) => string;
};

export const CUSTOM_MONACO_PASTE_COMMAND_CONTEXT = 'editorTextFocus && !findInputFocussed && !replaceInputFocussed';

type ClosestCapableTarget = {
  tagName?: string;
  isContentEditable?: boolean;
  classList?: {
    contains: (className: string) => boolean;
  };
  closest?: (selector: string) => unknown;
};

function asClosestCapableTarget(target: unknown): ClosestCapableTarget | null {
  if (!target || typeof target !== 'object') {
    return null;
  }

  return target as ClosestCapableTarget;
}

function hasTagName(target: ClosestCapableTarget | null, tagName: string): boolean {
  return target?.tagName?.toUpperCase() === tagName;
}

function isNativeTextInputTarget(target: ClosestCapableTarget | null): boolean {
  return hasTagName(target, 'INPUT')
    || hasTagName(target, 'TEXTAREA')
    || target?.isContentEditable === true;
}

function isMonacoOverlayInputTarget(target: ClosestCapableTarget | null): boolean {
  return Boolean(target?.closest?.('.monaco-findInput'));
}

export function isFindWidgetTarget(eventTarget: unknown): boolean {
  return isMonacoOverlayInputTarget(asClosestCapableTarget(eventTarget));
}

function isMonacoEditorTextInputTarget(target: ClosestCapableTarget | null): boolean {
  if (!target || isMonacoOverlayInputTarget(target)) {
    return false;
  }

  if (hasTagName(target, 'TEXTAREA') && target.classList?.contains('inputarea')) {
    return true;
  }

  return Boolean(target.closest?.('textarea.inputarea'));
}

export function shouldUseCustomMonacoPaste(input: {
  hasTextFocus: boolean;
  isReadOnly: boolean;
  eventTarget: unknown;
}): boolean {
  const { hasTextFocus, isReadOnly, eventTarget } = input;

  if (isReadOnly || !hasTextFocus) {
    return false;
  }

  const target = asClosestCapableTarget(eventTarget);
  if (!target) {
    return true;
  }

  if (isMonacoEditorTextInputTarget(target)) {
    return true;
  }

  if (isNativeTextInputTarget(target)) {
    return false;
  }

  return true;
}

export function getCustomPasteText(input: {
  clipboardData?: ClipboardDataLike | null;
  readFallbackText?: (() => string) | null;
}): string {
  const { clipboardData, readFallbackText } = input;
  const eventText = clipboardData?.getData('text/plain') || clipboardData?.getData('text') || '';
  if (eventText) {
    return eventText;
  }

  return readFallbackText?.() ?? '';
}

export function tryInsertTextIntoInput(
  eventTarget: EventTarget | null,
  text: string,
): boolean {
  if (text && eventTarget instanceof HTMLInputElement) {
    document.execCommand('insertText', false, text);
    return true;
  }
  return false;
}

export async function readMonacoClipboardText(input: {
  readElectronClipboardText?: (() => Promise<string>) | null;
  navigatorClipboard?: { readText: () => Promise<string> } | null;
  readFallbackText?: (() => string) | null;
}): Promise<string> {
  const {
    readElectronClipboardText,
    navigatorClipboard,
    readFallbackText,
  } = input;

  const electronText = await readElectronClipboardText?.();
  if (electronText) {
    return electronText;
  }

  const navigatorText = await navigatorClipboard?.readText?.();
  if (navigatorText) {
    return navigatorText;
  }

  return readFallbackText?.() ?? '';
}

export async function pasteMonacoClipboardText(input: {
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
}): Promise<boolean> {
  const { readClipboardText, editorTrigger } = input;
  const text = await readClipboardText();

  if (!text) {
    return false;
  }

  editorTrigger('keyboard', 'paste', {
    text,
    pasteOnNewLine: false,
    multicursorText: null,
  });

  return true;
}
