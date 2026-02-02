/**
 * Define Tahoe Monaco themes that match the Prokcy color scheme
 */
let isTahoeThemesRegistered = false;

// Dark theme colors
const tahoeDark = {
  background: '#1e1e1e',
  foreground: '#ffffff',
  accent: '#0a84ff',
  border: 'rgba(255,255,255,0.1)',
  hover: 'rgba(255,255,255,0.05)',
  subtle: '#86868b',

  // Syntax colors
  keyword: '#ff6b6b',
  string: '#98c379',
  number: '#d19a66',
  comment: '#5c6370',
  operator: '#56b6c2',
  function: '#61afef',
  variable: '#e06c75',
  type: '#c5a6f4',
};

// Light theme colors
const tahoeLight = {
  background: '#ffffff',
  foreground: '#1d1d1f',
  accent: '#007aff',
  border: 'rgba(0,0,0,0.08)',
  hover: 'rgba(0,0,0,0.03)',
  subtle: '#86868b',

  // Syntax colors
  keyword: '#af3a3a',
  string: '#50a14f',
  number: '#b16100',
  comment: '#a0a1a7',
  operator: '#56b6c2',
  function: '#4078f2',
  variable: '#d73a49',
  type: '#8a2be2',
};

/**
 * Register Tahoe themes with Monaco
 */
