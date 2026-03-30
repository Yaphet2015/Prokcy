type ClipboardDataLike = {
  getData: (type: string) => string;
};

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

function isMonacoEditorTextInputTarget(target: ClosestCapableTarget | null): boolean {
  if (!target) {
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
