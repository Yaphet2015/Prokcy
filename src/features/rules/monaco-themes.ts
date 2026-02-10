/**
 * Define Tahoe Monaco themes that match the Prokcy color scheme
 */
let isTahoeThemesRegistered = false;

const THEME_COLORS = {
  dark: {
    background: '#1e1e1e',
    foreground: '#ffffff',
    accent: '#0a84ff',
    border: 'rgba(255,255,255,0.1)',
    hover: 'rgba(255,255,255,0.05)',
    subtle: '#86868b',
    keyword: '#ff6b6b',
    string: '#98c379',
    number: '#d19a66',
    comment: '#5c6370',
    operator: '#56b6c2',
    function: '#61afef',
    variable: '#e06c75',
    type: '#c5a6f4',
  },
  light: {
    background: '#ffffff',
    foreground: '#1d1d1f',
    accent: '#007aff',
    border: 'rgba(0,0,0,0.08)',
    hover: 'rgba(0,0,0,0.03)',
    subtle: '#86868b',
    keyword: '#af3a3a',
    string: '#50a14f',
    number: '#b16100',
    comment: '#a0a1a7',
    operator: '#56b6c2',
    function: '#4078f2',
    variable: '#d73a49',
    type: '#8a2be2',
  },
} as const;

/**
 * Register Tahoe themes with Monaco
 */
export function registerTahoeThemes(monaco: any): void {
  if (!monaco || isTahoeThemesRegistered) {
    return;
  }

  // Common syntax highlighting rules for both themes
  const createSyntaxRules = (colors: typeof THEME_COLORS.dark) => [
    { token: 'comment', foreground: colors.comment, fontStyle: 'italic' },
    { token: 'comment.doc', foreground: colors.comment, fontStyle: 'italic' },
    { token: 'keyword', foreground: colors.keyword },
    { token: 'keyword.operator', foreground: colors.operator },
    { token: 'string', foreground: colors.string },
    { token: 'string.value', foreground: colors.string },
    { token: 'number', foreground: colors.number },
    { token: 'number.hex', foreground: colors.number },
    { token: 'type', foreground: colors.type },
    { token: 'function', foreground: colors.function },
    { token: 'function.call', foreground: colors.function },
    { token: 'variable', foreground: colors.variable },
    { token: 'variable.predefined', foreground: colors.variable },
    { token: 'operator', foreground: colors.operator },
    { token: 'tag', foreground: colors.variable },
    { token: 'tag.name', foreground: colors.variable },
    { token: 'tag.attribute.name', foreground: colors.function },
    { token: 'tag.attribute.value', foreground: colors.string },
    { token: 'regexp', foreground: colors.string },
    { token: 'constant', foreground: colors.number },
    { token: 'identifier', foreground: colors.foreground },
  ];

  // Common editor colors
  const createEditorColors = (colors: typeof THEME_COLORS.dark) => ({
    'editor.background': colors.background,
    'editor.foreground': colors.foreground,
    'editorLineNumber.foreground': colors.subtle,
    'editorLineNumber.activeForeground': colors.accent,
    'editor.selectionBackground': colors.accent + '40',
    'editor.inactiveSelectionBackground': colors.accent + '20',
    'editorCursor.foreground': colors.accent,
    'editor.lineHighlightBackground': colors.hover,
    'editorIndentGuide.background': colors.border,
    'editorIndentGuide.activeBackground': colors.subtle + '40',
    'editorWhitespace.foreground': colors.border,
    'editorBracketMatch.background': colors.accent + '20',
    'editorBracketMatch.border': colors.accent,
    'editorGutter.background': colors.background,
    'editorWidget.background': colors.background,
    'editorWidget.border': colors.border,
    'editorWidget.foreground': colors.foreground,
  });

  // Register dark theme
  monaco.editor.defineTheme('tahoe-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: createSyntaxRules(THEME_COLORS.dark),
    colors: {
      ...createEditorColors(THEME_COLORS.dark),
      'activityBar.background': THEME_COLORS.dark.background,
      'activityBar.foreground': THEME_COLORS.dark.foreground,
      'sideBar.background': THEME_COLORS.dark.background,
      'sideBar.foreground': THEME_COLORS.dark.foreground,
      'sideBar.border': THEME_COLORS.dark.border,
      'statusBar.background': THEME_COLORS.dark.background,
      'statusBar.foreground': THEME_COLORS.dark.foreground,
      'statusBar.border': THEME_COLORS.dark.border,
      'titleBar.activeBackground': THEME_COLORS.dark.background,
      'titleBar.activeForeground': THEME_COLORS.dark.foreground,
      'menu.background': THEME_COLORS.dark.background,
      'menu.foreground': THEME_COLORS.dark.foreground,
      'menu.border': THEME_COLORS.dark.border,
      'menu.selectionBackground': THEME_COLORS.dark.hover,
      'menu.selectionForeground': THEME_COLORS.dark.foreground,
    },
  });

  // Register light theme
  monaco.editor.defineTheme('tahoe-light', {
    base: 'vs',
    inherit: true,
    rules: createSyntaxRules(THEME_COLORS.light),
    colors: createEditorColors(THEME_COLORS.light),
  });

  isTahoeThemesRegistered = true;
}

/**
 * Get the theme ID based on system preference
 */
export function getThemeId(isDark: boolean): string {
  return isDark ? 'tahoe-dark' : 'tahoe-light';
}