export function registerTahoeThemes(monaco) {
  if (!monaco || isTahoeThemesRegistered) {
    return;
  }

  // Register dark theme
  monaco.editor.defineTheme('tahoe-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Comments
      { token: 'comment', foreground: tahoeDark.comment, fontStyle: 'italic' },
      { token: 'comment.doc', foreground: tahoeDark.comment, fontStyle: 'italic' },

      // Keywords
      { token: 'keyword', foreground: tahoeDark.keyword },
      { token: 'keyword.operator', foreground: tahoeDark.operator },

      // Strings
      { token: 'string', foreground: tahoeDark.string },
      { token: 'string.value', foreground: tahoeDark.string },

      // Numbers
      { token: 'number', foreground: tahoeDark.number },
      { token: 'number.hex', foreground: tahoeDark.number },

      // Types
      { token: 'type', foreground: tahoeDark.type },

      // Functions
      { token: 'function', foreground: tahoeDark.function },
      { token: 'function.call', foreground: tahoeDark.function },

      // Variables
      { token: 'variable', foreground: tahoeDark.variable },
      { token: 'variable.predefined', foreground: tahoeDark.variable },

      // Operators
      { token: 'operator', foreground: tahoeDark.operator },

      // Tags
      { token: 'tag', foreground: tahoeDark.variable },
      { token: 'tag.name', foreground: tahoeDark.variable },
      { token: 'tag.attribute.name', foreground: tahoeDark.function },
      { token: 'tag.attribute.value', foreground: tahoeDark.string },

      // RegEx
      { token: 'regexp', foreground: tahoeDark.string },

      // Constants
      { token: 'constant', foreground: tahoeDark.number },

      // Identifiers
      { token: 'identifier', foreground: tahoeDark.foreground },
    ],
    colors: {
      'editor.background': tahoeDark.background,
      'editor.foreground': tahoeDark.foreground,
      'editorLineNumber.foreground': tahoeDark.subtle,
      'editorLineNumber.activeForeground': tahoeDark.accent,
      'editor.selectionBackground': tahoeDark.accent + '40',
      'editor.inactiveSelectionBackground': tahoeDark.accent + '20',
      'editorCursor.foreground': tahoeDark.accent,
      'editor.lineHighlightBackground': tahoeDark.hover,
      'editorIndentGuide.background': tahoeDark.border,
      'editorIndentGuide.activeBackground': tahoeDark.subtle + '40',
      'editorWhitespace.foreground': tahoeDark.border,
      'editorBracketMatch.background': tahoeDark.accent + '20',
      'editorBracketMatch.border': tahoeDark.accent,
      'editorGutter.background': tahoeDark.background,
      'editorWidget.background': tahoeDark.background,
      'editorWidget.border': tahoeDark.border,
      'editorWidget.foreground': tahoeDark.foreground,
      'activityBar.background': tahoeDark.background,
      'activityBar.foreground': tahoeDark.foreground,
      'sideBar.background': tahoeDark.background,
      'sideBar.foreground': tahoeDark.foreground,
      'sideBar.border': tahoeDark.border,
      'statusBar.background': tahoeDark.background,
      'statusBar.foreground': tahoeDark.foreground,
      'statusBar.border': tahoeDark.border,
      'titleBar.activeBackground': tahoeDark.background,
      'titleBar.activeForeground': tahoeDark.foreground,
      'menu.background': tahoeDark.background,
      'menu.foreground': tahoeDark.foreground,
      'menu.border': tahoeDark.border,
      'menu.selectionBackground': tahoeDark.hover,
      'menu.selectionForeground': tahoeDark.foreground,
    },
  });

  // Register light theme
  monaco.editor.defineTheme('tahoe-light', {
    base: 'vs',
    inherit: true,
    rules: [
      // Comments
      { token: 'comment', foreground: tahoeLight.comment, fontStyle: 'italic' },
      { token: 'comment.doc', foreground: tahoeLight.comment, fontStyle: 'italic' },

      // Keywords
      { token: 'keyword', foreground: tahoeLight.keyword },
      { token: 'keyword.operator', foreground: tahoeLight.operator },

      // Strings
      { token: 'string', foreground: tahoeLight.string },
      { token: 'string.value', foreground: tahoeLight.string },

      // Numbers
      { token: 'number', foreground: tahoeLight.number },
      { token: 'number.hex', foreground: tahoeLight.number },

      // Types
      { token: 'type', foreground: tahoeLight.type },

      // Functions
      { token: 'function', foreground: tahoeLight.function },
      { token: 'function.call', foreground: tahoeLight.function },

      // Variables
      { token: 'variable', foreground: tahoeLight.variable },
      { token: 'variable.predefined', foreground: tahoeLight.variable },

      // Operators
      { token: 'operator', foreground: tahoeLight.operator },

      // Tags
      { token: 'tag', foreground: tahoeLight.variable },
      { token: 'tag.name', foreground: tahoeLight.variable },
      { token: 'tag.attribute.name', foreground: tahoeLight.function },
      { token: 'tag.attribute.value', foreground: tahoeLight.string },

      // RegEx
      { token: 'regexp', foreground: tahoeLight.string },

      // Constants
      { token: 'constant', foreground: tahoeLight.number },

      // Identifiers
      { token: 'identifier', foreground: tahoeLight.foreground },
    ],
    colors: {
      'editor.background': tahoeLight.background,
      'editor.foreground': tahoeLight.foreground,
      'editorLineNumber.foreground': tahoeLight.subtle,
      'editorLineNumber.activeForeground': tahoeLight.accent,
      'editor.selectionBackground': tahoeLight.accent + '40',
      'editor.inactiveSelectionBackground': tahoeLight.accent + '20',
      'editorCursor.foreground': tahoeLight.accent,
      'editor.lineHighlightBackground': tahoeLight.hover,
      'editorIndentGuide.background': tahoeLight.border,
      'editorIndentGuide.activeBackground': tahoeLight.subtle + '40',
      'editorWhitespace.foreground': tahoeLight.border,
      'editorBracketMatch.background': tahoeLight.accent + '20',
      'editorBracketMatch.border': tahoeLight.accent,
      'editorGutter.background': tahoeLight.background,
      'editorWidget.background': tahoeLight.background,
      'editorWidget.border': tahoeLight.border,
      'editorWidget.foreground': tahoeLight.foreground,
    },
  });

  isTahoeThemesRegistered = true;
}

/**
 * Get the theme ID based on system preference
 */
export function getThemeId(isDark) {
  return isDark ? 'tahoe-dark' : 'tahoe-light';
}
