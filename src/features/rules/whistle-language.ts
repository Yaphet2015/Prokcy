let isWhistleLanguageRegistered = false;

const WHISTLE_PROTOCOLS = [
  '301',
  '302',
  'attachment',
  'auth',
  'cache',
  'cssAppend',
  'cssBody',
  'cssPrepend',
  'delete',
  'disable',
  'enable',
  'excludeFilter',
  'file',
  'forwardedFor',
  'frameScript',
  'headerReplace',
  'host',
  'htmlAppend',
  'htmlBody',
  'htmlPrepend',
  'http',
  'http-proxy',
  'https',
  'https-proxy',
  'ignore',
  'includeFilter',
  'jsAppend',
  'jsBody',
  'jsPrepend',
  'lineProps',
  'locationHref',
  'log',
  'method',
  'pac',
  'pathReplace',
  'pipe',
  'proxy',
  'rawfile',
  'redirect',
  'referer',
  'replaceStatus',
  'reqAppend',
  'reqBody',
  'reqCharset',
  'reqCookies',
  'reqCors',
  'reqDelay',
  'reqHeaders',
  'reqMerge',
  'reqPrepend',
  'reqReplace',
  'reqRules',
  'reqScript',
  'reqSpeed',
  'reqType',
  'reqWrite',
  'reqWriteRaw',
  'resAppend',
  'resBody',
  'resCharset',
  'resCookies',
  'resCors',
  'resDelay',
  'resHeaders',
  'resMerge',
  'resPrepend',
  'resReplace',
  'resRules',
  'resScript',
  'resSpeed',
  'resType',
  'resWrite',
  'resWriteRaw',
  'responseFor',
  'skip',
  'sniCallback',
  'socks',
  'statusCode',
  'style',
  'tlsOptions',
  'tpl',
  'trailers',
  'tunnel',
  'ua',
  'urlParams',
  'weinre',
  'ws',
  'wss',
  'xfile',
  'xhost',
  'xhttp-proxy',
  'xhttps-proxy',
  'xproxy',
  'xrawfile',
  'xsocks',
  'xtpl',
];

const EXTRA_PROTOCOLS = [
  'clientId',
  'dns',
  'params',
  'protocol',
  'rules',
  'rulesFile',
  'upstream',
  'values',
  'wi',
  'wu',
];

const PROTOCOL_DOCS: Record<string, string> = {
  'http-proxy': 'Forward to HTTP proxy',
  'xhttp-proxy': 'Forward to HTTP proxy without DNS resolve',
  'https-proxy': 'Forward to HTTPS proxy',
  'xhttps-proxy': 'Forward to HTTPS proxy without DNS resolve',
  reqHeaders: 'Modify request headers',
  resHeaders: 'Modify response headers',
  reqBody: 'Modify request body',
  resBody: 'Modify response body',
  reqType: 'Modify request type',
  resType: 'Modify response type',
  reqDelay: 'Delay request',
  resDelay: 'Delay response',
  reqSpeed: 'Throttle request speed',
  resSpeed: 'Throttle response speed',
  urlParams: 'Modify URL query params',
  pathReplace: 'Replace URL path',
  lineProps: 'Set line-level rule properties',
};

const PROTOCOL_SUGGESTIONS = [...new Set([...WHISTLE_PROTOCOLS, ...EXTRA_PROTOCOLS])]
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({
    label: `${name}://`,
    documentation: PROTOCOL_DOCS[name] || 'Whistle protocol',
  }));

/**
 * Whistle rule syntax: pattern operator value
 *
 * Examples:
 *   www.example.com reqHeaders://custom
 *   example.com/file.txt file:///Users/test.txt
 *   *.google.com protocol://https
 *   # This is a comment
 *
 * Operators: //, ://, =>, @, and more
 * Patterns can be: host, path, regex, keyword, etc.
 */

/**
 * Register Whistle language with Monaco Editor
 */
