import type { TabProps } from './types';
import { syntaxHighlight } from './utils';

export function BodyTab({ request }: TabProps): React.JSX.Element {
  const body = request?.requestBody;
  const isJson = body?.headers?.['content-type']?.includes('application/json');
  const content = body?.content ?? '';

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
    <div className="p-4 h-full overflow-y-auto scrollbar-hide">
      {body ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Request Body
            </span>
            {body?.headers?.['content-type'] && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                (
                {body?.headers['content-type']}
                )
              </span>
            )}
          </div>
          <pre
            className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4 overflow-x-auto text-zinc-900 dark:text-zinc-100"
            dangerouslySetInnerHTML={{
              __html: isJson ? syntaxHighlight(displayContent) : displayContent,
            }}
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No request body</p>
        </div>
      )}
    </div>
  );
}
