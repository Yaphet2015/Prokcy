import { useTheme } from '@/shared/context/ThemeContext';
import { getThemeId } from '@/features/rules/monaco-themes';
import type { TabProps } from './types';
import { formatBytes } from './utils';
import MonacoEditor from '../../../../shared/ui/MonacoEditor';

export function ResponseTab({ request }: TabProps): React.JSX.Element {
  const { isDark } = useTheme();
  const { response } = request ?? {};
  const contentType = response?.headers?.['content-type'] ?? '';
  const isJson = contentType.includes('application/json');
  const content = response?.body ?? '';

  // Decode base64 content for text display (response body is base64 encoded)
  const decodeContent = (raw: string): string => {
    if (!raw) return '';
    try {
      return atob(raw);
    } catch {
      // If decoding fails, treat as plain text
      return raw;
    }
  };

  let displayContent = decodeContent(content);
  if (isJson && displayContent) {
    try {
      const parsed = JSON.parse(displayContent);
      displayContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Use raw content if not valid JSON
    }
  }

  const isImage = contentType.startsWith('image/');

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
                src={`data:${contentType};base64,${content}`}
                alt="Response preview"
                className="max-w-full max-h-96 rounded-lg"
              />
            </div>
          ) : displayContent ? (
            <div className="flex-1 min-h-0 overflow-hidden">
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
