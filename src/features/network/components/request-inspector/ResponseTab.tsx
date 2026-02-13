import type { TabProps } from './types';
import { formatBytes, syntaxHighlight } from './utils';

export function ResponseTab({ request }: TabProps): React.JSX.Element {
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
    <div className="p-4 h-full overflow-y-auto scrollbar-hide">
      {response ? (
        <div>
          <div className="flex items-center justify-between mb-3">
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
            <div className="flex justify-center p-4">
              <img
                src={`data:${contentType};base64,${content}`}
                alt="Response preview"
                className="max-w-full max-h-96 rounded-lg"
              />
            </div>
          ) : (
            <pre
              className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4 overflow-x-auto text-zinc-900 dark:text-zinc-100"
              dangerouslySetInnerHTML={{
                __html: isJson ? syntaxHighlight(displayContent) : displayContent,
              }}
            />
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No response data</p>
        </div>
      )}
    </div>
  );
}
