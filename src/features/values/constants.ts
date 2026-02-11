import type * as Monaco from 'monaco-editor';

export const JSON5_LANGUAGE_ID = 'json';

/**
 * Initialize JSON5 language in Monaco.
 * JSON5 is built into Monaco as 'json' - we configure it to allow
 * comments and trailing commas which are standard JSON5 extensions.
 */
export function initJson5Language(monaco: typeof Monaco): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (monaco.languages.json as any).jsonDefaults.setDiagnosticsOptions({
    allowComments: true,
    trailingCommas: 'ignore',
    validate: true,
  });
}
