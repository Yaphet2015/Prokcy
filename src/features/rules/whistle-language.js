let isWhistleLanguageRegistered = false;

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
        [/\b[a-z]+:\/\//, 'keyword'],

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
      const line = model.getLineContent(position.lineNumber);
      const textBefore = line.substring(0, position.column - 1);

      // Get the current word being typed
      const word = model.getWordUntilPosition(position);
      const currentWord = word.word || '';

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Whistle protocols/operators list
      const protocols = [
        // Request/Response modification
        { label: 'reqHeaders://', documentation: 'Modify request headers' },
        { label: 'resHeaders://', documentation: 'Modify response headers' },
        { label: 'reqType://', documentation: 'Modify request method' },
        { label: 'resType://', documentation: 'Modify response content type' },
        { label: 'reqBody://', documentation: 'Modify request body' },
        { label: 'resBody://', documentation: 'Modify response body' },
        { label: 'reqCookies://', documentation: 'Modify request cookies' },
        { label: 'resCookies://', documentation: 'Modify response cookies' },
        { label: 'replace://', documentation: 'Replace response content' },
        { label: 'reqReplace://', documentation: 'Replace request content' },
        { label: 'resReplace://', documentation: 'Replace response content' },

        // Proxy settings
        { label: 'proxy://', documentation: 'Forward to HTTP proxy' },
        { label: 'httpsProxy://', documentation: 'Forward to HTTPS proxy' },
        { label: 'socks://', documentation: 'Forward to SOCKS proxy' },
        { label: 'tunnel://', documentation: 'Tunnel to destination' },

        // Protocol settings
        { label: 'protocol://', documentation: 'Modify request protocol' },
        { label: 'host://', documentation: 'Modify request host' },
        { label: 'https2://', documentation: 'Use HTTPS2' },

        // Delay
        { label: 'reqDelay://', documentation: 'Delay request (ms)' },
        { label: 'resDelay://', documentation: 'Delay response (ms)' },
        { label: 'delay://', documentation: 'Delay both request and response' },

        // Speed limit
        { label: 'speed://', documentation: 'Limit network speed (KB/s)' },
        { label: 'reqSpeed://', documentation: 'Limit request speed' },
        { label: 'resSpeed://', documentation: 'Limit response speed' },

        // Redirect
        { label: 'redirect://', documentation: '302 redirect' },
        { label: '302://', documentation: '302 redirect' },
        { label: '301://', documentation: '301 redirect' },

        // Rules & Values
        { label: 'rules://', documentation: 'Use another rules file' },
        { label: 'values://', documentation: 'Use value from Values store' },
        { label: 'rulesFile://', documentation: 'Use rules from file' },

        // File operations
        { label: 'file://', documentation: 'Return local file' },
        { label: 'xfile://', documentation: 'Return local file (cross-origin)' },

        // Disable/Enable
        { label: 'disable://', documentation: 'Disable request capture' },
        { label: 'enable://', documentation: 'Enable capture after disable' },
        { label: 'ignore://', documentation: 'Ignore request' },

        // Other protocols
        { label: 'attachment://', documentation: 'Download as attachment' },
        { label: 'cache://', documentation: 'Cache response' },
        { label: 'css://', documentation: 'Inject CSS' },
        { label: 'js://', documentation: 'Inject JavaScript' },
        { label: 'html://', documentation: 'Inject HTML' },
        { label: 'resWrite://', documentation: 'Write response' },
        { label: 'resCombine://', documentation: 'Combine multiple responses' },
        { label: 'resCors://', documentation: 'Enable CORS for response' },
        { label: 'reqCors://', documentation: 'Enable CORS for request' },
        { label: 'filter://', documentation: 'Filter response' },
        { label: 'log://', documentation: 'Output logs' },
        { label: 'statusCode://', documentation: 'Modify response status code' },
        { label: 'auth://', documentation: 'Basic authentication' },
        { label: 'location://', documentation: 'Custom location' },
        { label: 'ua://', documentation: 'Custom User-Agent' },
        { label: 'params://', documentation: 'Modify URL parameters' },
        { label: 'urlParams://', documentation: 'Modify URL parameters' },
        { label: 'cookie://', documentation: 'Set request cookies' },
        { label: 'trailingslash://', documentation: 'Add trailing slash' },
        { label: 'upstream://', documentation: 'Custom upstream' },
        { label: 'clientId://', documentation: 'Set client ID' },
        { label: 'dns://', documentation: 'Custom DNS server' },
        { label: 'wi://', documentation: 'WebSocket interface' },
        { label: 'wu://', documentation: 'WebSocket URL' },
        { label: 'ws://', documentation: 'WebSocket protocol' },
        { label: 'wss://', documentation: 'WebSocket Secure protocol' },
      ];

      // Filter and convert to suggestions
      const suggestions = protocols
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
