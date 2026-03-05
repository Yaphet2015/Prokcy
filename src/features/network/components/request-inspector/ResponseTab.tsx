import { useEffect, useState } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { useTheme } from '@/shared/context/ThemeContext';
import { getThemeId } from '@/features/rules/monaco-themes';
import type { TabProps } from './types';
import { formatBytes } from './utils';
import MonacoEditor from '../../../../shared/ui/MonacoEditor';

const LARGE_RESPONSE_PREVIEW_THRESHOLD = 128 * 1024;

/**
 * Check if a string looks like base64 encoded content.
 * Used to detect fallback case where normalization couldn't decode.
 */
function looksLikeBase64(str: string): boolean {
  if (!str || str.length < 10) return false;
  // Base64 contains only alphanumeric chars, +, /, and = for padding
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  // Check if string is mostly base64 chars and has no spaces (text usually has spaces)
  return base64Regex.test(str.replace(/\s/g, '')) && !/\s/.test(str);
}

/**
 * Try to decode base64 content. Returns original string if not base64 or decode fails.
 */
function tryDecodeBase64(str: string): string {
  if (!looksLikeBase64(str)) return str;
  try {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return str;
  }
}

export function ResponseTab({ request }: TabProps): React.JSX.Element {
  const { isDark } = useTheme();
  const [showEditor, setShowEditor] = useState(false);
  const { response } = request ?? {};
  const contentType = response?.headers?.['content-type'] ?? '';
  const isJson = contentType.includes('application/json');
  const isImage = contentType.startsWith('image/');
  const isJavaScript = contentType.includes('javascript');
  const rawContent = response?.body ?? '';

  // For images, the body is raw base64; for other content types, it's usually decoded text
  // but may be raw base64 if normalization decoding failed
  let displayContent = isImage ? rawContent : tryDecodeBase64(rawContent);
  const shouldUsePreview = !isImage
    && displayContent.length > LARGE_RESPONSE_PREVIEW_THRESHOLD
    && !showEditor;

  useEffect(() => {
    setShowEditor(false);
  }, [request?.id]);

  // Format JSON for display
  if (isJson && displayContent) {
    try {
      const parsed = JSON.parse(displayContent);
      displayContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Use raw content if not valid JSON
    }
  }

  return (
    <div className="px-2 pb-4 h-full min-h-0 flex flex-col relative">
      {response ? (
        <div className="h-full min-h-0 flex flex-col">
          <div className="shrink-0 sticky top-0 z-20 flex items-center p-1 px-2 rounded-md bg-white/90 dark:bg-zinc-950/90">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Response
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatBytes(response?.size ?? 0)}
              </span>
            </div>
          </div>

          {isImage ? (
            <div className="flex-1 min-h-0 overflow-auto scrollbar-hide flex justify-center p-4">
              <img
                src={`data:${contentType};base64,${rawContent}`}
                alt="Response preview"
                className="max-w-full max-h-96 rounded-lg"
              />
            </div>
          ) : displayContent ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              {shouldUsePreview ? (
                <div className="h-full min-h-0 flex flex-col gap-2 p-3 overflow-hidden">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Large payload preview. Open full editor only when needed.
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-2">
                    <pre className="text-xs whitespace-pre-wrap break-all">{displayContent.slice(0, LARGE_RESPONSE_PREVIEW_THRESHOLD)}</pre>
                  </div>
                  <div>
                    <Button size="sm" variant="ghost" onClick={() => setShowEditor(true)}>
                      Open Full Editor
                    </Button>
                  </div>
                </div>
              ) : (
                <MonacoEditor
                  value={displayContent}
                  language={isJson ? 'json' : isJavaScript ? 'javascript' : 'plaintext'}
                  theme={getThemeId(isDark)}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    renderLineHighlight: 'none',
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No response data</p>
        </div>
      )}
    </div>
  );
}