export function registerWhistleLanguage(monaco) {
  if (!monaco || isWhistleLanguageRegistered) {
    return;
  }

  // Register the language
  monaco.languages.register({
    id: 'whistle',
    extensions: ['.whistle', '.rules'],
    aliases: ['Whistle', 'whistle'],
    mimetypes: ['text/plain'],
  });

  // Register tokens provider for syntax highlighting
  monaco.languages.setMonarchTokensProvider('whistle', {
    tokenizer: {
      root: [
        // Comments (line starts with #)
        [/#.*$/, 'comment'],

        // Whistle operators (://, //, =>, @, etc.)
        [/\/\/|:\/\/|=>|@|:/, 'operator'],

        // Protocol patterns (protocol://)
        [/\b[a-z][\w-]*:\/\//i, 'keyword'],

        // File paths (file:///, rules://, etc.)
        [/(file|rules|values|rulesFile|wi|wu|ws|wss|tunnel|https2|http|https|socks|ss|tls):\/\//, 'type'],

        // Host patterns (domain names, IPs, wildcards)
        [
          /([a-z0-9][-a-z0-9\.]*[a-z0-9]|[a-z0-9])(\s*)(=>|:\/\/|\/\/|@)/,
          ['string', 'operator', 'operator'],
        ],

        // Wildcard patterns
        [/\*\.[a-z0-9][-a-z0-9\.]*/, 'string'],

        // Path patterns
        [/\/[^\s]*/, 'string.path'],

        // Numbers
        [/\d+/, 'number'],

        // Keywords
        [/\b(disable|enable|filter|exclude|include|replace|method|statusCode|headers|reqHeaders|resHeaders|reqBody|resBody|reqType|resType|speed|upstream|clientId|auth|host|dns|rewrite|rulesFile|log|ui|proxy|httpsProxy|socks|pac|plugin|trailingslash|ignore|redirect|attachment|cache|css|js|html|jsonp|resCombine|resWrite|resCors|reqCors|reqScript|resScript|rulesScript|urlParams|cookie|params|headersReplace|reqCookiesReplace|resCookiesReplace|bodyReplace|reqBodyReplace|resBodyReplace)\b/, 'keyword'],

        // Properties
        [/:[a-z]+/i, 'variable.predefined'],

        // Whitespace
        [/\s+/, 'white'],
      ],
    },
  });

  // Register configuration for auto-indentation, brackets, etc.
  monaco.languages.setLanguageConfiguration('whistle', {
    comments: {
      lineComment: '#',
    },
    brackets: [
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: /^\s*#?\s*region\b/,
        end: /^\s*#?\s*endregion\b/,
      },
    },
  });

  // Register completion provider for autocomplete
  monaco.languages.registerCompletionItemProvider('whistle', {
    triggerCharacters: [' ', ':', '/'],
    provideCompletionItems: (model, position) => {
      // Get the current word being typed
      const word = model.getWordUntilPosition(position);
      const currentWord = word.word || '';

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Filter and convert to suggestions
      const suggestions = PROTOCOL_SUGGESTIONS
        .filter(p => {
          // If user typed something, filter protocols that start with it
          if (currentWord) {
            return p.label.toLowerCase().startsWith(currentWord.toLowerCase());
          }
          return true;
        })
        .map(p => ({
          label: p.label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: p.label,
          range,
          documentation: p.documentation,
          detail: p.documentation,
          // Sort prefix matches first
          sortText: p.label.startsWith(currentWord) ? '0' : '1',
        }));

      return { suggestions };
    },
  });

  // Register hover provider for documentation
  monaco.languages.registerHoverProvider('whistle', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return;

      const hoverText = getHoverText(word.word);
      if (hoverText) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [{ value: hoverText }],
        };
      }
    },
  });

  isWhistleLanguageRegistered = true;
}

/**
 * Get hover documentation for a word
 */
function getHoverText(word) {
  const docs = {
    'reqHeaders': 'Modify request headers before forwarding\n\nExample: `www.example.com reqHeaders://custom`',
    'resHeaders': 'Modify response headers\n\nExample: `www.example.com resHeaders://custom`',
    'replace': 'Replace response content\n\nExample: `www.example.com replace://custom`',
    'file://': 'Return local file content\n\nExample: `example.com/file.txt file:///Users/test.txt`',
    'rules://': 'Forward to another rules URL\n\nExample: `www.example.com rules://customRules`',
    'values://': 'Use value from Values store\n\nExample: `www.example.com/api values://apiKey`',
    'protocol://': 'Modify request protocol\n\nExample: `www.google.com protocol://https`',
    'host://': 'Modify request host\n\nExample: `www.example.com host://test.com`',
    'disable': 'Disable matched request\n\nExample: `www.example.com disable://`',
    'enable': 'Enable capture after disable\n\nExample: `www.example.com enable://`',
  };

  return docs[word] || null;
}

/**
 * Initialize Whistle language with Monaco
 */
export function initWhistleLanguage(monaco) {
  registerWhistleLanguage(monaco);
}
