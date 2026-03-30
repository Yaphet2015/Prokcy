export type RulesNavigationTarget = {
  type: 'file-path';
  target: string;
} | {
  type: 'value-ref';
  key: string;
};

const VALUE_REFERENCE_PATTERN = /^[a-z][\w-]*:\/\/\{([^{}]+)\}$/i;

function getTokenAtColumn(line: string, column: number): string | null {
  if (column < 1 || column > line.length) {
    return null;
  }

  const index = column - 1;
  if (/\s/.test(line[index] ?? '')) {
    return null;
  }

  let start = index;
  let end = index;

  while (start > 0 && !/\s/.test(line[start - 1] ?? '')) {
    start -= 1;
  }

  while (end < line.length - 1 && !/\s/.test(line[end + 1] ?? '')) {
    end += 1;
  }

  return line.slice(start, end + 1);
}

export function getRulesNavigationTarget(line: string, column: number): RulesNavigationTarget | null {
  if (line.trimStart().startsWith('#')) {
    return null;
  }

  const token = getTokenAtColumn(line, column);
  if (!token) {
    return null;
  }

  const valueRefMatch = token.match(VALUE_REFERENCE_PATTERN);
  if (valueRefMatch) {
    return {
      type: 'value-ref',
      key: valueRefMatch[1],
    };
  }

  if (token.startsWith('file://')) {
    return {
      type: 'file-path',
      target: token,
    };
  }

  return null;
}
