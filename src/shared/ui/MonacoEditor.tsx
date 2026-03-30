import { useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monacoNs from 'monaco-editor';
import { registerWhistleLanguage } from '../../features/rules/whistle-language';
import { getCustomPasteText, shouldUseCustomMonacoPaste } from './monaco-paste';
import { createMonacoOverrideServices } from './monaco-services';

// Use local Monaco instance to avoid CDN fetch issues in Electron desktop runtime.
// The loader.config({ monaco }) tells @monaco-editor/react to use the bundled
// monaco-editor package instead of fetching from CDN (which fails in Electron).
loader.config({ monaco: monacoNs });

interface MonacoGlobalWindow extends Window {
  __prokcyMonacoConsolePatched?: boolean;
  __prokcyMonacoGlobalHandlersInstalled?: boolean;
}

/**
 * Suppress Monaco's internal 'productService' error that occurs in Electron.
 * This error doesn't affect functionality - it's a service resolution warning
 * from Monaco's dependency injection system running in a non-browser context.
 */
function suppressProductServiceError(): void {
  const monacoWindow = window as MonacoGlobalWindow;
  if (monacoWindow.__prokcyMonacoConsolePatched) {
    return;
  }
  monacoWindow.__prokcyMonacoConsolePatched = true;

  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string'
      && (message.includes('unknown service') || message.includes('productService'))
    ) {
      return; // Suppress this specific Monaco error
    }
    originalError.apply(console, args);
  };
}

// Run suppression once when module loads
if (typeof window !== 'undefined') {
  suppressProductServiceError();
}

/**
 * Global error handlers to catch Monaco service errors before they propagate.
 * These catch errors thrown during Monaco's service resolution (e.g., during paste operations).
 */
if (typeof window !== 'undefined') {
  const monacoWindow = window as MonacoGlobalWindow;
  if (!monacoWindow.__prokcyMonacoGlobalHandlersInstalled) {
    monacoWindow.__prokcyMonacoGlobalHandlersInstalled = true;

    // Catch Monaco's internal service errors at window level
    window.addEventListener('error', (event: ErrorEvent) => {
      if (event.message?.includes('productService')
          || event.message?.includes('unknown service')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true); // Use capture phase to catch errors early

    // Also catch promise rejections from Monaco
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('productService')
          || event.reason?.message?.includes('unknown service')) {
        event.preventDefault();
        return false;
      }
    });
  }
}

// Editor options from Monaco
interface MonacoEditorOptions {
  minimap?: { enabled: boolean };
  readOnly?: boolean;
  scrollBeyondLastLine?: boolean;
  padding?: { top: number; bottom: number };
  renderLineHighlight?: 'none' | 'gap' | 'all' | 'line' | 'full';
  cursorBlinking?: 'smooth' | 'phase' | 'expand' | 'visible';
  cursorSmoothCaretAnimation?: 'on' | 'off' | 'explicit';
  smoothScrolling?: boolean;
  suggestOnTriggerCharacters?: boolean;
  quickSuggestions?: {
    other?: boolean;
    comments?: boolean;
    strings?: boolean;
  };
  tabSize?: number;
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  automaticLayout?: boolean;
  multiCursorPaste?: 'spread' | 'single';
  bracketPairColorization?: { enabled: boolean };
  guides?: {
    bracketPairs?: boolean;
    indentation?: boolean;
  };
  contextmenu?: boolean;
  [key: string]: unknown;
}

// Props
interface MonacoEditorProps {
  value?: unknown;
  onChange?: (value: string) => void;
  language?: string;
  theme?: string;
  loading?: boolean;
  beforeMount?: (monaco: typeof monacoNs) => void;
  options?: MonacoEditorOptions;
}

/**
 * Monaco Editor wrapper with Tahoe theme support
 */
export default function MonacoEditor({
  value = '',
  onChange,
  language = 'whistle',
  theme = 'tahoe-dark',
  loading = false,
  beforeMount,
  options = {},
}: MonacoEditorProps): React.JSX.Element {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const pasteCleanupRef = useRef<(() => void) | null>(null);
  const safeValue = typeof value === 'string'
    ? value
    : value == null
      ? ''
      : String(value);
  const isReadOnly = options.readOnly === true;

  useEffect(() => () => {
    pasteCleanupRef.current?.();
    pasteCleanupRef.current = null;
  }, []);

  const handleBeforeMount = (monaco: typeof monacoNs) => {
    // Register Whistle language if using Monaco
    if (language === 'whistle') {
      registerWhistleLanguage(monaco);
    }
    // Call provided beforeMount callback
    beforeMount?.(monaco);
  };

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof monacoNs,
  ) => {
    editorRef.current = editor;
    pasteCleanupRef.current?.();
    pasteCleanupRef.current = null;

    // Set editor font to SF Mono for authentic macOS feel
    editor.updateOptions({
      fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 21,
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger save via custom event
      const event = new CustomEvent('monaco-save');
      window.dispatchEvent(event);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      // Toggle comment
      const action = editor.getAction('editor.action.commentLine');
      if (action) action.run();
    });

    const domNode = editor.getDomNode();
    if (!domNode || isReadOnly) {
      return;
    }

    const readFallbackText = () => {
      const electron = (
        window as Window & {
          require?: (module: string) => {
            clipboard?: { readText: () => string };
          };
        }
      ).require?.('electron');

      return electron?.clipboard?.readText?.() ?? '';
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!shouldUseCustomMonacoPaste({
        hasTextFocus: editor.hasTextFocus(),
        isReadOnly,
        eventTarget: event.target,
      })) {
        return;
      }

      const text = getCustomPasteText({
        clipboardData: event.clipboardData,
        readFallbackText,
      });

      if (!text) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      editor.trigger('keyboard', 'type', { text });
    };

    domNode.addEventListener('paste', handlePaste, true);

    const cleanupPasteHandler = () => {
      domNode.removeEventListener('paste', handlePaste, true);
    };

    pasteCleanupRef.current = cleanupPasteHandler;
    editor.onDidDispose(() => {
      cleanupPasteHandler();
      if (pasteCleanupRef.current === cleanupPasteHandler) {
        pasteCleanupRef.current = null;
      }
    });
  };

  const handleChange = (newValue: string | undefined) => {
    if (onChange && newValue !== safeValue) {
      onChange(newValue ?? '');
    }
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        theme={theme}
        value={safeValue}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorDidMount}
        overrideServices={createMonacoOverrideServices()}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'none',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          tabSize: 2,
          wordWrap: 'off',
          automaticLayout: true,
          // Allow pasting multiple lines
          multiCursorPaste: 'spread',
          // Bracket pair colorization
          bracketPairColorization: { enabled: true },
          // Guides
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          // Context menu
          contextmenu: true,
          ...options,
        }}
        loading={
          loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-tahoe-subtle">Loading editor...</span>
              </div>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
