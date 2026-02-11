import { useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { registerWhistleLanguage } from '../../features/rules/whistle-language';

// Force local Monaco instance to avoid CDN/Node path resolution issues in desktop runtimes.
loader.config({ monaco: window.monaco });

/**
 * Suppress Monaco's internal 'productService' error that occurs in Electron.
 * This error doesn't affect functionality - it's a service resolution warning
 * from Monaco's dependency injection system running in a non-browser context.
 */
function suppressProductServiceError(): void {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('unknown service') || message.includes('productService'))
    ) {
      return; // Suppress this specific Monaco error
    }
    originalError.apply(console, args);
  };
}

// Run suppression once when module loads
suppressProductServiceError();

/**
 * Global error handlers to catch Monaco service errors before they propagate.
 * These catch errors thrown during Monaco's service resolution (e.g., during paste operations).
 */
if (typeof window !== 'undefined') {
  // Catch Monaco's internal service errors at window level
  window.addEventListener('error', (event: ErrorEvent) => {
    if (event.message?.includes('productService') ||
        event.message?.includes('unknown service')) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true); // Use capture phase to catch errors early

  // Also catch promise rejections from Monaco
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (event.reason?.message?.includes('productService') ||
        event.reason?.message?.includes('unknown service')) {
      event.preventDefault();
      return false;
    }
  });
}

// Editor options from Monaco
interface MonacoEditorOptions {
  minimap?: { enabled: boolean };
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
  value?: string;
  onChange?: (value: string) => void;
  language?: string;
  theme?: string;
  loading?: boolean;
  beforeMount?: (monaco: typeof window.monaco) => void;
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

  const handleBeforeMount = (monaco: typeof window.monaco) => {
    // Register Whistle language if using Monaco
    if (language === 'whistle') {
      registerWhistleLanguage(monaco);
    }
    // Call provided beforeMount callback
    beforeMount?.(monaco);
  };

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof window.monaco
  ) => {
    editorRef.current = editor;

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

    // Custom paste command using Electron's clipboard API
    // This bypasses Monaco's internal service resolution that fails in Electron
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      const electron = (window as { require?: (module: string) => { clipboard?: { readText: () => string } } }).require?.('electron');
      const clipboard = electron?.clipboard;

      if (clipboard && typeof clipboard.readText === 'function') {
        const text = clipboard.readText();
        if (text) {
          editor.trigger('keyboard', 'type', { text });
        }
      }
    });
  };

  const handleChange = (newValue: string | undefined) => {
    if (onChange && newValue !== value) {
      onChange(newValue ?? '');
    }
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language}
        theme={theme}
        value={value}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorDidMount}
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

/**
 * Hook to trigger save from parent component
 */
export function useMonacoSave(callback?: () => void): void {
  useEffect(() => {
    const handler = () => {
      callback?.();
    };
    window.addEventListener('monaco-save', handler);
    return () => window.removeEventListener('monaco-save', handler);
  }, [callback]);
}
