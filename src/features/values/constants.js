export const JSON5_LANGUAGE_ID = 'json5';

// Initialize JSON5 language in Monaco
export function initJson5Language(monaco) {
  // JSON5 is built into Monaco as 'json'
  // We configure it to allow comments and trailing commas
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    allowComments: true,
    trailingCommas: 'ignore',
    validate: true,
  });
}
