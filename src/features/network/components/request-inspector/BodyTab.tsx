import { useTheme } from '@/shared/context/ThemeContext';
import { getThemeId } from '@/features/rules/monaco-themes';
import type { TabProps } from './types';
import MonacoEditor from '../../../../shared/ui/MonacoEditor';

export function BodyTab({ request }: TabProps): React.JSX.Element {
  const { isDark } = useTheme();
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
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No request body</p>
        </div>
      )}
    </div>
  );
}
