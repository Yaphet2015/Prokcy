import { useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Force local Monaco instance to avoid CDN/Node path resolution issues in desktop runtimes.
loader.config({ monaco });

/**
 * Monaco Editor wrapper with Tahoe theme support
 *
 * @param {Object} props
 * @param {string} props.value - Editor content
 * @param {(value: string) => void} props.onChange - Change callback
 * @param {string} props.language - Language ID (default: 'whistle')
 * @param {string} props.theme - Theme ID (default: 'tahoe-dark')
 * @param {boolean} props.loading - Show loading state
 * @param {Function} props.beforeMount - Callback before editor mounts (monaco) => void
 * @param {string[]} props.options - Additional Monaco editor options
 */
export default function MonacoEditor({
  value = '',
  onChange,
  language = 'whistle',
  theme = 'tahoe-dark',
  loading = false,
  beforeMount,
  options = {},
}) {
  const editorRef = useRef(null);

  const handleBeforeMount = (monaco) => {
    // Call the provided beforeMount callback
    beforeMount?.(monaco);
  };

  const handleEditorDidMount = (editor, monaco) => {
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
  };

  const handleChange = (newValue) => {
    if (onChange && newValue !== value) {
      onChange(newValue);
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
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-tahoe-subtle">Loading editor...</span>
            </div>
          </div>
        }
      />
    </div>
  );
}

/**
 * Hook to trigger save from parent component
 */
export function useMonacoSave(callback) {
  useEffect(() => {
    const handler = () => {
      callback?.();
    };
    window.addEventListener('monaco-save', handler);
    return () => window.removeEventListener('monaco-save', handler);
  }, [callback]);
}
