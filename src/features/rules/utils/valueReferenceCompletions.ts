import { normalizeValuesResponse } from '../../values/utils/normalizeValuesResponse';

export interface ValueReferenceCompletionContext {
  query: string;
  startColumn: number;
  endColumn: number;
}

interface MonacoCompletionProvider {
  provideCompletionItems: (
    model: { getLineContent: (lineNumber: number) => string },
    position: { lineNumber: number; column: number }
  ) => { suggestions: unknown[] };
}

interface MonacoLike {
  languages: {
    CompletionItemKind: {
      File?: number;
      Text?: number;
    };
    registerCompletionItemProvider: (
      languageId: string,
      provider: {
        triggerCharacters?: string[];
      } & MonacoCompletionProvider
    ) => { dispose: () => void };
  };
}

function clampCursorIndex(line: string, column: number): number {
  return Math.min(Math.max(column - 1, 0), line.length);
}

function getTokenContext(line: string, column: number): {
  token: string;
  tokenStartIndex: number;
  cursorInToken: number;
} | null {
  const cursorIndex = clampCursorIndex(line, column);
  const charAtCursor = line[cursorIndex] ?? '';
  const charBeforeCursor = line[cursorIndex - 1] ?? '';

  if (
    cursorIndex < line.length
    && /\s/.test(charAtCursor)
    && (cursorIndex === 0 || /\s/.test(charBeforeCursor))
  ) {
    return null;
  }

  let start = cursorIndex;
  while (start > 0 && !/\s/.test(line[start - 1] ?? '')) {
    start -= 1;
  }

  let end = cursorIndex;
  while (end < line.length && !/\s/.test(line[end] ?? '')) {
    end += 1;
  }

  const token = line.slice(start, end);
  if (!token) {
    return null;
  }

  return {
    token,
    tokenStartIndex: start,
    cursorInToken: cursorIndex - start,
  };
}

export function getValueReferenceCompletionContext(
  line: string,
  column: number,
): ValueReferenceCompletionContext | null {
  if (line.trimStart().startsWith('#')) {
    return null;
  }

  const tokenContext = getTokenContext(line, column);
  if (!tokenContext) {
    return null;
  }

  const { token, tokenStartIndex, cursorInToken } = tokenContext;
  const prefix = token.slice(0, cursorInToken);
  const match = prefix.match(/^[a-z][\w-]*:\/\/\{([^{}\s]*)$/i);
  if (!match) {
    return null;
  }

  const closeBraceIndex = token.indexOf('}', prefix.length);
  if (closeBraceIndex !== -1 && cursorInToken > closeBraceIndex) {
    return null;
  }

  const query = match[1] ?? '';
  return {
    query,
    startColumn: tokenStartIndex + prefix.length - query.length + 1,
    endColumn: tokenStartIndex + cursorInToken + 1,
  };
}

export function normalizeValueKeysForCompletion(payload: unknown): string[] {
  return Object.keys(normalizeValuesResponse(payload))
    .filter((key) => key !== '')
    .sort((a, b) => a.localeCompare(b));
}

export function registerValueReferenceCompletionProvider(
  monaco: MonacoLike,
  getValueKeys: () => string[],
): { dispose: () => void } {
  return monaco.languages.registerCompletionItemProvider('whistle', {
    triggerCharacters: ['{'],
    provideCompletionItems: (model, position) => {
      const context = getValueReferenceCompletionContext(
        model.getLineContent(position.lineNumber),
        position.column,
      );
      if (!context) {
        return { suggestions: [] };
      }

      const normalizedQuery = context.query.toLowerCase();
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: context.startColumn,
        endColumn: context.endColumn,
      };
      const kind = monaco.languages.CompletionItemKind.File
        ?? monaco.languages.CompletionItemKind.Text
        ?? 0;

      const suggestions = getValueKeys()
        .filter((key) => !normalizedQuery || key.toLowerCase().startsWith(normalizedQuery))
        .map((key, index) => ({
          label: key,
          kind,
          insertText: key,
          range,
          detail: 'Values key',
          documentation: 'Insert Values key reference',
          sortText: `${index}${key}`,
        }));

      return { suggestions };
    },
  });
}
