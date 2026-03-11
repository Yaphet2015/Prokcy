import { Suspense, useEffect, useState } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { useTheme } from '@/shared/context/ThemeContext';
import { getThemeId } from '@/features/rules/monaco-themes';
import MonacoEditor from '@/shared/ui/LazyMonacoEditor';
import type { TabProps } from './types';

const LARGE_BODY_PREVIEW_THRESHOLD = 128 * 1024;

export function BodyTab({ request }: TabProps): React.JSX.Element {
  const { isDark } = useTheme();
  const [showEditor, setShowEditor] = useState(false);
  const body = request?.requestBody;
  const isJson = body?.headers?.['content-type']?.includes('application/json');
  const content = body?.content ?? '';
  const shouldUsePreview = content.length > LARGE_BODY_PREVIEW_THRESHOLD && !showEditor;

  useEffect(() => {
    setShowEditor(false);
  }, [request?.id]);

  let displayContent = content;
  if (isJson && content) {
    try {
      const parsed = JSON.parse(content);
      displayContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Use raw content if not valid JSON
    }
  }

  return (
    <div className="px-2 pb-4 h-full min-h-0 flex flex-col relative">
      {body ? (
        <div className="h-full min-h-0 flex flex-col">
          <div className="shrink-0 sticky top-0 z-20 flex items-center p-1 px-2 rounded-md bg-white/90 dark:bg-zinc-950/90">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Request Body
              </span>
              {body?.headers?.['content-type'] && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  ({body?.headers['content-type']})
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {shouldUsePreview ? (
              <div className="h-full min-h-0 flex flex-col gap-2 p-3 overflow-hidden">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Large payload preview. Open full editor only when needed.
                </div>
                <div className="flex-1 min-h-0 overflow-auto rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-2">
                  <pre className="text-xs whitespace-pre-wrap break-all">{displayContent.slice(0, LARGE_BODY_PREVIEW_THRESHOLD)}</pre>
                </div>
                <div>
                  <Button size="sm" variant="ghost" onClick={() => setShowEditor(true)}>
                    Open Full Editor
                  </Button>
                </div>
              </div>
            ) : (
              <Suspense
                fallback={<div className="h-full flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">Loading editor...</div>}
              >
                <MonacoEditor
                  value={displayContent}
                  language={isJson ? 'json' : 'plaintext'}
                  theme={getThemeId(isDark)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'none',
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No request body</p>
        </div>
      )}
    </div>
  );
}
